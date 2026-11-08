import {
  NookSpaceUniversalBackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../types/backupTypes';
import { adaptLegacyBookmarksBackup } from './adapters/legacyBookmarksAdapter';
import { NookSpaceBookmarkBackupV1 } from '../../bookmarks/types/bookmarkImportExport';

export interface VersionAdapter {
  sourceFormat: string;
  sourceVersion: number;
  targetFormatVersion: number;
  isPartial: boolean;
  upgrade: (payload: any) => Promise<NookSpaceUniversalBackupV1>;
}

export class VersionUpgradeRegistry {
  private adapters: Map<string, VersionAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  private getKey(format: string, version: number): string {
    return `${format}__v${version}`;
  }

  private registerDefaultAdapters(): void {
    // Legacy Bookmark Backup Adapter
    this.register({
      sourceFormat: 'nookspace-bookmarks',
      sourceVersion: 1,
      targetFormatVersion: BACKUP_FORMAT_VERSION,
      isPartial: true,
      upgrade: async (payload: NookSpaceBookmarkBackupV1) => {
        return adaptLegacyBookmarksBackup(payload);
      },
    });
  }

  register(adapter: VersionAdapter): void {
    const key = this.getKey(adapter.sourceFormat, adapter.sourceVersion);
    this.adapters.set(key, adapter);
  }

  hasAdapter(format: string, version: number): boolean {
    return this.adapters.has(this.getKey(format, version));
  }

  getAdapter(format: string, version: number): VersionAdapter | undefined {
    return this.adapters.get(this.getKey(format, version));
  }

  isCurrentCanonical(format: string, version: number): boolean {
    return format === BACKUP_FORMAT_IDENTIFIER && version === BACKUP_FORMAT_VERSION;
  }
}

export const versionUpgradeRegistry = new VersionUpgradeRegistry();
