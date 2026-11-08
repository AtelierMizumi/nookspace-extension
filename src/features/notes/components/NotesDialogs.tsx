import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { NoteCollectionEntity, NoteTagEntity } from '../../../types/notes';

// -------------------------------------------------------------
// 1. COLLECTION FORM MODAL (Create / Rename)
// -------------------------------------------------------------

export interface CollectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  initialData?: NoteCollectionEntity | null;
}

export function CollectionFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CollectionFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setColor(initialData.color || '#3b82f6');
    } else {
      setTitle('');
      setDescription('');
      setColor('#3b82f6');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Collection title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        color,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Collection' : 'New Collection'}
      description="Organize your notes into thematic collections."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {initialData ? 'Save Changes' : 'Create Collection'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-800 dark:text-slate-200 mb-1">
            Collection Name *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Work Projects, Study Notes..."
            autoFocus
          />
        </div>

        <div>
          <label className="block font-medium text-slate-800 dark:text-slate-200 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of what belongs in this collection..."
            className="w-full h-16 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-800 dark:text-slate-200 mb-1.5">
            Color Accent
          </label>
          <div className="flex items-center gap-2">
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// -------------------------------------------------------------
// 2. DELETE COLLECTION MODAL (Safe Mode Selection)
// -------------------------------------------------------------

export interface DeleteCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'reassign' | 'cascade') => Promise<void>;
  collection: NoteCollectionEntity | null;
  noteCount: number;
}

export function DeleteCollectionModal({
  isOpen,
  onClose,
  onConfirm,
  collection,
  noteCount,
}: DeleteCollectionModalProps) {
  const [mode, setMode] = useState<'reassign' | 'cascade'>('reassign');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMode('reassign');
  }, [isOpen]);

  if (!collection) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(mode);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete Collection "${collection.title}"`}
      description="Choose how to handle the notes currently stored in this collection."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Collection
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          This collection contains <strong className="text-slate-900 dark:text-slate-100">{noteCount}</strong> {noteCount === 1 ? 'note' : 'notes'}.
        </p>

        <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="delete-mode"
              value="reassign"
              checked={mode === 'reassign'}
              onChange={() => setMode('reassign')}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                Move notes to Uncategorized (Recommended)
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Preserves all {noteCount} notes so they remain accessible under Uncategorized.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-200 dark:border-slate-800">
            <input
              type="radio"
              name="delete-mode"
              value="cascade"
              checked={mode === 'cascade'}
              onChange={() => setMode('cascade')}
              className="mt-0.5 text-red-600 focus:ring-red-500"
            />
            <div>
              <div className="font-medium text-red-600 dark:text-red-400">
                Permanently delete collection and all {noteCount} notes
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Warning: This will delete both the collection and its notes irreversibly.
              </div>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// 3. TAG FORM MODAL (Create / Rename)
// -------------------------------------------------------------

export interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color?: string }) => Promise<void>;
  initialData?: NoteTagEntity | null;
}

export function TagFormModal({ isOpen, onClose, onSave, initialData }: TagFormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setColor(initialData.color || '#3b82f6');
    } else {
      setName('');
      setColor('#3b82f6');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tag name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim().toLowerCase(),
        color,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Tag' : 'New Tag'}
      description="Create a normalized tag to label and categorize notes."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {initialData ? 'Save Changes' : 'Create Tag'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-800 dark:text-slate-200 mb-1">
            Tag Name *
          </label>
          <div className="flex items-center">
            <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-l border border-r-0 border-slate-300 dark:border-slate-700">
              #
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. productivity, work..."
              className="rounded-l-none"
              autoFocus
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// -------------------------------------------------------------
// 4. DELETE TAG MODAL
// -------------------------------------------------------------

export interface DeleteTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tag: NoteTagEntity | null;
  noteCount: number;
}

export function DeleteTagModal({ isOpen, onClose, onConfirm, tag, noteCount }: DeleteTagModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!tag) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete Tag "#${tag.name}"`}
      description="Deleting this tag will remove it from all labeled notes without deleting the notes."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Tag
          </Button>
        </>
      }
    >
      <div className="text-xs text-slate-600 dark:text-slate-400">
        This tag is currently used by <strong className="text-slate-900 dark:text-slate-100">{noteCount}</strong> {noteCount === 1 ? 'note' : 'notes'}.
      </div>
    </Modal>
  );
}
