import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Layers,
  Check,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import {
  MergeDataGroup,
  MERGE_DATA_GROUPS,
  MergeImportOptions,
  MergeImportPreview,
  MergeImportPlan,
  MergeImportResult,
  MergeConflictPolicy,
} from '../types/mergeTypes';
import { MergePlannerService } from '../services/mergePlannerService';
import { MergeEngineService } from '../services/mergeEngineService';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { db } from '../../../services/database/db';

interface MergeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ModalStep = 'upload' | 'scope' | 'conflicts' | 'confirm' | 'importing' | 'result';

export const MergeImportModal: React.FC<MergeImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const [step, setStep] = useState<ModalStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupJson, setBackupJson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scope selection
  const [selectedGroups, setSelectedGroups] = useState<MergeDataGroup[]>([
    'tasks',
    'notes',
    'bookmarks',
  ]);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>(
    activeWorkspaceId || ''
  );
  const [workspaceMode, setWorkspaceMode] = useState<
    'into_existing' | 'create_new' | 'preserve_source'
  >('into_existing');
  const [newWorkspaceName, setNewWorkspaceName] = useState('Imported Workspace');
  const [preserveSettings, setPreserveSettings] = useState(true);

  // Preview & Plan
  const [preview, setPreview] = useState<MergeImportPreview | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, MergeConflictPolicy>
  >({});
  const [result, setResult] = useState<MergeImportResult | null>(null);
  const [progressMessage, setProgressMessage] = useState('Preparing import...');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setSelectedFile(null);
      setBackupJson(null);
      setErrorMessage(null);
      setPreview(null);
      setResult(null);
      setTargetWorkspaceId(activeWorkspaceId || workspaces[0]?.id || '');
    }
  }, [isOpen, activeWorkspaceId, workspaces]);

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const text = await readFileText(file);
      setBackupJson(text);
      setStep('scope');
    } catch (err: any) {
      setErrorMessage(`Failed to read file: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof file.text === 'function') {
        file.text().then(resolve).catch(reject);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      }
    });
  };

  const toggleGroup = (group: MergeDataGroup) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups([...MERGE_DATA_GROUPS]);
  };

  // Generate Preview
  const handleGeneratePreview = async () => {
    if (!backupJson) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const planner = new MergePlannerService(db);
      const options: MergeImportOptions = {
        selectedGroups,
        targetWorkspaceId:
          workspaceMode === 'into_existing' ? targetWorkspaceId : undefined,
        createNewWorkspaceForImport: workspaceMode === 'create_new',
        newWorkspaceName,
        preserveSettings,
      };

      const prev = await planner.generatePreview(backupJson, options);
      setPreview(prev);

      // Initialize default conflict resolutions
      const initialResolutions: Record<string, MergeConflictPolicy> = {};
      for (const c of prev.conflicts) {
        initialResolutions[c.id] = c.defaultPolicy;
      }
      setConflictResolutions(initialResolutions);

      if (prev.conflicts.length > 0) {
        setStep('conflicts');
      } else {
        setStep('confirm');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to analyze backup preview.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Conflict Actions
  const handleBulkResolve = (policy: MergeConflictPolicy) => {
    if (!preview) return;
    const updated = { ...conflictResolutions };
    for (const c of preview.conflicts) {
      if (c.availablePolicies.includes(policy)) {
        updated[c.id] = policy;
      }
    }
    setConflictResolutions(updated);
  };

  // Execute Merge
  const handleExecuteMerge = async () => {
    if (!preview || !backupJson) return;
    setStep('importing');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const planner = new MergePlannerService(db);
      const engine = new MergeEngineService(db);

      const options: MergeImportOptions = {
        selectedGroups,
        targetWorkspaceId:
          workspaceMode === 'into_existing' ? targetWorkspaceId : undefined,
        createNewWorkspaceForImport: workspaceMode === 'create_new',
        newWorkspaceName,
        customConflictResolutions: conflictResolutions,
        preserveSettings,
      };

      const plan = await planner.buildMergePlan(preview, backupJson, options);

      const res = await engine.executeMerge(plan, options, (prog) => {
        setProgressMessage(prog.message);
      });

      setResult(res);
      setStep('result');
      if (res.success) {
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error during merge execution.');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[85vh] text-content-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold">Merge Import Backup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-secondary hover:text-content-primary hover:bg-surface-elevated"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-surface-border rounded-lg bg-surface-base">
              <Upload className="w-12 h-12 text-content-tertiary mb-3" />
              <p className="text-sm font-medium mb-1">
                Select a Universal JSON Backup file
              </p>
              <p className="text-xs text-content-tertiary mb-4">
                Supported formats: nookspace-backup (.json)
              </p>
              <label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  aria-label="Upload Backup File"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="primary"
                  isLoading={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse File
                </Button>
              </label>
            </div>
          )}

          {/* STEP 2: SCOPE SELECTION */}
          {step === 'scope' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Select Data to Import:</span>
                <Button variant="ghost" size="sm" onClick={selectAllGroups}>
                  Select All
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MERGE_DATA_GROUPS.map((group) => (
                  <label
                    key={group}
                    className="flex items-center gap-2 p-2.5 rounded-md border border-surface-border bg-surface-elevated hover:bg-surface-elevated/80 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroups.includes(group)}
                      onCheckedChange={() => toggleGroup(group)}
                    />
                    <span className="text-sm capitalize font-medium">
                      {group === 'personalData'
                        ? 'Personal Data'
                        : group}
                    </span>
                  </label>
                ))}
              </div>

              {/* Target Workspace Options */}
              <div className="pt-3 border-t border-surface-border space-y-2">
                <span className="text-sm font-medium">Target Workspace:</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="wsMode"
                      checked={workspaceMode === 'into_existing'}
                      onChange={() => setWorkspaceMode('into_existing')}
                    />
                    <span>Import into existing workspace:</span>
                    <select
                      value={targetWorkspaceId}
                      onChange={(e) => setTargetWorkspaceId(e.target.value)}
                      disabled={workspaceMode !== 'into_existing'}
                      className="ml-2 px-2 py-1 text-sm bg-surface-base border border-surface-border rounded-md"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name} {ws.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="wsMode"
                      checked={workspaceMode === 'create_new'}
                      onChange={() => setWorkspaceMode('create_new')}
                    />
                    <span>Create a new workspace for imported items</span>
                  </label>

                  {workspaceMode === 'create_new' && (
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className="ml-6 px-3 py-1.5 text-sm bg-surface-base border border-surface-border rounded-md w-64"
                      placeholder="Workspace Name"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={preserveSettings}
                    onCheckedChange={(checked) => setPreserveSettings(checked)}
                  />
                  <span>Preserve current app settings (theme, layout settings)</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: CONFLICT RESOLUTION */}
          {step === 'conflicts' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <span className="text-sm font-medium">
                  Conflicts Detected ({preview.conflicts.length}):
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkResolve('skip')}
                  >
                    Skip All Duplicates
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkResolve('import_as_new')}
                  >
                    Import All as New
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {preview.conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="p-3 border border-surface-border rounded-md bg-surface-base space-y-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{conflict.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                        {conflict.category}
                      </span>
                    </div>
                    <p className="text-xs text-content-secondary">
                      {conflict.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-content-tertiary">Action:</span>
                      <select
                        value={conflictResolutions[conflict.id] || conflict.defaultPolicy}
                        onChange={(e) =>
                          setConflictResolutions({
                            ...conflictResolutions,
                            [conflict.id]: e.target.value as MergeConflictPolicy,
                          })
                        }
                        className="px-2 py-1 text-xs bg-surface-elevated border border-surface-border rounded-md"
                      >
                        {conflict.availablePolicies.map((p) => (
                          <option key={p} value={p}>
                            {p === 'import_as_new'
                              ? 'Import as New Copy'
                              : p === 'skip'
                              ? 'Skip Incoming'
                              : p === 'keep_existing'
                              ? 'Keep Existing'
                              : 'Replace Existing'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: FINAL CONFIRMATION */}
          {step === 'confirm' && preview && (
            <div className="space-y-4">
              <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-md">
                <h3 className="text-sm font-semibold text-primary-500 mb-2">
                  Merge Import Summary
                </h3>
                <ul className="text-sm space-y-1 text-content-secondary">
                  <li>
                    • New items to be imported: <strong>{preview.newEntitiesCount}</strong>
                  </li>
                  <li>
                    • Duplicates detected: <strong>{preview.duplicateCount}</strong>
                  </li>
                  <li>
                    • Target workspace:{' '}
                    <strong>
                      {workspaceMode === 'into_existing'
                        ? preview.targetWorkspaceName
                        : workspaceMode === 'create_new'
                        ? newWorkspaceName
                        : 'Source Workspaces'}
                    </strong>
                  </li>
                  <li>
                    • Existing data:{' '}
                    <span className="text-emerald-500 font-medium">
                      Preserved 100% (Non-destructive)
                    </span>
                  </li>
                </ul>
              </div>

              {preview.warnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-xs space-y-1">
                  {preview.warnings.map((w, idx) => (
                    <div key={idx}>⚠️ {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: IMPORTING PROGRESS */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">{progressMessage}</p>
              <p className="text-xs text-content-tertiary">
                Please keep this tab open while data is being merged.
              </p>
            </div>
          )}

          {/* STEP 6: RESULT */}
          {step === 'result' && result && (
            <div className="flex flex-col items-center justify-center p-6 space-y-3 text-center">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-1" />
                  <h3 className="text-base font-semibold">
                    Merge Import Completed Successfully!
                  </h3>
                  <p className="text-sm text-content-secondary max-w-sm">
                    Items have been added to your workspace without altering your existing
                    data.
                  </p>
                  <div className="p-3 bg-surface-base border border-surface-border rounded-md text-xs text-left w-full max-w-sm mt-2">
                    <div>
                      • Total skipped items: <strong>{result.skippedCount}</strong>
                    </div>
                    <div>
                      • Conflicts resolved:{' '}
                      <strong>{result.conflictsResolvedCount}</strong>
                    </div>
                    <div>
                      • Duration: <strong>{result.durationMs} ms</strong>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 text-red-500 mb-1" />
                  <h3 className="text-base font-semibold">Merge Import Failed</h3>
                  <p className="text-sm text-red-400">
                    {result.error?.message || 'Transaction aborted.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          {step === 'upload' && (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step === 'scope' && (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleGeneratePreview}
                disabled={selectedGroups.length === 0}
                isLoading={isLoading}
              >
                Analyze Preview <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'conflicts' && (
            <>
              <Button variant="ghost" onClick={() => setStep('scope')}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep('confirm')}>
                Continue to Confirm <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  preview?.conflicts.length ? setStep('conflicts') : setStep('scope')
                }
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteMerge}
                isLoading={isLoading}
              >
                Apply Merge Import
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button variant="primary" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
