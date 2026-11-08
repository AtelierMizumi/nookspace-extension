import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  LogOut,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  CheckSquare,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Coffee,
  CircleDot,
  Flame,
  Radio,
  UserX,
  Crown,
} from 'lucide-react';
import { useSharedWorkspaceStore } from '../stores/sharedWorkspaceStore';
import { useAuthStore } from '../../account/stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { SOUND_PRESETS, SoundType } from '../services/ambientAudioService';
import { RoomChatDrawer } from './RoomChatDrawer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { PresenceStatus, SharedNote, SharedTask } from '../types';

export const SharedRoomDashboard: React.FC = () => {
  const {
    activeSharedWorkspace,
    members,
    presenceList,
    roomData,
    leaveCurrentRoom,
    deleteWorkspace,
    kickMember,
    updateMyPresence,
    updateNotes,
    updateTasks,
    updateAudioState,
  } = useSharedWorkspaceStore();

  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const isOwner = activeSharedWorkspace?.ownerId === user?.id;
  const [copiedCode, setCopiedCode] = useState(false);
  const [personalVolume, setPersonalVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');

  // Notes state
  const currentNote: SharedNote = roomData.notes[0] || {
    id: 'note-default',
    title: 'Ghi chú phòng học chung',
    content: '',
    updatedAt: Date.now(),
  };
  const [noteTitle, setNoteTitle] = useState(currentNote.title);
  const [noteContent, setNoteContent] = useState(currentNote.content);

  // Sync internal note inputs when incoming roomData updates from others
  useEffect(() => {
    if (roomData.notes[0]) {
      setNoteTitle(roomData.notes[0].title);
      setNoteContent(roomData.notes[0].content);
    }
  }, [roomData.notes]);

  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Pomodoro timer state for the room
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((sec) => sec - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      setIsPomodoroRunning(false);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroSeconds]);

  // My presence
  const myPresence = presenceList.find((p) => p.userId === user?.id);
  const currentStatus: PresenceStatus = myPresence?.status || 'idle';
  const [myActivity, setMyActivity] = useState('');

  if (!activeSharedWorkspace) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeSharedWorkspace.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleToggleAudio = async () => {
    const isPlaying = !roomData.audioState.isPlaying;
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Thành viên';
    await updateAudioState({
      ...roomData.audioState,
      isPlaying,
      updatedByName: userName,
    });
  };

  const handleChangeSound = async (soundId: string) => {
    const preset = SOUND_PRESETS.find((p) => p.id === soundId);
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Thành viên';
    await updateAudioState({
      ...roomData.audioState,
      sound: soundId,
      soundTitle: preset?.label || soundId,
      isPlaying: true,
      updatedByName: userName,
    });
  };

  const handleSaveNote = async () => {
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Thành viên';
    const updated: SharedNote = {
      id: currentNote.id,
      title: noteTitle.trim() || 'Ghi chú phòng học chung',
      content: noteContent,
      updatedAt: Date.now(),
      updatedByName: userName,
    };
    await updateNotes([updated]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Thành viên';
    const newTask: SharedTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      updatedAt: Date.now(),
      completedByName: undefined,
    };
    setNewTaskTitle('');
    await updateTasks([newTask, ...roomData.tasks]);
  };

  const handleToggleTask = async (taskId: string) => {
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Thành viên';
    const updated = roomData.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: !t.completed,
          completedByName: !t.completed ? userName : undefined,
          updatedAt: Date.now(),
        };
      }
      return t;
    });
    await updateTasks(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    const filtered = roomData.tasks.filter((t) => t.id !== taskId);
    await updateTasks(filtered);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* 1. TOP ROOM CONTROLS BANNER */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
        {/* Left: Room Info */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
            style={{ backgroundColor: activeSharedWorkspace.color || '#6366f1' }}
          >
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {activeSharedWorkspace.name}
              </h2>
              <Badge variant="default" size="sm" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                {presenceList.length} người trực tuyến
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">
                Mã phòng: <strong className="text-foreground">{activeSharedWorkspace.joinCode}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Shared Ambient Audio Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              roomData.audioState.isPlaying
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={roomData.audioState.isPlaying ? 'Tạm dừng âm thanh' : 'Bật âm thanh học tập'}
          >
            {roomData.audioState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <select
            value={roomData.audioState.sound}
            onChange={(e) => handleChangeSound(e.target.value)}
            className="text-xs bg-card border border-border/60 rounded-lg px-2 py-1 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SOUND_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.icon} {preset.label}
              </option>
            ))}
          </select>

          {/* Personal Volume Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title={isMuted ? 'Bật tiếng' : 'Tắt tiếng riêng bạn'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-destructive" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Right: Actions (Delete Room if Owner, Leave Room) */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn XÓA phòng học này? Phòng sẽ bị giải tán và tất cả thành viên sẽ rời khỏi phòng.')) {
                  deleteWorkspace(activeSharedWorkspace.id);
                }
              }}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Xóa phòng
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={leaveCurrentRoom}
            className="h-9 px-3 text-xs font-semibold gap-1.5 shadow-sm w-full md:w-auto"
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Thoát phòng (Về cá nhân)
          </Button>
        </div>
      </div>

      {/* 2. THREE COLUMN COLLABORATIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUMN 1: LIVE PRESENCE & POMODORO (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Pomodoro Timer Box */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm text-center space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" />
                Pomodoro phòng học
              </span>
              <span className="text-[11px]">25 phút tập trung</span>
            </div>

            <div className="text-4xl font-extrabold font-mono tracking-wider text-foreground">
              {formatTimer(pomodoroSeconds)}
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant={isPomodoroRunning ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                className="h-8 px-4 text-xs font-semibold"
              >
                {isPomodoroRunning ? 'Tạm dừng' : 'Bắt đầu'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPomodoroRunning(false);
                  setPomodoroSeconds(25 * 60);
                }}
                className="h-8 px-3 text-xs"
              >
                Đặt lại
              </Button>
            </div>
          </div>

          {/* My Status Selector */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm space-y-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 text-primary" />
              Trạng thái của bạn
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => updateMyPresence('focus', myActivity)}
                className={`py-2 px-1 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  currentStatus === 'focus'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tập trung</span>
              </button>

              <button
                type="button"
                onClick={() => updateMyPresence('break', myActivity)}
                className={`py-2 px-1 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  currentStatus === 'break'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                    : 'border-border/60 hover:bg-muted text-foreground'
                }`}
              >
                <Coffee className="h-3 w-3 text-amber-500" />
                <span>Giải lao</span>
              </button>

              <button
                type="button"
                onClick={() => updateMyPresence('idle', myActivity)}
                className={`py-2 px-1 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                  currentStatus === 'idle'
                    ? 'border-muted-foreground/40 bg-muted text-foreground font-semibold'
                    : 'border-border/60 hover:bg-muted text-muted-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                <span>Rảnh</span>
              </button>
            </div>

            <div className="flex gap-1.5">
              <Input
                type="text"
                placeholder="Bạn đang học/làm gì..."
                value={myActivity}
                onChange={(e) => setMyActivity(e.target.value)}
                onBlur={() => updateMyPresence(currentStatus, myActivity)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMyPresence(currentStatus, myActivity)}
                className="h-8 px-2.5 text-xs shrink-0"
              >
                Lưu
              </Button>
            </div>
          </div>

          {/* Members in Room List */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Thành viên trong phòng ({members.length > 0 ? members.length : presenceList.length})
              </span>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {(members.length > 0 ? members : presenceList.map((p) => ({
                id: p.id,
                workspaceId: p.workspaceId,
                userId: p.userId,
                role: (p.userId === activeSharedWorkspace.ownerId ? 'owner' : 'member') as any,
                profile: p.profile,
              }))).map((member: any) => {
                const p = member.profile;
                const name = p?.displayName || p?.email?.split('@')[0] || 'Thành viên';
                const isMe = member.userId === user?.id;
                const isMemberOwner = member.role === 'owner' || member.userId === activeSharedWorkspace.ownerId;
                const presence = presenceList.find((pr) => pr.userId === member.userId);

                return (
                  <div
                    key={member.id || member.userId}
                    className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
                          {p?.avatarUrl ? (
                            <img src={p.avatarUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                            presence?.status === 'focus'
                              ? 'bg-emerald-500 animate-pulse'
                              : presence?.status === 'break'
                              ? 'bg-amber-500'
                              : presence
                              ? 'bg-emerald-400'
                              : 'bg-muted-foreground/60'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {name}
                          </p>
                          {isMemberOwner ? (
                            <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-500">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Chủ phòng
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm" className="text-[9px] py-0 px-1">
                              Thành viên
                            </Badge>
                          )}
                          {isMe && <span className="text-[10px] text-muted-foreground">(Bạn)</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {presence?.activityTitle ? `🎯 ${presence.activityTitle}` : presence ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                        </p>
                      </div>
                    </div>

                    {/* Admin Kick Action */}
                    {isOwner && !isMe && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn mời ${name} rời khỏi phòng học này không?`)) {
                            kickMember(activeSharedWorkspace.id, member.userId, name);
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title={`Mời ${name} ra khỏi phòng`}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 2: SHARED NOTES & SHARED TASKS (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/50 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'notes'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Ghi chú chung</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Nhiệm vụ chung ({roomData.tasks.length})</span>
              </button>
            </div>

            {/* Tab 1: Shared Notes */}
            {activeTab === 'notes' ? (
              <div className="flex-1 flex flex-col space-y-2.5">
                <Input
                  type="text"
                  placeholder="Tiêu đề ghi chú..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  onBlur={handleSaveNote}
                  className="text-xs font-semibold h-8"
                />

                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onBlur={handleSaveNote}
                  placeholder="Viết ghi chú cộng tác của phòng tại đây... Mọi người cùng thấy và chỉnh sửa được."
                  className="flex-1 min-h-[300px] w-full p-3 rounded-xl border border-border/60 bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>
                    {currentNote.updatedByName ? `Cập nhật bởi: ${currentNote.updatedByName}` : 'Tự động lưu'}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleSaveNote} className="h-7 text-xs">
                    Lưu ghi chú
                  </Button>
                </div>
              </div>
            ) : (
              /* Tab 2: Shared Tasks */
              <div className="flex-1 flex flex-col space-y-3">
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Thêm nhiệm vụ chung..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button type="submit" size="sm" variant="primary" className="h-8 px-2.5 shrink-0" disabled={!newTaskTitle.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[380px] pr-1">
                  {roomData.tasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      Chưa có nhiệm vụ chung nào.
                    </div>
                  ) : (
                    roomData.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          task.completed
                            ? 'bg-muted/40 border-border/40 text-muted-foreground line-through'
                            : 'bg-card border-border/70 text-foreground'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          onClick={() => handleToggleTask(task.id)}
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => {}}
                            className="rounded border-border h-4 w-4 text-primary focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-medium truncate select-none">
                            {task.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: LIVE ROOM CHAT (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <RoomChatDrawer className="shadow-sm" />
        </div>
      </div>
    </div>
  );
};
