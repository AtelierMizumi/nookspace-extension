import React, { useState, useCallback } from 'react';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../../../services/i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation/authValidation';

export const AuthModal: React.FC = () => {
  const {
    activeModal,
    authView,
    isConfigured,
    isLoading,
    error,
    pendingEmail,
    signIn,
    signUp,
    resetPassword,
    closeModals,
    setAuthView,
    clearError,
  } = useAuthStore();
  const { t } = useTranslation();

  const isOpen = activeModal === 'auth';

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetFormState = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setFieldErrors({});
    clearError();
  }, [clearError]);

  const handleClose = useCallback(() => {
    resetFormState();
    closeModals();
  }, [resetFormState, closeModals]);

  const handleSwitchView = useCallback((view: typeof authView) => {
    resetFormState();
    setAuthView(view);
  }, [resetFormState, setAuthView]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    clearError();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        errMap[path] = issue.message;
      }
      setFieldErrors(errMap);
      return;
    }

    const success = await signIn({ email, password });
    if (success) {
      resetFormState();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    clearError();

    const result = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
      displayName: displayName || undefined,
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

    await signUp({
      email,
      password,
      confirmPassword,
      displayName: displayName || undefined,
    });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    clearError();

    const result = resetPasswordSchema.safeParse({ email });
    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        errMap[path] = issue.message;
      }
      setFieldErrors(errMap);
      return;
    }

    await resetPassword(email);
  };

  // Safe translation helper with fallback
  const getFieldErrorMessage = (key: string): string => {
    if (!key) return '';
    try {
      const translated = t(key);
      return translated !== key ? translated : key;
    } catch {
      return key;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      ariaLabel={t('auth.title')}
      title={
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <KeyRound className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold text-foreground">
            {authView === 'login' && t('auth.signInTitle')}
            {authView === 'register' && t('auth.signUpTitle')}
            {authView === 'forgot_password' && t('auth.forgotPasswordTitle')}
            {authView === 'verification_pending' && t('auth.verificationTitle')}
            {authView === 'reset_sent' && t('auth.resetSentTitle')}
          </span>
        </div>
      }
      description={
        authView === 'login' || authView === 'register'
          ? t('auth.dualModeSubtitle')
          : undefined
      }
    >
      <div className="space-y-4 pt-1">
        {/* Unconfigured Alert Banner */}
        {!isConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400 space-y-1.5">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t('auth.unconfiguredTitle')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t('auth.unconfiguredDesc')}
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{getFieldErrorMessage(error)}</span>
          </div>
        )}

        {/* View: LOGIN */}
        {authView === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.email ? getFieldErrorMessage(fieldErrors.email) : undefined}
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">
                  {t('auth.password')}
                </label>
                <button
                  type="button"
                  onClick={() => handleSwitchView('forgot_password')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {t('auth.forgotPasswordLink')}
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.password ? getFieldErrorMessage(fieldErrors.password) : undefined}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {t('auth.signIn')}
            </Button>

            <div className="text-center pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span>{t('auth.noAccount')} </span>
              <button
                type="button"
                onClick={() => handleSwitchView('register')}
                className="text-primary hover:underline font-semibold"
              >
                {t('auth.signUp')}
              </button>
            </div>
          </form>
        )}

        {/* View: REGISTER */}
        {authView === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.displayNameOptional')}
              </label>
              <Input
                type="text"
                placeholder="Nook Master"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                leftIcon={<User className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.displayName ? getFieldErrorMessage(fieldErrors.displayName) : undefined}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.email ? getFieldErrorMessage(fieldErrors.email) : undefined}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.password')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.password ? getFieldErrorMessage(fieldErrors.password) : undefined}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.confirmPassword')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.confirmPassword ? getFieldErrorMessage(fieldErrors.confirmPassword) : undefined}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {t('auth.signUp')}
            </Button>

            <div className="text-center pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span>{t('auth.alreadyHaveAccount')} </span>
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-primary hover:underline font-semibold"
              >
                {t('auth.signIn')}
              </button>
            </div>
          </form>
        )}

        {/* View: FORGOT PASSWORD */}
        {authView === 'forgot_password' && (
          <form onSubmit={handleResetSubmit} className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('auth.forgotPasswordDesc')}
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                error={fieldErrors.email ? getFieldErrorMessage(fieldErrors.email) : undefined}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {t('auth.sendResetLink')}
            </Button>

            <div className="text-center pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t('auth.backToSignIn')}</span>
              </button>
            </div>
          </form>
        )}

        {/* View: VERIFICATION PENDING */}
        {authView === 'verification_pending' && (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">{t('auth.checkYourEmail')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('auth.verificationSentTo')} <span className="font-semibold text-foreground">{pendingEmail}</span>
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                {t('auth.verificationHint')}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={() => handleSwitchView('login')}
            >
              {t('auth.backToSignIn')}
            </Button>
          </div>
        )}

        {/* View: RESET SENT */}
        {authView === 'reset_sent' && (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">{t('auth.resetEmailSent')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('auth.resetSentTo')} <span className="font-semibold text-foreground">{pendingEmail}</span>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={() => handleSwitchView('login')}
            >
              {t('auth.backToSignIn')}
            </Button>
          </div>
        )}

        {/* Return to Personal Workspace Safety Button */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {t('auth.continuePersonalWorkspace')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
