import { FocusSessionRepository } from '../../services/database/repositories/focusSessionRepository';
import { OutboxSessionEntry, DeadLetterSessionEntry } from '../../types/pomodoro';
import { storageService } from './storageService';
import { db } from '../../services/database/db';

export class OutboxService {
  constructor(
    private sessionRepo: FocusSessionRepository = new FocusSessionRepository(db),
    private storage = storageService
  ) {}

  /**
   * Persists an outbox entry to Dexie idempotently.
   * Checks for immutable field consistency.
   */
  async persistEntryToDexie(entry: OutboxSessionEntry): Promise<'persisted' | 'already_exists' | 'conflict'> {
    const existing = await this.sessionRepo.getById(entry.sessionId);

    if (existing) {
      // Check immutable fields: startedAt, durationMinutes, type
      const isConsistent =
        existing.startedAt === entry.startedAt &&
        existing.durationMinutes === entry.durationMinutes &&
        existing.completed === true;

      if (isConsistent) {
        return 'already_exists';
      } else {
        return 'conflict';
      }
    }

    // Map pomodoro type to FocusSessionEntity type
    const repoType =
      entry.type === 'focus'
        ? 'pomodoro'
        : entry.type === 'shortBreak'
        ? 'short_break'
        : 'long_break';

    await this.sessionRepo.create({
      id: entry.sessionId,
      workspaceId: entry.workspaceId,
      type: repoType,
      category: entry.category,
      durationMinutes: entry.durationMinutes,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
      completed: true,
    });

    return 'persisted';
  }

  /**
   * Drains the pendingOutbox from the storage envelope into Dexie.
   * Removes successfully persisted entries.
   */
  async drainPendingOutbox(): Promise<{ drainedCount: number; failedCount: number }> {
    const envelope = await this.storage.loadEnvelope();
    if (envelope.pendingOutbox.length === 0) {
      return { drainedCount: 0, failedCount: 0 };
    }

    const remainingOutbox: OutboxSessionEntry[] = [];
    const deadLetterToAppend: DeadLetterSessionEntry[] = [];
    let drainedCount = 0;
    let failedCount = 0;

    for (const entry of envelope.pendingOutbox) {
      try {
        const result = await this.persistEntryToDexie(entry);
        if (result === 'persisted' || result === 'already_exists') {
          drainedCount++;
        } else if (result === 'conflict') {
          // Permanent conflict -> move to dead letter with conflict status
          deadLetterToAppend.push({
            ...entry,
            transferredAt: Date.now(),
            originalFailureReason: 'DataConflictError: Immutable fields mismatch with existing Dexie record',
            status: 'conflict',
          });
        }
      } catch (err: any) {
        failedCount++;
        const nextRetryCount = entry.retryCount + 1;
        if (nextRetryCount >= 5) {
          // Move to dead letter after 5 retries
          deadLetterToAppend.push({
            ...entry,
            retryCount: nextRetryCount,
            lastAttemptAt: Date.now(),
            lastError: (err?.message || String(err)).slice(0, 200),
            transferredAt: Date.now(),
            originalFailureReason: 'ExceededMaxRetries',
            status: 'pending',
          });
        } else {
          // Exponential backoff
          const delayMinutes = Math.min(60, Math.pow(2, nextRetryCount));
          remainingOutbox.push({
            ...entry,
            retryCount: nextRetryCount,
            lastAttemptAt: Date.now(),
            nextRetryAt: Date.now() + delayMinutes * 60 * 1000,
            lastError: (err?.message || String(err)).slice(0, 200),
          });
        }
      }
    }

    // If outbox length > 50, transfer excess oldest items to dead letter
    if (remainingOutbox.length > 50) {
      const excess = remainingOutbox.splice(0, remainingOutbox.length - 50);
      for (const item of excess) {
        deadLetterToAppend.push({
          ...item,
          transferredAt: Date.now(),
          originalFailureReason: 'OutboxCapacityOverflow',
          status: 'pending',
        });
      }
    }

    if (deadLetterToAppend.length > 0) {
      await this.storage.appendDeadLetter(deadLetterToAppend);
    }

    // Save updated envelope
    await this.storage.saveEnvelope({
      ...envelope,
      pendingOutbox: remainingOutbox,
    });

    return { drainedCount, failedCount };
  }

  /**
   * Drains the dead-letter queue for non-conflict entries.
   */
  async drainDeadLetter(): Promise<{ drainedCount: number }> {
    const deadLetters = await this.storage.loadDeadLetter();
    if (deadLetters.length === 0) return { drainedCount: 0 };

    const remaining: DeadLetterSessionEntry[] = [];
    let drainedCount = 0;

    for (const item of deadLetters) {
      if (item.status === 'conflict') {
        remaining.push(item);
        continue;
      }

      try {
        const result = await this.persistEntryToDexie(item);
        if (result === 'persisted' || result === 'already_exists') {
          drainedCount++;
        } else {
          remaining.push({ ...item, status: 'conflict' });
        }
      } catch {
        remaining.push(item);
      }
    }

    await this.storage.saveDeadLetter(remaining);
    return { drainedCount };
  }
}

export const outboxService = new OutboxService();
