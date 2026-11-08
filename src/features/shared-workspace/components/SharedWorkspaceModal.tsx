import React, { useState, useCallback } from 'react';
import {
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  LogOut,
  AlertCircle,
  Crown,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useSharedWorkspaceStore } from '../stores/sharedWorkspaceStore';
import { useAuthStore } from '../../account/stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Badge } from '../../../components/ui/Badge';
import { VirtualStudyRoomModal } from './VirtualStudyRoomModal';

export const SharedWorkspaceModal: React.FC = () => {
  const {
    workspaces,
    activeSharedWorkspace,
    isLoading,
    error,
    isModalOpen,
    createWorkspace,
    joinWorkspace,
    leaveWorkspace,
    deleteWorkspace,
    selectSharedWorkspace,
    closeModal,
    openStudyRoom,
    clearError,
  } = useSharedWorkspaceStore();

  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');

  // Join form state
  const [joinCode, setJoinCode] = useState('');

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setJoinCode('');
    clearError();
    closeModal();
  }, [closeModal, clearError]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSelectWorkspace = async (ws: any) => {
    await selectSharedWorkspace(ws);
    handleClose();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = await createWorkspace({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });

    if (created) {
      handleClose();
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    const success = await joinWorkspace(joinCode.trim());
    if (success) {
      handleClose();
    }
  };

  const colorOptions = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        size="lg"
        ariaLabel={t('sharedWorkspace.title')}
        title={
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-foreground">
              {t('sharedWorkspace.title')}
            </span>
          </div>
        }
        description={t('sharedWorkspace.subtitle')}
      >
        <div className="space-y-4 pt-1">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setActiveTab('list'); clearError(); }}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center ${
                activeTab === 'list'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('sharedWorkspace.tabs.myWorkspaces')} ({workspaces.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('create'); clearError(); }}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>{t('sharedWorkspace.tabs.create')}</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('join'); clearError(); }}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'join'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span>{t('sharedWorkspace.tabs.join')}</span>
            </button>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t(error) || error}</span>
            </div>
          )}

          {/* TAB: WORKSPACES LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Return to Personal Mode Button if active */}
              {activeSharedWorkspace && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-primary/40 bg-primary/10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {t('sharedWorkspace.currentlyInShared')}: {activeSharedWorkspace.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('sharedWorkspace.cloudSyncActive')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        closeModal();
                        openStudyRoom();
                      }}
                      leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                    >
                      {t('sharedWorkspace.openStudyRoom')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => selectSharedWorkspace(null)}
                    >
                      {t('sharedWorkspace.switchToPersonal')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Workspace cards */}
              {workspaces.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {t('sharedWorkspace.noWorkspacesYet')}
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    {t('sharedWorkspace.noWorkspacesDesc')}
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button size="sm" variant="primary" onClick={() => setActiveTab('create')}>
                      {t('sharedWorkspace.tabs.create')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('join')}>
                      {t('sharedWorkspace.tabs.join')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {workspaces.map((ws) => {
                    const isOwner = ws.ownerId === user?.id;
                    const isActive = activeSharedWorkspace?.id === ws.id;

                    return (
                      <div
                        key={ws.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-border/70 bg-card hover:border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                              style={{ backgroundColor: ws.color }}
                            >
                              {ws.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-semibold text-foreground truncate">
                                  {ws.name}
                                </h4>
                                {isOwner && (
                                  <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-500">
                                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                                    {t('sharedWorkspace.owner')}
                                  </Badge>
                                )}
                              </div>
                              {ws.description && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {ws.description}
                                </p>
                              )}

                              {/* Join Code Display */}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[11px] text-muted-foreground">
                                  {t('sharedWorkspace.roomCode')}:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(ws.joinCode)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors"
                                  title={t('common.copy')}
                                >
                                  <span>{ws.joinCode}</span>
                                  {copiedCode === ws.joinCode ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectWorkspace(ws)}
                                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                              >
                                {t('sharedWorkspace.select')}
                              </Button>
                            ) : (
                              <Badge variant="default" size="sm">
                                {t('sharedWorkspace.active')}
                              </Badge>
                            )}

                            {isOwner ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Bạn có chắc chắn muốn xóa phòng học này? Hành động này sẽ giải tán phòng.')) {
                                    deleteWorkspace(ws.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Xóa phòng học"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => leaveWorkspace(ws.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title={t('sharedWorkspace.leave')}
                              >
                                <LogOut className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: CREATE WORKSPACE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('sharedWorkspace.create.name')} *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Study Squad, Dev Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('sharedWorkspace.create.description')}
                </label>
                <Textarea
                  placeholder="e.g. Daily focus & knowledge sharing space..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {t('sharedWorkspace.create.themeColor')}
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setActiveTab('list')}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" isLoading={isLoading} disabled={!name.trim() || isLoading}>
                  {t('sharedWorkspace.create.submit')}
                </Button>
              </div>
            </form>
          )}

          {/* TAB: JOIN WITH CODE */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('sharedWorkspace.join.desc')}
              </p>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('sharedWorkspace.join.codeLabel')} *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  autoFocus
                  className="font-mono text-center tracking-widest text-base font-bold uppercase"
                  maxLength={10}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setActiveTab('list')}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" isLoading={isLoading} disabled={!joinCode.trim() || isLoading}>
                  {t('sharedWorkspace.join.submit')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Virtual Study Room Modal */}
      <VirtualStudyRoomModal />
    </>
  );
};
