import React, { useState, useRef } from 'react';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { restorePreflightService } from '../services/restorePreflightService';
import { restoreEngineService } from '../services/restoreEngineService';
import {
  RestorePreflightResult,
  RestoreResult,
  RestoreProgress,
} from '../types/restoreTypes';

export interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: (result: RestoreResult) => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<RestorePreflightResult | null>(null);
  const [isPreflighting, setIsPreflighting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setSelectedFile(null);
    setFileContent(null);
    setPreflight(null);
    setIsPreflighting(false);
    setIsRestoring(false);
    setConfirmed(false);
    setProgress(null);
    setRestoreResult(null);
    setGeneralError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isRestoring) return; // Prevent closing mid-restore
    handleReset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleReset();
    setSelectedFile(file);
    setIsPreflighting(true);

    try {
      let text = '';
      if (typeof (file as any).text === 'function') {
        text = await (file as any).text();
      } else if (typeof (file as any).arrayBuffer === 'function') {
        const buffer = await (file as any).arrayBuffer();
        text = new TextDecoder().decode(buffer);
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
      }
      setFileContent(text);

      const result = await restorePreflightService.prepareRestore(text);
      setPreflight(result);
    } catch (err) {
      setGeneralError(
        `Failed to process backup file: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsPreflighting(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!fileContent || !preflight?.success || !confirmed) return;

    setIsRestoring(true);
    setGeneralError(null);

    try {
      const result = await restoreEngineService.restoreBackup(fileContent, {
        onProgress: (p) => setProgress(p),
      });

      setRestoreResult(result);
      if (result.success && onRestoreSuccess) {
        onRestoreSuccess(result);
      }
    } catch (err: any) {
      setGeneralError(
        `Unexpected error during restoration: ${err?.message || String(err)}`
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Restore Backup"
      description="Restore workspaces, layouts, notes, and bookmarks from a Universal Backup JSON."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isRestoring}
          >
            {restoreResult?.success ? 'Done' : 'Cancel'}
          </Button>

          {preflight?.success && !restoreResult && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteRestore}
              disabled={!confirmed || isRestoring || isPreflighting}
              isLoading={isRestoring}
            >
              Restore and Replace Current Data
            </Button>
          )}

          {restoreResult && !restoreResult.success && (
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Try Another File
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          disabled={isRestoring}
        />

        {/* 1. File Selection Drop Area */}
        {!selectedFile && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-primary/80 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/30 select-none"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground text-sm">Select Backup File</p>
            <p className="text-muted-foreground text-center">
              Choose a valid NookSpace JSON backup (<code className="text-primary">.json</code>)
            </p>
          </div>
        )}

        {/* 2. Loading State during Preflight */}
        {isPreflighting && (
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <p>Inspecting backup format and verifying integrity...</p>
          </div>
        )}

        {/* 3. General Error Display */}
        {generalError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Restore Failed</p>
              <p className="text-[11px] opacity-90">{generalError}</p>
            </div>
          </div>
        )}

        {/* 4. Preflight Rejected / Error Display */}
        {preflight && !preflight.success && preflight.error && (
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-sm">Backup Not Restorable</span>
              <Badge variant="destructive" size="sm">
                {preflight.error.code}
              </Badge>
            </div>
            <p className="text-foreground/90 pl-6">{preflight.error.message}</p>
            {preflight.error.suggestedAction && (
              <p className="text-muted-foreground pl-6 text-[11px]">
                {preflight.error.suggestedAction}
              </p>
            )}
            <div className="pl-6 pt-1">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Select Different Backup
              </Button>
            </div>
          </div>
        )}

        {/* 5. Preflight Passed: File Preview & Replacement Warning */}
        {preflight?.success && !restoreResult && !isRestoring && (
          <div className="space-y-4">
            {/* File Metadata Overview Card */}
            <div className="p-3 rounded-lg border border-border/70 bg-card/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{selectedFile?.name}</span>
                </div>
                <Badge variant="success" size="sm">
                  Verified V1 Backup
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                <div>
                  <span className="block text-foreground/70">Workspaces</span>
                  <span className="font-semibold text-foreground text-xs">
                    {preflight.backupStats.workspaceCount}
                  </span>
                </div>
                <div>
                  <span className="block text-foreground/70">Total Records</span>
                  <span className="font-semibold text-foreground text-xs">
                    {preflight.backupStats.totalRecords}
                  </span>
                </div>
                <div>
                  <span className="block text-foreground/70">Export Date</span>
                  <span className="font-semibold text-foreground text-xs">
                    {new Date(
                      preflight.canonicalBackup?.metadata.exportedAt || 0
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block text-foreground/70">App Version</span>
                  <span className="font-semibold text-foreground text-xs">
                    {preflight.canonicalBackup?.metadata.appVersion || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Invariant Warnings */}
            {preflight.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <Info className="h-3.5 w-3.5" />
                  <span>Important Notes</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {preflight.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Destructive Replacement Warning */}
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Destructive Operation: Current Data Replacement</span>
              </div>
              <p className="text-foreground/80 pl-6 text-[11px] leading-relaxed">
                Restoring this backup will completely replace all existing workspaces, layouts,
                notes, bookmarks, and settings. A durable recovery snapshot of your current data (
                {preflight.currentStats.totalRecords} records across{' '}
                {preflight.currentStats.workspaceCount} workspaces) will be saved to persistent
                storage before any changes take place.
              </p>
              <div className="pl-6 pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-restore"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-border text-destructive focus:ring-destructive"
                />
                <label
                  htmlFor="confirm-restore"
                  className="text-foreground font-medium text-xs cursor-pointer select-none"
                >
                  I understand that current data will be replaced by the backup
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 6. In-Progress State */}
        {isRestoring && (
          <div className="p-6 rounded-lg border border-border/80 bg-card/60 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">Restoring Backup</p>
              <p className="text-muted-foreground text-xs mt-1">
                {progress?.message || 'Processing transactional restoration...'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Persistent recovery snapshot active</span>
            </div>
          </div>
        )}

        {/* 7. Success Result State */}
        {restoreResult?.success && (
          <div className="p-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Restore Completed Successfully</span>
            </div>
            <p className="text-foreground/90 text-xs pl-7">
              All workspaces, layouts, notes, and configurations have been replaced and verified.
              Your dashboard and stores have been updated.
            </p>
            <div className="pl-7 text-[11px] text-muted-foreground border-t border-emerald-500/20 pt-2">
              <span>Restored in {restoreResult.durationMs} ms</span>
            </div>
          </div>
        )}

        {/* 8. Rollback Completed Result State */}
        {restoreResult && !restoreResult.success && restoreResult.rollbackOccurred && restoreResult.rollbackSucceeded && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>Restore Failed — Rolled Back to Original State</span>
            </div>
            <p className="text-foreground/90 text-xs pl-7">
              The restore operation encountered an error ({restoreResult.error?.message}), but
              your previous data has been safely and completely restored from the durable recovery
              snapshot.
            </p>
          </div>
        )}

        {/* 9. Critical Recovery Required State */}
        {restoreResult && !restoreResult.success && restoreResult.finalState === 'recovery_required' && (
          <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="h-5 w-5" />
              <span>CRITICAL: Recovery Required</span>
            </div>
            <p className="text-foreground/90 text-xs pl-7">
              Automatic rollback could not complete. Your persistent recovery snapshot is preserved
              in local storage. Please do NOT clear browser data.
            </p>
            <p className="text-muted-foreground text-[11px] pl-7">
              Operation ID: <code>{restoreResult.operationId}</code>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
