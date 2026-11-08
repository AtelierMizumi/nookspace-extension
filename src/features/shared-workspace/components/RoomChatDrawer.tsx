import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bell, User as UserIcon } from 'lucide-react';
import { useSharedWorkspaceStore } from '../stores/sharedWorkspaceStore';
import { useAuthStore } from '../../account/stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export const RoomChatDrawer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { messages, sendMessage } = useSharedWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const text = inputMessage.trim();
    setInputMessage('');
    await sendMessage(text);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            {t('sharedWorkspace.chat.title') || 'Trò chuyện trực tiếp'}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {messages.length} {t('sharedWorkspace.chat.messagesCount') || 'tin nhắn'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[300px] max-h-[460px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30 text-primary" />
            <p className="text-xs font-medium">Chưa có tin nhắn nào</p>
            <p className="text-[11px] opacity-70">Hãy gửi lời chào tới mọi người trong phòng!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex items-center justify-center my-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/50 text-[10px] text-muted-foreground">
                    <Bell className="h-3 w-3 text-amber-500" />
                    <span>{msg.content}</span>
                    <span className="text-[9px] opacity-60">({formatTime(msg.createdAt)})</span>
                  </div>
                </div>
              );
            }

            const isMe = msg.userId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Sender Avatar */}
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden shadow-sm">
                  {msg.senderAvatar ? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    msg.senderName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[80%] space-y-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                    <span className="font-semibold text-foreground/80">{msg.senderName}</span>
                    <span>{formatTime(msg.createdAt)}</span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-border/60 bg-muted/20 flex gap-2">
        <Input
          type="text"
          placeholder={t('sharedWorkspace.chat.placeholder') || 'Nhập tin nhắn...'}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="text-xs h-9 bg-card"
        />
        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="h-9 px-3 shrink-0"
          disabled={!inputMessage.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
};
