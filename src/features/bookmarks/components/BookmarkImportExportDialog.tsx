import React, { useState, useRef, useMemo } from 'react';
import {
  Download,
  Upload,
  FileCode,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Folder,
  Bookmark,
  X,
  FileText,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { exportBookmarksToNetscapeHtml } from '../services/bookmarkHtmlExportService';
import { exportBookmarksToJsonBackup } from '../services/bookmarkJsonExportService';
import {
  parseImportFile,
  computePreviewStats,
  executeImportTransaction,
} from '../services/bookmarkImportCoordinator';
import {
  DuplicatePolicy,
  ImportMode,
  ImportPreview,
  ImportResult,
} from '../types/bookmarkImportExport';
import { triggerFileDownload, getExportDateString } from '../utils/bookmarkExportUtils';

export interface BookmarkImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export const BookmarkImportExportDialog: React.FC<BookmarkImportExportDialogProps> = ({
  isOpen,
  onClose,
  workspaceId,
}) => {
  const { bookmarks, groups, loadBookmarks, loadGroups } = useBookmarkStore();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Export State
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showInvalidDetails, setShowInvalidDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on close or tab change
  const handleResetImport = () => {
    setSelectedFile(null);
    setFileContent(null);
    setImportPreview(null);
    setImportMode('merge');
    setDuplicatePolicy('skip');
    setConfirmReplace(false);
    setIsProcessing(false);
    setImportError(null);
    setImportResult(null);
    setShowInvalidDetails(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  const handleExportHtml = () => {
    try {
      const htmlContent = exportBookmarksToNetscapeHtml(groups, bookmarks);
      const filename = `nookspace-bookmarks-${getExportDateString()}.html`;
      triggerFileDownload(htmlContent, filename, 'text/html');
      setExportSuccessMessage(`Successfully exported ${bookmarks.length} bookmarks as Netscape HTML.`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to generate HTML export');
    }
  };

  const handleExportJson = () => {
    try {
      const jsonContent = exportBookmarksToJsonBackup(workspaceId, groups, bookmarks);
      const filename = `nookspace-backup-${getExportDateString()}.json`;
      triggerFileDownload(jsonContent, filename, 'application/json');
      setExportSuccessMessage(
        `Successfully exported ${bookmarks.length} bookmarks and ${groups.length} folders as JSON backup.`
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to generate JSON backup');
    }
  };

  // ==========================================
  // IMPORT HANDLERS
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setImportError('File exceeds maximum size limit of 10MB.');
      return;
    }

    setImportError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setFileContent(text);
        const preview = parseImportFile(text, file.name);
        setImportPreview(preview);
        setImportError(null);
      } catch (err: any) {
        setImportError(err?.message || 'Failed to parse file.');
        setImportPreview(null);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file from disk.');
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Calculated preview stats against current workspace
  const previewStats = useMemo(() => {
    if (!importPreview) return null;
    return computePreviewStats(
      importPreview,
      bookmarks,
      groups,
      duplicatePolicy,
      importMode
    );
  }, [importPreview, bookmarks, groups, duplicatePolicy, importMode]);

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    if (importMode === 'replace' && !confirmReplace) return;

    try {
      setIsProcessing(true);
      setImportError(null);

      const result = await executeImportTransaction(
        {
          workspaceId,
          mode: importMode,
          duplicatePolicy,
          folderConflictPolicy: 'reuse-existing',
        },
        importPreview
      );

      // Refresh store with newly committed data
      await loadBookmarks(workspaceId);
      await loadGroups(workspaceId);

      setImportResult(result);
    } catch (err: any) {
      setImportError(err?.message || 'Import transaction failed and was rolled back.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {activeTab === 'export' ? (
            <Download className="h-4 w-4 text-primary" />
          ) : (
            <Upload className="h-4 w-4 text-primary" />
          )}
          <span>Import & Export Bookmarks</span>
        </div>
      }
      description="Backup, transfer, or restore your saved websites and folder structures."
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/50 gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              handleResetImport();
            }}
            className={`pb-2 font-medium text-xs border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Export Bookmarks
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setExportSuccessMessage(null);
            }}
            className={`pb-2 font-medium text-xs border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Import Bookmarks
          </button>
        </div>

        {/* Global Error Banner */}
        {importError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-xs">{importError}</span>
          </div>
        )}

        {/* ==========================================
            TAB A: EXPORT BOOKMARKS
            ========================================== */}
        {activeTab === 'export' && (
          <div className="space-y-3.5 py-1">
            {exportSuccessMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{exportSuccessMessage}</span>
              </div>
            )}

            {/* Option 1: Netscape HTML */}
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <FileCode className="h-4 w-4 text-primary" />
                  <span>Netscape Bookmark HTML</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Standard format recognized by Google Chrome, Firefox, Safari, Microsoft Edge, and
                  Brave. Ideal for transferring bookmarks to another browser.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportHtml}
                leftIcon={<Download className="h-3.5 w-3.5" />}
                className="shrink-0 h-8 text-xs font-medium"
              >
                Export HTML
              </Button>
            </div>

            {/* Option 2: NookSpace JSON Backup */}
            <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span>NookSpace JSON Backup</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Complete backup preserving folder metadata, accent colors, notes, ordering, and
                  favorites status. Ideal for backing up or restoring NookSpace.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportJson}
                leftIcon={<Download className="h-3.5 w-3.5" />}
                className="shrink-0 h-8 text-xs font-medium"
              >
                Export JSON
              </Button>
            </div>

            <div className="pt-2 text-[11px] text-muted-foreground/80 flex items-center justify-between">
              <span>Current workspace contains:</span>
              <span className="font-medium text-foreground">
                {bookmarks.length} bookmarks in {groups.length} folders
              </span>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB B: IMPORT BOOKMARKS
            ========================================== */}
        {activeTab === 'import' && (
          <div className="space-y-3.5 py-1">
            {/* Step 3: Success Completion View */}
            {importResult ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Import Completed Successfully</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="p-2 rounded bg-card/60 border border-border/40 text-center">
                    <span className="text-muted-foreground text-[10px] block">Added</span>
                    <span className="font-semibold text-foreground text-sm">
                      {importResult.bookmarksCreated}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-card/60 border border-border/40 text-center">
                    <span className="text-muted-foreground text-[10px] block">Updated</span>
                    <span className="font-semibold text-foreground text-sm">
                      {importResult.bookmarksUpdated}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-card/60 border border-border/40 text-center">
                    <span className="text-muted-foreground text-[10px] block">Skipped</span>
                    <span className="font-semibold text-foreground text-sm">
                      {importResult.bookmarksSkipped}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-card/60 border border-border/40 text-center">
                    <span className="text-muted-foreground text-[10px] block">Folders</span>
                    <span className="font-semibold text-foreground text-sm">
                      {importResult.groupsCreated}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={onClose} className="h-8">
                    Done
                  </Button>
                </div>
              </div>
            ) : !importPreview ? (
              /* Step 1: File Selection View */
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-border/70 hover:border-primary/60 bg-secondary/15 hover:bg-secondary/30 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-foreground text-xs mb-0.5">
                    Click to browse or drag file here
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Supports Netscape Bookmark HTML (.html, .htm) or NookSpace JSON (.json)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.json,text/html,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              /* Step 2: Preview & Configuration View */
              <div className="space-y-3">
                {/* File Header Pill */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-secondary/30">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate max-w-xs">
                      {importPreview.sourceFilename}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {importPreview.format}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetImport}
                    className="text-muted-foreground hover:text-foreground p-1 text-[11px]"
                  >
                    Change File
                  </button>
                </div>

                {/* Preflight Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Folders</span>
                    <span className="font-semibold text-xs text-foreground">
                      {importPreview.totalFolders}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Valid Links</span>
                    <span className="font-semibold text-xs text-emerald-500">
                      {importPreview.validBookmarks}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Rejected/Unsafe</span>
                    <span className="font-semibold text-xs text-amber-500">
                      {importPreview.rejectedUnsafeUrls + importPreview.invalidBookmarks}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">File Duplicates</span>
                    <span className="font-semibold text-xs text-muted-foreground">
                      {importPreview.duplicateBookmarksInFile}
                    </span>
                  </div>
                </div>

                {/* Invalid Entries Warning if any */}
                {importPreview.invalidEntries.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {importPreview.invalidEntries.length} invalid or unsafe links will be skipped
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInvalidDetails(!showInvalidDetails)}
                        className="text-[10px] underline hover:no-underline"
                      >
                        {showInvalidDetails ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                    {showInvalidDetails && (
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[10px] text-foreground/80">
                        {importPreview.invalidEntries.slice(0, 10).map((ie, idx) => (
                          <div key={idx} className="truncate">
                            • {ie.title}: <span className="text-muted-foreground">{ie.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode Selector: Merge vs Replace */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-medium text-foreground block">Import Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                        importMode === 'merge'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border/60 hover:bg-secondary/30 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="import-mode"
                          checked={importMode === 'merge'}
                          onChange={() => {
                            setImportMode('merge');
                            setConfirmReplace(false);
                          }}
                          className="text-primary"
                        />
                        <span className="font-medium text-xs">Merge</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Keep existing bookmarks and add imported items.
                      </span>
                    </label>

                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                        importMode === 'replace'
                          ? 'border-destructive bg-destructive/5 text-destructive'
                          : 'border-border/60 hover:bg-secondary/30 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="import-mode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-destructive"
                        />
                        <span className="font-medium text-xs">Replace Workspace</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Delete current bookmarks in workspace and replace.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Duplicate Policy (if Merge) */}
                {importMode === 'merge' && (
                  <div className="space-y-1">
                    <label
                      htmlFor="import-duplicate-policy"
                      className="font-medium text-foreground block"
                    >
                      When a bookmark URL already exists in this workspace:
                    </label>
                    <select
                      id="import-duplicate-policy"
                      value={duplicatePolicy}
                      onChange={(e) => setDuplicatePolicy(e.target.value as DuplicatePolicy)}
                      className="w-full h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="skip">Skip duplicate URLs (Default)</option>
                      <option value="import">Import all (Allow duplicates)</option>
                      <option value="update">Update existing bookmarks</option>
                    </select>
                  </div>
                )}

                {/* Strong Confirmation if Replace */}
                {importMode === 'replace' && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Destructive Action Warning</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      This will permanently remove all {bookmarks.length} existing bookmarks and{' '}
                      {groups.length} folders in this workspace. Other workspaces will not be affected.
                    </p>
                    <Checkbox
                      id="confirm-replace-checkbox"
                      checked={confirmReplace}
                      onCheckedChange={(checked) => setConfirmReplace(Boolean(checked))}
                      label="I understand this will overwrite all bookmarks in this workspace."
                    />
                  </div>
                )}

                {/* Execution Summary Pill */}
                {previewStats && (
                  <div className="p-2 rounded bg-secondary/40 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Expected outcome:</span>
                    <span className="font-medium text-foreground">
                      +{previewStats.expectedAdded} added
                      {previewStats.expectedUpdated > 0 && `, ${previewStats.expectedUpdated} updated`}
                      {previewStats.expectedSkipped > 0 && `, ${previewStats.expectedSkipped} skipped`}
                      {previewStats.expectedGroupsCreated > 0 &&
                        `, +${previewStats.expectedGroupsCreated} folders`}
                    </span>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button variant="ghost" size="sm" onClick={handleResetImport} disabled={isProcessing}>
                    Back
                  </Button>
                  <Button
                    variant={importMode === 'replace' ? 'destructive' : 'primary'}
                    size="sm"
                    onClick={handleExecuteImport}
                    isLoading={isProcessing}
                    disabled={importMode === 'replace' && !confirmReplace}
                  >
                    {importMode === 'replace' ? 'Replace & Import' : 'Confirm Import'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
