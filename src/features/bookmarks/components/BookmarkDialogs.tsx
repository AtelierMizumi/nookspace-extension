import React, { useState, useEffect } from 'react';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { validateBookmarkUrl } from '../utils/bookmarkSecurity';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { AlertTriangle, Folder, FolderPlus, BookmarkPlus, Edit3, Trash2, ArrowRight } from 'lucide-react';

// ==========================================
// 1. BOOKMARK FORM MODAL (CREATE / EDIT)
// ==========================================

export interface BookmarkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBookmark?: BookmarkEntity | null;
  defaultGroupId?: string | null;
  groups: BookmarkGroupEntity[];
  onSubmit: (input: {
    title: string;
    url: string;
    description?: string;
    groupId: string | null;
    isFavorite: boolean;
  }) => Promise<void>;
}

export const BookmarkFormModal: React.FC<BookmarkFormModalProps> = ({
  isOpen,
  onClose,
  initialBookmark,
  defaultGroupId = null,
  groups,
  onSubmit,
}) => {
  const isEditing = Boolean(initialBookmark);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialBookmark) {
        setTitle(initialBookmark.title);
        setUrl(initialBookmark.url);
        setDescription(initialBookmark.description || '');
        setGroupId(initialBookmark.groupId);
        setIsFavorite(initialBookmark.isFavorite);
      } else {
        setTitle('');
        setUrl('');
        setDescription('');
        setGroupId(defaultGroupId);
        setIsFavorite(false);
      }
      setTitleError('');
      setUrlError('');
      setGeneralError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialBookmark, defaultGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError('');
    setUrlError('');
    setGeneralError('');

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Title cannot be empty');
      hasError = true;
    } else if (trimmedTitle.length > 200) {
      setTitleError('Title cannot exceed 200 characters');
      hasError = true;
    }

    if (!trimmedUrl) {
      setUrlError('URL cannot be empty');
      hasError = true;
    } else {
      const validation = validateBookmarkUrl(trimmedUrl);
      if (!validation.valid) {
        setUrlError(validation.error || 'Invalid or unsafe URL format');
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: trimmedTitle,
        url: trimmedUrl,
        description: description.trim() ? description.trim() : undefined,
        groupId: groupId || null,
        isFavorite,
      });
      onClose();
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to save bookmark');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isEditing ? <Edit3 className="h-4 w-4 text-primary" /> : <BookmarkPlus className="h-4 w-4 text-primary" />}
          <span>{isEditing ? 'Edit Bookmark' : 'Add New Bookmark'}</span>
        </div>
      }
      description={isEditing ? 'Update bookmark details and folder assignment.' : 'Save a web link to your workspace.'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Bookmark'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {generalError && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <div>
          <label className="font-medium text-foreground block mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            placeholder="e.g. GitHub"
            error={titleError}
            maxLength={200}
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="font-medium text-foreground block mb-1">
            URL <span className="text-destructive">*</span>
          </label>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) setUrlError('');
            }}
            placeholder="https://example.com"
            error={urlError}
            disabled={isSubmitting}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Allowed protocols: https://, http://, mailto:
          </p>
        </div>

        <div>
          <label className="font-medium text-foreground block mb-1">Folder</label>
          <div className="relative">
            <select
              value={groupId || ''}
              onChange={(e) => setGroupId(e.target.value || null)}
              className="w-full h-9 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={isSubmitting}
            >
              <option value="">Uncategorized</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-medium text-foreground block mb-1">Description (Optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or tags about this link..."
            rows={2}
            maxLength={1000}
            disabled={isSubmitting}
          />
        </div>

        <div className="pt-1">
          <Checkbox
            id="bookmark-is-favorite"
            checked={isFavorite}
            onCheckedChange={(checked) => setIsFavorite(Boolean(checked))}
            label="Star as favorite"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};

// ==========================================
// 2. FOLDER FORM MODAL (CREATE / RENAME)
// ==========================================

export interface FolderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolder?: BookmarkGroupEntity | null;
  onSubmit: (title: string, color?: string, icon?: string) => Promise<void>;
}

