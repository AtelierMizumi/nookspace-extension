import React from 'react';
import { Settings, ShieldCheck, Database, LogOut, Cloud } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export const AccountSettingsModal: React.FC = () => {
  const {
    activeModal,
    user,
    profile,
    signOut,
    closeModals,
  } = useAuthStore();
  const { t } = useTranslation();

  const isOpen = activeModal === 'settings';

  const handleSignOut = async () => {
    await signOut();
    closeModals();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModals}
      size="md"
      ariaLabel={t('account.settings')}
      title={
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Settings className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold text-foreground">
            {t('account.settings')}
          </span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Account Details Box */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t('account.accountInformation')}</span>
            <Badge variant="outline" size="sm" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              {t('account.active')}
            </Badge>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">{t('account.emailAddress')}</span>
              <span className="font-medium text-foreground">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">{t('account.displayName')}</span>
              <span className="font-medium text-foreground">{profile?.displayName || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">{t('account.userId')}</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">{user?.id || '—'}</span>
            </div>
          </div>
        </div>

        {/* Operating Modes Architecture Explanation */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('account.operatingModesTitle')}
          </span>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-card border border-border/50 text-xs">
              <Database className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">{t('account.personalModeTitle')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  {t('account.personalModeDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-card border border-border/50 text-xs">
              <Cloud className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">{t('account.sharedModeTitle')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  {t('account.sharedModeDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 flex items-center justify-between border-t border-border/50">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            {t('auth.signOut')}
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={closeModals}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
