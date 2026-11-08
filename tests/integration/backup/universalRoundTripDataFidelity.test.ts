import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { BackupExportService } from '../../../src/features/backup/services/backupExportService';
import { BackupValidationService } from '../../../src/features/backup/services/backupValidationService';
import { RestoreEngineService } from '../../../src/features/backup/services/restoreEngineService';

describe('Universal Round-Trip Data Fidelity Integration Suite — Milestone 9.6', () => {
  let dbA: NookSpaceDB;
  let dbB: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;

  let exportSvcA: BackupExportService;
  let validateSvc: BackupValidationService;
  let restoreSvcB: RestoreEngineService;

  let dbCounter = 0;
  const getNextName = (prefix: string) => `test-roundtrip-${prefix}-${Date.now()}-${++dbCounter}`;

  beforeEach(async () => {
    const dbAName = getNextName('dbA');
    const dbBName = getNextName('dbB');
    const recDbName = getNextName('recovery');

    dbA = new NookSpaceDB(dbAName);
    dbB = new NookSpaceDB(dbBName);
    recoveryDb = new NookSpaceRecoveryDB(recDbName);

    await dbA.open();
    await dbB.open();
    await recoveryDb.open();

    exportSvcA = new BackupExportService(dbA);
    validateSvc = new BackupValidationService();
    restoreSvcB = new RestoreEngineService(dbB, recoveryDb);
  });

  afterEach(async () => {
    await dbA.delete();
    await dbB.delete();
    await recoveryDb.delete();
  });

  it('executes complete Round-Trip: Seed All 17 Tables -> Export -> Validate -> Restore -> Verify 100% Fidelity', async () => {
    const now = 1700000000000;

    // 1. Seed Workspaces (3 workspaces)
    const workspaces = [
      {
        id: 'ws-personal',
        name: 'Personal Space ✨',
        icon: 'Sparkles',
        color: '#6366f1',
        isDefault: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-study',
        name: 'Nghiên cứu & Học tập 📚',
        icon: 'GraduationCap',
        color: '#10b981',
        isDefault: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-dev',
        name: '開発スタジオ 💻',
        icon: 'Code',
        color: '#8b5cf6',
        isDefault: false,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await dbA.workspaces.bulkPut(workspaces);

    // 2. Seed Settings
    const settings = {
      id: 'current_settings',
      theme: 'dark' as const,
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md' as const,
      backgroundType: 'color' as const,
      backgroundValue: '#09090b',
      widgetOpacity: 95,
      widgetBlur: 8,
      activeWorkspaceId: 'ws-personal',
      updatedAt: now,
    };
    await dbA.settings.put(settings);

    // 3. Seed Widget Instances
    const widgetInstances = [
      {
        id: 'wi-clock',
        workspaceId: 'ws-personal',
        widgetType: 'clock',
        title: 'Digital Clock',
        config: { format24h: true },
        isEnabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wi-notes',
        workspaceId: 'ws-personal',
        widgetType: 'notes',
        title: 'Quick Notes',
        config: {},
        isEnabled: true,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wi-pomo',
        workspaceId: 'ws-study',
        widgetType: 'pomodoro',
        title: 'Focus Timer',
        config: { workDuration: 25 },
        isEnabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await dbA.widgetInstances.bulkPut(widgetInstances);

    // 4. Seed Widget Layouts
    const widgetLayouts = [
      {
        id: 'ws-personal_wi-clock_lg',
        workspaceId: 'ws-personal',
        widgetInstanceId: 'wi-clock',
        breakpoint: 'lg' as const,
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-personal_wi-notes_lg',
        workspaceId: 'ws-personal',
        widgetInstanceId: 'wi-notes',
        breakpoint: 'lg' as const,
        x: 4,
        y: 0,
        w: 8,
        h: 4,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await dbA.widgetLayouts.bulkPut(widgetLayouts);

    // 5. Seed Note Collections & Tags
    await dbA.noteCollections.put({
      id: 'col-arch',
      workspaceId: 'ws-personal',
      title: 'Kiến Trúc Phần Mềm',
      color: '#3b82f6',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    await dbA.noteTags.bulkPut([
      { id: 'tag-rust', workspaceId: 'ws-personal', name: 'rust', color: '#f97316', createdAt: now, updatedAt: now },
      { id: 'tag-viet', workspaceId: 'ws-personal', name: 'tiếng-việt', color: '#10b981', createdAt: now, updatedAt: now },
    ]);

    // 6. Seed Notes with Multilingual, Markdown & Code Snippets
    const complexMarkdownContent = `# Kiến Trúc NookSpace 2026 🚀

Hệ thống lưu trữ local-first:
- Zero cloud trackers
- Multi-workspace isolation

\`\`\`typescript
interface UserData {
  readonly id: string;
  readonly name: string;
}
const greet = (u: UserData): string => \`Xin chào, \${u.name}!\`;
\`\`\`

| Tiêu chí | Điểm số |
|---|---|
| Hiệu năng | 100/100 |
| Bảo mật | Tuyệt đối |

日本語テキスト: 日本語のノート作成テスト。文字化けなし。`;

    await dbA.notes.put({
      id: 'note-rich-1',
      workspaceId: 'ws-personal',
      collectionId: 'col-arch',
      title: 'Kiến Trúc NookSpace & Multilingual Note ✨',
      content: complexMarkdownContent,
      excerpt: 'Kiến Trúc NookSpace 2026 Hệ thống lưu trữ local-first',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      tags: ['rust', 'tiếng-việt'],
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Seed Bookmark Groups & Bookmarks
    await dbA.bookmarkGroups.put({
      id: 'grp-dev',
      workspaceId: 'ws-personal',
      title: 'Tài Liệu Lập Trình 🛠️',
      color: '#8b5cf6',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    await dbA.bookmarks.put({
      id: 'bm-react',
      workspaceId: 'ws-personal',
      groupId: 'grp-dev',
      title: 'React Documentation ⚛️',
      url: 'https://react.dev',
      isFavorite: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 8. Seed Note-Bookmark Junction Links
    await dbA.noteBookmarkLinks.put({
      id: 'link-1',
      workspaceId: 'ws-personal',
      noteId: 'note-rich-1',
      bookmarkId: 'bm-react',
      createdAt: now,
    });

    // 9. Seed Todos
    await dbA.todos.bulkPut([
      {
        id: 'todo-1',
        workspaceId: 'ws-personal',
        title: 'Hoàn thành Milestone 9.6 🔥',
        completed: true,
        priority: 'high',
        category: 'work',
        dueDate: now + 86400000,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'todo-2',
        workspaceId: 'ws-study',
        title: 'Review IndexedDB Spec 📖',
        completed: false,
        priority: 'medium',
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // 10. Seed Remaining Productivity Tables
    await dbA.focusSessions.put({
      id: 'fs-1',
      workspaceId: 'ws-study',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 1500000,
      completedAt: now,
      completed: true,
    });

    await dbA.dailyGoals.put({
      id: 'dg-1',
      workspaceId: 'ws-study',
      title: 'Daily Deep Work Target',
      dateString: '2026-11-08',
      targetValue: 120,
      currentValue: 75,
      createdAt: now,
      updatedAt: now,
    });

    await dbA.stickyNotes.put({
      id: 'sn-1',
      workspaceId: 'ws-personal',
      content: 'Ghi chú nhanh màu vàng 🌟',
      color: '#fef08a',
      x: 10,
      y: 20,
      width: 200,
      height: 150,
      zIndex: 1,
      createdAt: now,
      updatedAt: now,
    });

    await dbA.vocabulary.put({
      id: 'voc-1',
      workspaceId: 'ws-study',
      word: 'Idempotency',
      meaning: 'Thao tác có thể thực thi nhiều lần mà không thay đổi kết quả sau lần đầu.',
      exampleSentence: 'HTTP PUT or Dexie migration verify gate.',
      category: 'computer_science',
      status: 'learning',
      createdAt: now,
      updatedAt: now,
    });

    await dbA.resources.put({
      id: 'res-1',
      workspaceId: 'ws-dev',
      title: 'WXT Extension Framework',
      url: 'https://wxt.dev',
      category: 'framework',
      tags: ['wxt', 'vite'],
      isPinned: true,
      createdAt: now,
      updatedAt: now,
    });

    await dbA.calendarEvents.put({
      id: 'ev-1',
      workspaceId: 'ws-personal',
      title: 'Release Review Meeting 🎯',
      startDate: now + 3600000,
      endDate: now + 7200000,
      isAllDay: false,
      createdAt: now,
      updatedAt: now,
    });

    // STEP 1: EXPORT A
    const exportResult = await exportSvcA.createFullBackup();
    expect(exportResult.backup).toBeDefined();
    expect(exportResult.backup.data.workspaces).toHaveLength(3);
    expect(exportResult.backup.data.notes).toHaveLength(1);
    expect(exportResult.backup.data.todos).toHaveLength(2);

    // STEP 2: VALIDATE BACKUP
    const validationReport = await validateSvc.validateBackup(exportResult.backup);
    expect(validationReport.isValid).toBe(true);
    expect(validationReport.status).toBe('valid');
    expect(validationReport.errors).toHaveLength(0);
    expect(validationReport.checksumVerified).toBe(true);

    // STEP 3: RESTORE INTO DB B
    const restoreResult = await restoreSvcB.restoreBackup(exportResult.backup);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.finalState).toBe('completed');
    const totalRestored = Object.values(restoreResult.restoredCounts).reduce((a, b) => a + b, 0);
    expect(totalRestored).toBeGreaterThanOrEqual(15);

    // STEP 4: VERIFY 100% DATA FIDELITY IN DB B
    // Workspaces
    const bWorkspaces = await dbB.workspaces.toArray();
    expect(bWorkspaces).toHaveLength(3);
    expect(bWorkspaces.find((w) => w.id === 'ws-personal')?.name).toBe('Personal Space ✨');
    expect(bWorkspaces.find((w) => w.id === 'ws-study')?.name).toBe('Nghiên cứu & Học tập 📚');
    expect(bWorkspaces.find((w) => w.id === 'ws-dev')?.name).toBe('開発スタジオ 💻');

    // Settings
    const bSettings = await dbB.settings.get('current_settings');
    expect(bSettings).toBeDefined();
    expect(bSettings?.theme).toBe('dark');
    expect(bSettings?.activeWorkspaceId).toBe('ws-personal');

    // Notes
    const bNote = await dbB.notes.get('note-rich-1');
    expect(bNote).toBeDefined();
    expect(bNote?.title).toBe('Kiến Trúc NookSpace & Multilingual Note ✨');
    expect(bNote?.content).toBe(complexMarkdownContent); // Exact byte-for-byte markdown preservation!
    expect(bNote?.tags).toEqual(['rust', 'tiếng-việt']);
    expect(bNote?.collectionId).toBe('col-arch');

    // Note Collections
    const bCol = await dbB.noteCollections.get('col-arch');
    expect(bCol?.title).toBe('Kiến Trúc Phần Mềm');

    // Bookmarks
    const bBm = await dbB.bookmarks.get('bm-react');
    expect(bBm?.title).toBe('React Documentation ⚛️');
    expect(bBm?.url).toBe('https://react.dev');
    expect(bBm?.groupId).toBe('grp-dev');

    // Junction Links
    const bLink = await dbB.noteBookmarkLinks.get('link-1');
    expect(bLink?.noteId).toBe('note-rich-1');
    expect(bLink?.bookmarkId).toBe('bm-react');

    // Todos
    const bTodos = await dbB.todos.toArray();
    expect(bTodos).toHaveLength(2);
    expect(bTodos.find((t) => t.id === 'todo-1')?.title).toBe('Hoàn thành Milestone 9.6 🔥');
    expect(bTodos.find((t) => t.id === 'todo-1')?.completed).toBe(true);

    // Vocabulary
    const bVoc = await dbB.vocabulary.get('voc-1');
    expect(bVoc?.word).toBe('Idempotency');
    expect(bVoc?.meaning).toContain('Thao tác có thể thực thi nhiều lần');

    // Sticky Notes
    const bSn = await dbB.stickyNotes.get('sn-1');
    expect(bSn?.content).toBe('Ghi chú nhanh màu vàng 🌟');

    // Calendar Events
    const bEv = await dbB.calendarEvents.get('ev-1');
    expect(bEv?.title).toBe('Release Review Meeting 🎯');
  });
});
