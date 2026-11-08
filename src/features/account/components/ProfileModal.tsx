import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Mail, Calendar, Globe, Check, AlertCircle, Camera, Trash2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { avatarStorageService } from '../services/avatarStorageService';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { updateProfileSchema } from '../validation/authValidation';

export const ProfileModal: React.FC = () => {
  const {
    activeModal,
    profile,
    user,
    isLoading,
    error,
    updateProfile,
    closeModals,
    clearError,
  } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();

  const isOpen = activeModal === 'profile';

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>('vi');
  const [successNotice, setSuccessNotice] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarError(null);
    const validation = avatarStorageService.validateFile(file);
    if (!validation.valid) {
      setAvatarError(t(validation.error || 'account.avatar.errorGeneric'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const publicUrl = await avatarStorageService.uploadAvatar(user.id, file);
      await updateProfile({ avatarUrl: publicUrl });
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 3000);
    } catch (err: any) {
      setAvatarError(err?.message || t('account.avatar.errorGeneric'));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      await updateProfile({ avatarUrl: null });
    } catch (err: any) {
      setAvatarError(err?.message || t('account.avatar.errorGeneric'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile?.displayName || user?.user_metadata?.display_name || '');
      setBio(profile?.bio || '');
      setSelectedLanguage(profile?.language || (language as 'vi' | 'en') || 'vi');
      setSuccessNotice(false);
      setFieldErrors({});
      clearError();
    }
  }, [isOpen, profile, user, language]);

  const handleClose = useCallback(() => {
    closeModals();
  }, [closeModals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessNotice(false);
    setFieldErrors({});
    clearError();

    const result = updateProfileSchema.safeParse({
      displayName: displayName.trim() || null,
      bio: bio.trim() || null,
      language: selectedLanguage,
    });

    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        errMap[path] = issue.message;
      }
      setFieldErrors(errMap);
      return;
    }

    const ok = await updateProfile({
      displayName: displayName.trim() || null,
      bio: bio.trim() || null,
      language: selectedLanguage,
    });

    if (ok) {
      setSuccessNotice(true);
      if (selectedLanguage !== language) {
        await setLanguage(selectedLanguage);
      }
      setTimeout(() => {
        setSuccessNotice(false);
      }, 3000);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const initial = ((displayName || user?.email || 'U').charAt(0)).toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      ariaLabel={t('account.myProfile')}
      title={
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <User className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold text-foreground">
            {t('account.myProfile')}
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Success message */}
        {successNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{t('account.profileUpdated')}</span>
          </div>
        )}

        {/* Error message */}
        {(error || avatarError) && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{avatarError || error}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarFileChange}
        />

        {/* Avatar Monogram Banner with Upload Trigger */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-card border border-border/60">
          <div className="relative group shrink-0">
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl select-none shadow-sm overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold truncate text-foreground">
                  {displayName || t('account.anonymous')}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Avatar Action Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/70 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5 text-primary" />
                <span>{t('account.avatar.changeAvatar')}</span>
              </button>

              {profile?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar || isLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title={t('account.avatar.removeAvatar')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t('common.delete')}</span>
                </button>
              )}
            </div>

            {memberSince && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                <Calendar className="h-3 w-3" />
                <span>{t('account.memberSince')}: {memberSince}</span>
              </div>
            )}
          </div>
        </div>

        {/* Display Name Input */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            {t('account.displayName')}
          </label>
          <Input
            type="text"
            placeholder={t('account.displayNamePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            leftIcon={<User className="h-4 w-4 text-muted-foreground" />}
            error={fieldErrors.displayName}
            disabled={isLoading}
          />
        </div>

        {/* Email Read-only */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            {t('account.emailAddress')}
          </label>
          <Input
            type="email"
            value={user?.email || ''}
            disabled
            leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {t('account.emailReadonlyNotice')}
          </p>
        </div>

        {/* Bio Textarea */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            {t('account.bio')}
          </label>
          <Textarea
            placeholder={t('account.bioPlaceholder')}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          {fieldErrors.bio && (
            <p className="text-xs text-destructive mt-1">{fieldErrors.bio}</p>
          )}
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t('account.preferredLanguage')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedLanguage('vi')}
              className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                selectedLanguage === 'vi'
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border/60 hover:bg-muted text-foreground'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('en')}
              className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                selectedLanguage === 'en'
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border/60 hover:bg-muted text-foreground'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
