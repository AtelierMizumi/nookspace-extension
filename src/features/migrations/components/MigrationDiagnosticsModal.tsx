import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { legacyDataScanner } from '../services/legacyDataScanner';
import { legacyDataRepairService } from '../services/legacyDataRepairService';
import { migrationEngine } from '../services/migrationEngine';
import {
  LegacyIssue,
  LegacyScanResult,
  MigrationJournalRecord,
} from '../types/migrationTypes';
import { cn } from '../../../utils/cn';

export interface MigrationDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MigrationDiagnosticsModal: React.FC<MigrationDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'journal'>('issues');
  const [isScanning, setIsScanning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [scanResult, setScanResult] = useState<LegacyScanResult | null>(null);
  const [journalRecords, setJournalRecords] = useState<MigrationJournalRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadJournal = useCallback(async () => {
    try {
      const records = await migrationEngine.getJournalService().getJournalRecords();
      setJournalRecords(records);
    } catch (err) {
      console.warn('[MigrationDiagnostics] Failed to load journal:', err);
    }
  }, []);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const result = await legacyDataScanner.scan();
      setScanResult(result);
      await loadJournal();
    } catch (err) {
      setStatusMessage(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScanning(false);
    }
  }, [loadJournal]);

  const handleRunMigrations = async () => {
    setIsMigrating(true);
    setStatusMessage(null);
    try {
      const result = await migrationEngine.runMigrations();
      if (result.status === 'completed') {
        setStatusMessage(
          `Successfully executed ${result.executedCount} migrations (${result.totalRecordsModified} records updated).`
        );
      } else if (result.status === 'no_op') {
        setStatusMessage('All registered migrations are already up to date.');
      } else {
        setStatusMessage(`Migration error: ${result.error || result.status}`);
      }
      await handleScan();
    } catch (err) {
      setStatusMessage(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRepairAll = async () => {
    if (!scanResult || scanResult.issues.length === 0) return;
    setIsRepairing(true);
    setStatusMessage(null);
    try {
      const result = await legacyDataRepairService.repairIssues(scanResult.issues);
      setStatusMessage(
        `Repair completed: ${result.repairedCount} issues resolved, ${result.skippedCount} skipped, ${result.failedCount} failed.`
      );
      await handleScan();
    } catch (err) {
      setStatusMessage(`Repair failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRepairSingle = async (issue: LegacyIssue) => {
    setIsRepairing(true);
    try {
      const result = await legacyDataRepairService.repairIssues([issue]);
      if (result.repairedCount > 0) {
        setStatusMessage(`Repaired issue: ${issue.description}`);
      } else if (result.failedCount > 0) {
        setStatusMessage(`Failed to repair issue: ${result.details[0]?.message}`);
      }
      await handleScan();
    } catch (err) {
      setStatusMessage(`Repair failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRepairing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleScan();
    }
  }, [isOpen, handleScan]);

  const recoverableIssuesCount =
    scanResult?.issues.filter((i) => i.repairable).length ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Database & Migration Diagnostics"
      description="Inspect local IndexedDB data health, run migrations, and repair legacy data safely."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>Dexie Schema v4</span>
            <span className="text-border">•</span>
            <span>{migrationEngine.getRegistry().count} Registered Migrations</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Action Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card/60 border border-border/40 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isScanning && 'animate-spin')} />}
              onClick={handleScan}
              disabled={isScanning || isMigrating || isRepairing}
              aria-label="Scan Database"
            >
              Scan Database
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={handleRunMigrations}
              disabled={isScanning || isMigrating || isRepairing}
              aria-label="Run Pending Migrations"
            >
              {isMigrating ? 'Migrating...' : 'Run Migrations'}
            </Button>
            {recoverableIssuesCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wrench className="h-3.5 w-3.5" />}
                onClick={handleRepairAll}
                disabled={isScanning || isMigrating || isRepairing}
                aria-label="Repair All Issues"
              >
                {isRepairing ? 'Repairing...' : `Repair All (${recoverableIssuesCount})`}
              </Button>
            )}
          </div>

          <div className="flex items-center rounded-md bg-muted/60 p-0.5 text-xs">
            <button
              type="button"
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-all',
                activeTab === 'issues'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('issues')}
              aria-label="Issues Tab"
            >
              Issues ({scanResult?.issues.length ?? 0})
            </button>
            <button
              type="button"
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-all',
                activeTab === 'journal'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('journal')}
              aria-label="Journal Tab"
            >
              History ({journalRecords.length})
            </button>
          </div>
        </div>

        {/* Status Feedback Message */}
        {statusMessage && (
          <div className="p-2.5 text-xs rounded-md bg-primary/10 border border-primary/20 text-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1">{statusMessage}</span>
          </div>
        )}

        {/* Scan Summary Cards */}
        {scanResult && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Total Scanned
              </span>
              <span className="text-base font-bold text-foreground">
                {scanResult.summary.totalRecordsScanned}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <span className="text-emerald-500 block text-[10px] uppercase font-semibold">
                Compatible
              </span>
              <span className="text-base font-bold text-foreground">
                {scanResult.summary.compatibleCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <span className="text-blue-500 block text-[10px] uppercase font-semibold">
                Migratable
              </span>
              <span className="text-base font-bold text-foreground">
                {scanResult.summary.migratableCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <span className="text-amber-500 block text-[10px] uppercase font-semibold">
                Recoverable
              </span>
              <span className="text-base font-bold text-foreground">
                {scanResult.summary.recoverableCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <span className="text-destructive block text-[10px] uppercase font-semibold">
                Corrupted
              </span>
              <span className="text-base font-bold text-foreground">
                {scanResult.summary.corruptedCount}
              </span>
            </div>
          </div>
        )}

        {/* Tab Content: Issues List */}
        {activeTab === 'issues' && (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {!scanResult || scanResult.issues.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                title="Database Healthy"
                description="Zero legacy or integrity issues found. All records match schema v4 standards."
                className="py-10"
              />
            ) : (
              scanResult.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/70 transition-all flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          issue.severity === 'critical'
                            ? 'destructive'
                            : issue.severity === 'warning'
                            ? 'warning'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {issue.classification}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {issue.table} [{issue.entityId}]
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{issue.description}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-primary inline" />
                      {issue.suggestedAction}
                    </p>
                  </div>

                  {issue.repairable && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Wrench className="h-3 w-3" />}
                      onClick={() => handleRepairSingle(issue)}
                      disabled={isRepairing}
                    >
                      Repair
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Migration Journal / History */}
        {activeTab === 'journal' && (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {journalRecords.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                title="No Migration History"
                description="No migrations have been recorded in the persistent journal yet."
                className="py-10"
              />
            ) : (
              journalRecords.map((record) => (
                <div
                  key={record.migrationId}
                  className="p-3 rounded-lg border border-border/40 bg-card/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          record.status === 'completed'
                            ? 'success'
                            : record.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {record.status}
                      </Badge>
                      <span className="font-semibold text-foreground">{record.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({record.type})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                      <span>Processed: {record.recordsProcessed}</span>
                      <span>Modified: {record.recordsModified}</span>
                      <span>Duration: {record.durationMs}ms</span>
                      <span>
                        {new Date(record.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {record.error && (
                      <p className="text-[11px] text-destructive">{record.error}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
