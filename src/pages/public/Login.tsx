import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockIcon,
  MailIcon,
  NavigationIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Brand';
import { InlineError } from '../../components/ui/States';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { landingPathForRole, useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../hooks/useAsync';
import {
  demoAccounts,
  forgotPassword,
  getRememberedEmail,
  login as loginService,
  loginWithGoogle,
  resendTwoFactor,
  resetPassword,
  setRememberedEmail,
  socialLogin,
  verifyTwoFactor,
  type ForgotPasswordResponse,
  type TwoFactorChallengeResponse,
} from '../../services/auth';
import { HERO_IMAGE } from '../../data/content';

export function Login() {
  const { user, isAuthenticated, completeSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect straight to their dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(landingPathForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Google OAuth only works from whitelisted origins (localhost / production domain).
  // On local-network IPs (192.168.x.x etc.) it throws origin_mismatch — hide the button.
  const isGoogleAuthAllowed = (() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  })();

  // Login form state
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));
  const [pending, setPending] = useState(false);
  const [socialPending, setSocialPending] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // 2FA Challenge state
  const [challenge, setChallenge] = useState<TwoFactorChallengeResponse | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying2fa, setVerifying2fa] = useState(false);
  const [resending2fa, setResending2fa] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password / Password Reset State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<ForgotPasswordResponse | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  // Countdown timer for 2FA resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const signIn = async (nextEmail: string, nextPassword: string) => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await loginService({ email: nextEmail, password: nextPassword });

      // Save or remove remembered email
      setRememberedEmail(nextEmail, rememberMe);

      if (res.requires_2fa) {
        setChallenge(res);
        setTwoFactorCode('');
        setResendCooldown(30);
        toast.info('Security verification code dispatched to your email.');
        return;
      }

      completeSession(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name}!`);
      const targetPath = (from && from !== '/login' && from !== '/') ? from : landingPathForRole(res.user.role);
      navigate(targetPath, {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Enter your registered email address.';
    if (!password) next.password = 'Enter your account password.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    void signIn(email, password);
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('No credential received from Google.');
      return;
    }
    setSocialPending('google');
    setError(null);
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      completeSession(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate(from && from !== '/login' ? from : landingPathForRole(res.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSocialPending(null);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialPending(provider);
    setError(null);
    try {
      const defaultEmail = provider === 'google' ? 'google.user@linkbus.co.ug' : 'apple.user@linkbus.co.ug';
      const defaultName = provider === 'google' ? 'Google Traveler' : 'Apple Traveler';

      const res = await socialLogin({
        email: defaultEmail,
        name: defaultName,
        provider,
      });

      completeSession(res.token, res.user);
      toast.success(`Signed in with ${provider === 'google' ? 'Google' : 'Apple'}!`);
      navigate(from && from !== '/login' ? from : landingPathForRole(res.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSocialPending(null);
    }
  };

  const handleVerify2fa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    const cleanCode = twoFactorCode.trim();
    if (cleanCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setVerifying2fa(true);
    setError(null);
    try {
      const authRes = await verifyTwoFactor(challenge.challenge_token, cleanCode);
      completeSession(authRes.token, authRes.user);
      toast.success('Identity verified successfully!');
      navigate(from && from !== '/login' ? from : landingPathForRole(authRes.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setVerifying2fa(false);
    }
  };

  const handleResend2fa = async () => {
    if (!challenge || resendCooldown > 0) return;
    setResending2fa(true);
    setError(null);
    try {
      const res = await resendTwoFactor(challenge.challenge_token);
      toast.success(res.message);
      setResendCooldown(60);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setResending2fa(false);
    }
  };

  // ── Forgot Password Handlers ──
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your account email address.');
      return;
    }
    setResetPending(true);
    setResetError(null);
    try {
      const res = await forgotPassword(resetEmail.trim());
      setResetInfo(res);
      setResetStep('verify');
      toast.success('Password reset passcode sent!');
    } catch (err) {
      setResetError(errorMessage(err));
    } finally {
      setResetPending(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.trim().length !== 6) {
      setResetError('Please enter the 6-digit verification passcode.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetPending(true);
    setResetError(null);
    try {
      const authRes = await resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      completeSession(authRes.token, authRes.user);
      toast.success('Password reset successfully! You are now signed in.');
      setShowForgotPassword(false);
      navigate(landingPathForRole(authRes.user.role), { replace: true });
    } catch (err) {
      setResetError(errorMessage(err));
    } finally {
      setResetPending(false);
    }
  };

  const getRoleBadgeStyle = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('admin')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
    if (l.includes('staff') || l.includes('agent')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
    if (l.includes('driver')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface text-fg selection:bg-brand-500/20 lg:grid lg:grid-cols-[1.1fr_1.2fr]">
      
      {/* ── Ambient Background Lighting Orbs ── */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/15" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/10" />

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT COLUMN: AUTHENTICATION CONTAINER
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        
        {/* Top App Bar Header */}
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] focus:outline-none"
            aria-label="Link Bus Services home"
          >
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:flex"
            >
              <BusIcon className="h-3.5 w-3.5 text-brand-600" />
              <span>Explore Routes</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Central Sign In / Reset Form Wrapper */}
        <main className="mx-auto my-auto w-full max-w-[420px] py-8">
          <AnimatePresence mode="wait">
            
            {/* ─────────────────────────────────────────────────────────────
                VIEW 1: FORGOT PASSWORD FLOW
               ───────────────────────────────────────────────────────────── */}
            {showForgotPassword ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetStep('request');
                      setResetError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg mb-3 transition-colors"
                  >
                    <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Sign In
                  </button>
                  <h1 className="text-2xl font-black tracking-tight text-fg">
                    Reset Account Password
                  </h1>
                  <p className="mt-1 text-xs text-muted">
                    {resetStep === 'request'
                      ? 'Enter your registered email address to receive a secure 6-digit reset code.'
                      : 'Enter the 6-digit passcode sent to your contact and create your new password.'}
                  </p>
                </div>

                {resetError && <InlineError message={resetError} />}

                {resetStep === 'request' ? (
                  /* Step 1: Request OTP */
                  <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-muted">
                        Registered Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                          <MailIcon className="h-4 w-4" />
                        </div>
                        <input
                          id="reset-email"
                          type="email"
                          required
                          placeholder="e.g. name@linkbus.co.ug"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="block w-full rounded-xl border border-line bg-surface/80 pl-10 pr-4 py-3 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      block
                      size="lg"
                      loading={resetPending}
                      icon={<ArrowRightIcon className="h-4 w-4" />}
                      className="shadow-lg shadow-brand-700/20 font-bold"
                    >
                      Send 6-Digit Reset Passcode
                    </Button>
                  </form>
                ) : (
                  /* Step 2: Enter OTP & New Password */
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    {resetInfo && (
                      <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-xs text-muted">
                        Passcode sent to <strong className="text-fg">{resetInfo.email_masked}</strong>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="reset-code" className="block text-xs font-bold uppercase tracking-wider text-muted">
                        6-Digit Verification Passcode <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reset-code"
                        type="text"
                        maxLength={6}
                        required
                        placeholder="••••••"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="block w-full rounded-xl border-2 border-brand-500/40 bg-surface/90 px-4 py-2.5 text-center font-mono text-xl font-bold tracking-widest text-fg focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-muted">
                        New Password (Min. 8 characters) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                          <LockIcon className="h-4 w-4" />
                        </div>
                        <input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="block w-full rounded-xl border border-line bg-surface/80 pl-10 pr-11 py-3 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted hover:text-fg focus:outline-none"
                        >
                          {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-muted">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                          <LockIcon className="h-4 w-4" />
                        </div>
                        <input
                          id="confirm-password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full rounded-xl border border-line bg-surface/80 pl-10 pr-4 py-3 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      block
                      size="lg"
                      loading={resetPending}
                      icon={<CheckCircle2Icon className="h-4 w-4" />}
                      className="shadow-lg shadow-brand-700/20 font-bold"
                    >
                      Reset Password & Sign In
                    </Button>
                  </form>
                )}
              </motion.div>
            ) : !challenge ? (
              /* ─────────────────────────────────────────────────────────────
                  VIEW 2: STANDARD EMAIL & PASSWORD SIGN IN + SOCIAL SSO
                 ───────────────────────────────────────────────────────────── */
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-5"
              >
                {/* Header Badge & Title */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-[0.6875rem] font-bold text-brand-700 dark:text-brand-300 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Uganda Transit & Fleet Portal</span>
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-fg">
                    Welcome back
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Sign in to access your coach bookings, manifests, and system controls.
                  </p>
                </div>

                {/* ─── Social / Google SSO Fast Login (localhost only) ─── */}
                {isGoogleAuthAllowed && (
                  <>
                    <div className="pt-1 flex flex-col items-center justify-center">
                      <div className="w-full flex justify-center overflow-hidden rounded-xl">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => toast.error('Google Sign-In failed or popup was closed.')}
                          theme="outline"
                          size="large"
                          shape="rectangular"
                          text="continue_with"
                          width="380"
                        />
                      </div>
                    </div>

                    {/* Clean Horizontal Divider */}
                    <div className="relative flex items-center justify-center gap-3 py-1.5">
                      <div className="h-px flex-1 bg-line" />
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted/80">
                        Or continue with email
                      </span>
                      <div className="h-px flex-1 bg-line" />
                    </div>
                  </>
                )}

                {/* Form Elements */}
                <form onSubmit={submit} noValidate className="space-y-4">
                  {error && <InlineError message={error} />}

                  {/* Email Input Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-bold uppercase tracking-wider text-muted"
                    >
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <MailIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="e.g. name@linkbus.co.ug"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.email
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                        }`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs font-medium text-red-500">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Password Input Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-bold uppercase tracking-wider text-muted"
                      >
                        Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setShowForgotPassword(true);
                          setResetStep('request');
                          setResetError(null);
                        }}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <LockIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-11 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.password
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted transition-colors hover:text-fg focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs font-medium text-red-500">{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="text-xs text-muted font-medium cursor-pointer select-none">
                      Remember my email on this device
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1.5">
                    <Button
                      type="submit"
                      block
                      size="lg"
                      loading={pending}
                      icon={<ArrowRightIcon className="h-4 w-4" />}
                      className="shadow-lg shadow-brand-700/20 active:scale-[0.99] transition-transform font-bold"
                    >
                      Sign In to Platform
                    </Button>
                  </div>
                </form>

                {/* ─── Fast Demo Role Switcher ─── */}
                <div className="relative rounded-2xl border border-line/80 bg-surface-2/60 p-3.5 backdrop-blur-xl transition-all hover:border-line">
                  <div className="flex items-center justify-between pb-2 border-b border-line/60">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-fg">
                        Quick Demo Logins
                      </span>
                    </div>
                    <span className="text-[0.625rem] text-muted font-medium">1-Click Test Access</span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setEmail(account.email);
                          setPassword('password');
                          void signIn(account.email, 'password');
                        }}
                        className="group flex flex-col items-start rounded-xl border border-line/70 bg-surface/90 p-2 text-left transition-all duration-150 hover:border-brand-500/50 hover:bg-surface hover:shadow-md disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[0.625rem] font-bold ${getRoleBadgeStyle(account.label)}`}>
                            {account.label}
                          </span>
                          <ArrowRightIcon className="h-3 w-3 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                        </div>
                        <span className="mt-1 block w-full truncate font-mono text-[0.6875rem] text-muted group-hover:text-fg">
                          {account.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Registration Link */}
                <p className="text-center text-xs text-muted pt-0.5">
                  Don't have a passenger account yet?{' '}
                  <Link
                    to="/register"
                    className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </motion.div>
            ) : (
              /* ─────────────────────────────────────────────────────────────
                  VIEW 3: TWO-FACTOR AUTHENTICATION CHALLENGE FORM
                 ───────────────────────────────────────────────────────────── */
              <motion.div
                key="2fa-challenge"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* 2FA Animated Badge & Header */}
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 shadow-inner">
                    <span className="absolute inset-0 rounded-2xl bg-brand-500/20 animate-ping opacity-30" />
                    <ShieldCheckIcon className="h-7 w-7 text-brand-600 dark:text-brand-400 relative z-10" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-fg">
                      Two-Factor Security
                    </h1>
                    <p className="text-xs text-muted font-medium">
                      Secondary Verification Required
                    </p>
                  </div>
                </div>

                {/* Notification Banner */}
                <div className="rounded-2xl border border-line bg-surface-2/80 p-4 text-xs text-muted space-y-1 backdrop-blur-md">
                  <p>
                    A secure 6-digit OTP passcode has been dispatched to:
                  </p>
                  <p className="font-mono text-sm font-bold text-fg">
                    {challenge.email_masked}
                  </p>
                  {challenge.phone_masked && (
                    <p className="text-[0.6875rem] text-muted">
                      SMS backup sent to <strong className="text-fg">{challenge.phone_masked}</strong>
                    </p>
                  )}
                  <p className="text-[0.6875rem] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                    ⏱ Valid for 10 minutes
                  </p>
                </div>

                {/* OTP Input Form */}
                <form onSubmit={handleVerify2fa} className="space-y-5">
                  {error && <InlineError message={error} />}

                  <div className="space-y-2">
                    <label
                      htmlFor="2fa-code-input"
                      className="block text-center text-xs font-bold uppercase tracking-wider text-muted"
                    >
                      Enter 6-Digit Passcode
                    </label>
                    <input
                      id="2fa-code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      placeholder="••••••"
                      value={twoFactorCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setTwoFactorCode(val);
                      }}
                      className="block w-full rounded-2xl border-2 border-brand-500/40 bg-surface/90 px-4 py-3.5 text-center font-mono text-3xl font-black tracking-[0.4em] text-fg shadow-inner backdrop-blur-md transition-all focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    block
                    size="lg"
                    loading={verifying2fa}
                    disabled={twoFactorCode.trim().length !== 6}
                    icon={<KeyRoundIcon className="h-4 w-4" />}
                    className="font-bold shadow-lg shadow-brand-700/20"
                  >
                    Verify & Authenticate
                  </Button>
                </form>

                {/* Navigation and Resend Actions */}
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setChallenge(null);
                      setError(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-fg"
                  >
                    <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Login
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || resending2fa}
                    onClick={handleResend2fa}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
                  >
                    <RefreshCwIcon className={`h-3.5 w-3.5 ${resending2fa ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer info */}
        <footer className="flex items-center justify-between border-t border-line/60 pt-4 text-[0.6875rem] text-muted">
          <span>© {new Date().getFullYear()} Link Bus Services Ltd.</span>
          <div className="flex items-center gap-3">
            <Link to="/terms" className="hover:text-fg">Terms</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-fg">Privacy</Link>
            <span>·</span>
            <Link to="/contact" className="hover:text-fg">Support</Link>
          </div>
        </footer>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT COLUMN: IMMERSIVE HERO & BRAND EXPERIENCE
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between p-12">
        
        {/* Background Image with Dark Mesh Vignette */}
        <img
          src={HERO_IMAGE}
          alt="LinkBus Luxury Cruiser on the highway"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
        <div className="absolute inset-0 bg-brand-950/20 mix-blend-multiply" />

        {/* Top Floating Highlight Chips */}
        <div className="relative z-10 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>98.8% On-Time Departures</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl">
            <NavigationIcon className="h-3.5 w-3.5 text-brand-400" />
            <span>Real-Time Fleet GPS</span>
          </div>
        </div>

        {/* Bottom Testimonial Glass Card */}
        <div className="relative z-10 max-w-lg space-y-6">
          
          {/* Glass Testimonial Box */}
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-2xl transition-all hover:border-white/30">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <blockquote className="mt-3 text-base font-semibold leading-relaxed text-slate-100">
              “Boarding used to be a paper list and a torch. Now I open the manifest on my phone and know exactly who is missing before we pull out of the terminal.”
            </blockquote>

            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-md">
                  MO
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Moses Okello</h4>
                  <p className="text-xs text-white/70">Senior Highway Captain</p>
                </div>
              </div>

              <div className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.6875rem] font-bold text-emerald-300 border border-white/10">
                Kampala ➔ Fort Portal
              </div>
            </div>
          </div>

          {/* Quick Platform Security Guarantee */}
          <div className="flex items-center gap-6 text-xs font-medium text-white/70 px-2">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
              <span>TLS 1.3 Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
              <span>Instant Momo & Card Auth</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
              <span>2FA Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}