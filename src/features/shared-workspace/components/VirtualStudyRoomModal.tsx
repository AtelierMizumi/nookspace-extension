import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  Flame,
  Check,
  Copy,
  Clock,
  Sparkles,
  Coffee,
  CircleDot,
} from 'lucide-react';
import { useSharedWorkspaceStore } from '../stores/sharedWorkspaceStore';
import { useAuthStore } from '../../account/stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { PresenceStatus } from '../types';

export const VirtualStudyRoomModal: React.FC = () => {
  const {
    activeSharedWorkspace,
    presenceList,
    isStudyRoomOpen,
    closeStudyRoom,
    updateMyPresence,
    loadPresence,
  } = useSharedWorkspaceStore();

  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const [myActivity, setMyActivity] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const myPresence = presenceList.find((p) => p.userId === user?.id);
  const currentStatus: PresenceStatus = myPresence?.status || 'idle';

  // Room Stats
  const totalRoomFocusMinutes = presenceList.reduce((acc, p) => acc + (p.focusMinutesToday || 0), 0);
  const activeFocusCount = presenceList.filter((p) => p.status === 'focus').length;

  const handleStatusChange = async (status: PresenceStatus) => {
    await updateMyPresence(status, myActivity || myPresence?.activityTitle || undefined);
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myActivity.trim()) return;
    await updateMyPresence(currentStatus, myActivity.trim());
  };

  const handleCopyCode = () => {
    if (!activeSharedWorkspace?.joinCode) return;
    navigator.clipboard.writeText(activeSharedWorkspace.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <Modal
      isOpen={isStudyRoomOpen}
      onClose={closeStudyRoom}
      size="lg"
      ariaLabel={t('studyRoom.title')}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <span className="text-base font-semibold text-foreground">
                {activeSharedWorkspace?.name || t('studyRoom.title')}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {t('studyRoom.subtitle')}
              </p>
            </div>
          </div>

          {activeSharedWorkspace && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <span>{t('sharedWorkspace.roomCode')}: {activeSharedWorkspace.joinCode}</span>
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Room Focus Metrics Bar */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-card border border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t('studyRoom.stats.totalFocus')}</p>
              <p className="text-sm font-bold text-foreground">{formatMinutes(totalRoomFocusMinutes)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t('studyRoom.stats.currentlyFocusing')}</p>
              <p className="text-sm font-bold text-foreground">
                {activeFocusCount} / {presenceList.length || 1} {t('studyRoom.stats.members')}
              </p>
            </div>
          </div>
        </div>

        {/* My Status Controls Box */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 text-primary" />
              {t('studyRoom.myStatus.label')}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t('studyRoom.myStatus.autoSyncNotice')}
            </span>
          </div>

          {/* Status Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('focus')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                currentStatus === 'focus'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-500/40'
                  : 'border-border/60 hover:bg-muted text-foreground'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('studyRoom.myStatus.inFocus')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('break')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                currentStatus === 'break'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-500/40'
                  : 'border-border/60 hover:bg-muted text-foreground'
              }`}
            >
              <Coffee className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('studyRoom.myStatus.onBreak')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('idle')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                currentStatus === 'idle'
                  ? 'border-muted-foreground/50 bg-muted/60 text-foreground font-semibold'
                  : 'border-border/60 hover:bg-muted text-muted-foreground'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
              <span>{t('studyRoom.myStatus.idle')}</span>
            </button>
          </div>

          {/* Current Activity Title Input */}
          <form onSubmit={handleActivitySubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder={t('studyRoom.myStatus.activityPlaceholder')}
              value={myActivity}
              onChange={(e) => setMyActivity(e.target.value)}
              className="text-xs h-8"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0">
              {t('common.update')}
            </Button>
          </form>
        </div>

        {/* Members in Room Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {t('studyRoom.roomMembers')} ({presenceList.length})
            </span>
            <button
              type="button"
              onClick={() => activeSharedWorkspace && loadPresence(activeSharedWorkspace.id)}
              className="text-[11px] text-primary hover:underline"
            >
              {t('common.refresh')}
            </button>
          </div>

          {/* Members List Cards */}
          <div className="grid gap-2 max-h-[260px] overflow-y-auto pr-1">
            {presenceList.map((presence) => {
              const p = presence.profile;
              const name = p?.displayName || p?.email?.split('@')[0] || t('account.anonymous');
              const initial = name.charAt(0).toUpperCase();
              const isMe = presence.userId === user?.id;

              return (
                <div
                  key={presence.id || presence.userId}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs select-none">
                        {p?.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                          presence.status === 'focus'
                            ? 'bg-emerald-500 animate-pulse'
                            : presence.status === 'break'
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground/60'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {name}
                        </span>
                        {isMe && (
                          <Badge variant="secondary" size="sm" className="text-[9px] py-0 px-1">
                            {t('studyRoom.you')}
                          </Badge>
                        )}
                      </div>
                      {presence.activityTitle ? (
                        <p className="text-[11px] text-muted-foreground truncate">
                          🎯 {presence.activityTitle}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          {presence.status === 'focus'
                            ? t('studyRoom.statusFocusing')
                            : presence.status === 'break'
                            ? t('studyRoom.statusBreak')
                            : t('studyRoom.statusIdle')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Focus minutes today */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pl-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatMinutes(presence.focusMinutesToday || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