const PRESET_FOLDER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#EF4444', // Red
];

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  isOpen,
  onClose,
  initialFolder,
  onSubmit,
}) => {
  const isEditing = Boolean(initialFolder);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<string>('#3B82F6');
  const [titleError, setTitleError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialFolder) {
        setTitle(initialFolder.title);
        setColor(initialFolder.color || '#3B82F6');
      } else {
        setTitle('');
        setColor('#3B82F6');
      }
      setTitleError('');
      setGeneralError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialFolder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError('');
    setGeneralError('');

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Folder name cannot be empty');
      return;
    }
    if (trimmed.length > 100) {
      setTitleError('Folder name cannot exceed 100 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(trimmed, color || undefined);
      onClose();
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to save folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isEditing ? <Edit3 className="h-4 w-4 text-primary" /> : <FolderPlus className="h-4 w-4 text-primary" />}
          <span>{isEditing ? 'Rename Folder' : 'Create New Folder'}</span>
        </div>
      }
      description={isEditing ? 'Change folder name and accent color.' : 'Organize your bookmarks into a folder.'}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Folder'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {generalError && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <div>
          <label className="font-medium text-foreground block mb-1">
            Folder Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            placeholder="e.g. Design Inspiration"
            error={titleError}
            maxLength={100}
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="font-medium text-foreground block mb-1.5">Color Tag</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
                className={`h-6 w-6 rounded-full transition-transform border ${
                  color === c ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card border-transparent' : 'border-border/60 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ==========================================
// 3. DELETE FOLDER CONFIRMATION MODAL
// ==========================================

export interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: BookmarkGroupEntity | null;
  affectedCount: number;
  onConfirm: (mode: 'reassign' | 'cascade') => Promise<void>;
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  affectedCount,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'reassign' | 'cascade'>('reassign');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('reassign');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!folder) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(mode);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          <span>Delete Folder "{folder.title}"</span>
        </div>
      }
      description="Choose what to do with bookmarks currently stored in this folder."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={mode === 'cascade' ? 'destructive' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            {mode === 'cascade' ? 'Delete Folder & Bookmarks' : 'Delete Folder Only'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          {/* Mode A: Reassign (Default Safe) */}
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            mode === 'reassign' ? 'border-primary/60 bg-primary/5' : 'border-border/60 hover:bg-secondary/40'
          }`}>
            <input
              type="radio"
              name="delete-folder-mode"
              value="reassign"
              checked={mode === 'reassign'}
              onChange={() => setMode('reassign')}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="font-medium text-foreground block">
                Keep bookmarks in Uncategorized (Recommended)
              </span>
              <p className="text-[11px] text-muted-foreground">
                The folder will be deleted, and all {affectedCount} bookmark{affectedCount === 1 ? '' : 's'} will be safely moved to Uncategorized with no data loss.
              </p>
            </div>
          </label>

          {/* Mode B: Cascade Delete */}
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            mode === 'cascade' ? 'border-destructive/60 bg-destructive/5' : 'border-border/60 hover:bg-secondary/40'
          }`}>
            <input
              type="radio"
              name="delete-folder-mode"
              value="cascade"
              checked={mode === 'cascade'}
              onChange={() => setMode('cascade')}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="font-medium text-destructive block">
                Permanently delete folder and all {affectedCount} bookmark{affectedCount === 1 ? '' : 's'}
              </span>
              <p className="text-[11px] text-muted-foreground">
                This action is irreversible. All bookmarks inside "{folder.title}" will be permanently removed.
              </p>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
};

// ==========================================
// 4. MOVE BOOKMARK MODAL
// ==========================================

export interface MoveBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmark: BookmarkEntity | null;
  groups: BookmarkGroupEntity[];
  onMove: (bookmarkId: string, targetGroupId: string | null) => Promise<void>;
}

export const MoveBookmarkModal: React.FC<MoveBookmarkModalProps> = ({
  isOpen,
  onClose,
  bookmark,
  groups,
  onMove,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bookmark) {
      setSelectedGroupId(bookmark.groupId);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, bookmark]);

  if (!bookmark) return null;

  const handleMove = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      await onMove(bookmark.id, selectedGroupId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to move bookmark');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span>Move Bookmark</span>
        </div>
      }
      description={`Select destination folder for "${bookmark.title}".`}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleMove} isLoading={isSubmitting}>
            Move Bookmark
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {error && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {/* Option: Uncategorized */}
          <button
            type="button"
            onClick={() => setSelectedGroupId(null)}
            className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left transition-colors ${
              selectedGroupId === null
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border/60 hover:bg-secondary/40 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>Uncategorized</span>
            </div>
            {bookmark.groupId === null && (
              <span className="text-[10px] text-muted-foreground">(Current)</span>
            )}
          </button>

          {/* User Folders */}
          {groups.map((group) => {
            const isSelected = selectedGroupId === group.id;
            const isCurrent = bookmark.groupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border/60 hover:bg-secondary/40 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || '#3B82F6' }}
                  />
                  <span className="truncate">{group.title}</span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] text-muted-foreground">(Current)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
