import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogIn,
  LogOut,
  Settings,
  Share2,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Tooltip } from '../../../components/ui/Tooltip';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { AccountSettingsModal } from './AccountSettingsModal';
import { SharedWorkspaceModal, useSharedWorkspaceStore } from '../../shared-workspace';

export const AccountMenu: React.FC = () => {
  const {
    status,
    user,
    profile,
    signOut,
    openAuthModal,
    openProfileModal,
    openSettingsModal,
  } = useAuthStore();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isAuthenticated = status === 'authenticated' && !!user;
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || t('account.anonymous');
  const email = user?.email || '';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  const handleSharedWorkspaceClick = () => {
    setIsOpen(false);
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    useSharedWorkspaceStore.getState().openModal();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {!isAuthenticated ? (
        <Tooltip content={t('auth.loginOrRegister')} position="bottom">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAuthModal('login')}
            aria-label={t('auth.signIn')}
            leftIcon={<LogIn className="h-3.5 w-3.5 text-primary" />}
            className="h-8 px-2 sm:px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
          >
            <span className="hidden sm:inline">{t('auth.signIn')}</span>
          </Button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border/60 bg-background/60 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label={t('account.profileMenu')}
        >
          <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] select-none">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <span className="text-xs font-medium max-w-[90px] truncate hidden md:inline text-foreground">
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      {/* Profile Dropdown */}
      {isOpen && isAuthenticated && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-lg backdrop-blur-md z-50 animate-in fade-in-0 zoom-in-95 focus:outline-none">
          {/* User info header */}
          <div className="px-2.5 py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs select-none shrink-0 shadow-sm">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-foreground">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openProfileModal();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t('account.myProfile')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSettingsModal();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t('account.settings')}</span>
            </button>

            <button
              type="button"
              onClick={handleSharedWorkspaceClick}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>{t('account.sharedWorkspace')}</span>
              </div>
              <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                {t('account.sharedMode')}
              </Badge>
            </button>
          </div>

          {/* Sign out */}
          <div className="pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('auth.signOut')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal />
      <ProfileModal />
      <AccountSettingsModal />
      <SharedWorkspaceModal />
    </div>
  );
};
