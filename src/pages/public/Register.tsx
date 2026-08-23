import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TicketIcon,
  UserIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Brand';
import { InlineError } from '../../components/ui/States';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { landingPathForRole, useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../hooks/useAsync';
import { loginWithGoogle, socialLogin } from '../../services/auth';
import { HERO_IMAGE } from '../../data/content';

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  agreeTerms: boolean;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  agreeTerms: true,
};

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: 'bg-slate-300 dark:bg-slate-700' };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}

function validateField(field: keyof FormState, form: FormState): string | undefined {
  const value = form[field];
  if (field === 'agreeTerms') {
    if (!form.agreeTerms) return 'You must agree to the Terms of Service to create an account.';
    return undefined;
  }
  if (typeof value === 'string' && !value.trim()) return 'This field is required.';
  if (field === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address.';
  }
  if (field === 'phone' && typeof value === 'string' && value.replace(/\D/g, '').length < 9) {
    return 'Enter a valid phone number (e.g. +256 700 000 000).';
  }
  if (field === 'password' && typeof value === 'string' && value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (field === 'password_confirmation' && value !== form.password) {
    return 'Passwords do not match.';
  }
  return undefined;
}

export function Register() {
  const { register, completeSession } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [socialPending, setSocialPending] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(form.password);

  const set = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = field === 'agreeTerms' ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [field]: val,
    }));
  };

  const blur = (field: keyof FormState) => () => {
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, form),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const message = validateField(field, form);
      if (message) next[field] = message;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    setError(null);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      toast.success(`Account created successfully! Welcome to LinkBus, ${user.name}.`);
      navigate(landingPathForRole(user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
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
      toast.success(`Account created with Google! Welcome, ${res.user.name}.`);
      navigate(landingPathForRole(res.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSocialPending(null);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    setSocialPending(provider);
    setError(null);
    try {
      const defaultEmail = provider === 'google' ? 'google.traveler@linkbus.co.ug' : 'apple.traveler@linkbus.co.ug';
      const defaultName = provider === 'google' ? 'Google Traveler' : 'Apple Traveler';

      const res = await socialLogin({
        email: defaultEmail,
        name: defaultName,
        provider,
      });

      completeSession(res.token, res.user);
      toast.success(`Account created with ${provider === 'google' ? 'Google' : 'Apple'}!`);
      navigate(landingPathForRole(res.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSocialPending(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface text-fg selection:bg-brand-500/20 lg:grid lg:grid-cols-[1.1fr_1.2fr]">
      
      {/* ── Ambient Background Lighting Orbs ── */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/15" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/10" />

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT COLUMN: REGISTRATION CONTAINER
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

        {/* Central Registration Form Wrapper */}
        <main className="mx-auto my-auto w-full max-w-[440px] py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Header Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-[0.6875rem] font-bold text-brand-700 dark:text-brand-300 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Passenger Rewards & Fast Checkout</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-fg">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-muted">
                Save your traveller details, lock seat reservations, and manage all your digital boarding passes in one place.
              </p>
            </div>

            {/* ─── Social / Google SSO Fast Sign Up ─── */}
            <div className="pt-1 flex flex-col items-center justify-center">
              <div className="w-full flex justify-center overflow-hidden rounded-xl">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google Sign-In failed or popup was closed.')}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="signup_with"
                  width="400"
                />
              </div>
            </div>

            {/* Clean Horizontal Divider */}
            <div className="relative flex items-center justify-center gap-3 py-1">
              <div className="h-px flex-1 bg-line" />
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted/80">
                Or register with email
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            {/* Registration Form */}
            <form onSubmit={submit} noValidate className="space-y-3.5">
              {error && <InlineError message={error} />}

              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="register-name" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Mugerwa Joshua"
                    value={form.name}
                    onBlur={blur('name')}
                    onChange={set('name')}
                    className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                      errors.name
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-xs font-medium text-red-500">{errors.name}</p>}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="register-email" className="block text-xs font-bold uppercase tracking-wider text-muted">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <MailIcon className="h-4 w-4" />
                    </div>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@gmail.com"
                      value={form.email}
                      onBlur={blur('email')}
                      onChange={set('email')}
                      className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs font-medium text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label htmlFor="register-phone" className="block text-xs font-bold uppercase tracking-wider text-muted">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <PhoneIcon className="h-4 w-4" />
                    </div>
                    <input
                      id="register-phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      placeholder="+256 700 000 000"
                      value={form.phone}
                      onBlur={blur('phone')}
                      onChange={set('phone')}
                      className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                        errors.phone
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs font-medium text-red-500">{errors.phone}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="register-password" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <LockIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="At least 8 characters"
                    value={form.password}
                    onBlur={blur('password')}
                    onChange={set('password')}
                    className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-11 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                      errors.password
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
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {form.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[0.6875rem]">
                      <span className="text-muted">Password strength:</span>
                      <span className="font-bold text-fg">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-colors ${
                            passwordStrength.score >= step ? passwordStrength.color : 'bg-line'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {errors.password && <p className="text-xs font-medium text-red-500">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label htmlFor="register-password-confirm" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <LockIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="register-password-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Repeat password"
                    value={form.password_confirmation}
                    onBlur={blur('password_confirmation')}
                    onChange={set('password_confirmation')}
                    className={`block w-full rounded-xl border bg-surface/80 pl-10 pr-11 py-2.5 text-sm text-fg placeholder:text-muted/60 backdrop-blur-md transition-all focus:outline-none focus:ring-2 ${
                      errors.password_confirmation
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : form.password_confirmation && form.password_confirmation === form.password
                        ? 'border-emerald-500/60 focus:border-emerald-600 focus:ring-emerald-600/20'
                        : 'border-line hover:border-line-hover focus:border-brand-600 focus:ring-brand-600/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted transition-colors hover:text-fg focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-xs font-medium text-red-500">{errors.password_confirmation}</p>
                )}
              </div>

              {/* Agree to Terms */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={set('agreeTerms')}
                  className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                />
                <label htmlFor="agree-terms" className="text-xs text-muted font-medium cursor-pointer select-none">
                  I agree to the LinkBus{' '}
                  <Link to="/terms" className="text-brand-600 hover:text-brand-700 dark:text-brand-400 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-brand-600 hover:text-brand-700 dark:text-brand-400 underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
              {errors.agreeTerms && <p className="text-xs font-medium text-red-500">{errors.agreeTerms}</p>}

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  block
                  size="lg"
                  loading={pending}
                  icon={<UserPlusIcon className="h-4 w-4" />}
                  className="shadow-lg shadow-brand-700/20 active:scale-[0.99] transition-transform font-bold"
                >
                  Create Passenger Account
                </Button>
              </div>
            </form>

            {/* Back to Sign In Link */}
            <p className="text-center text-xs text-muted pt-1">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
              >
                Sign in instead
              </Link>
            </p>
          </motion.div>
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
          RIGHT COLUMN: IMMERSIVE HERO & PASSENGER BENEFITS
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between p-12">
        
        {/* Background Image with Dark Mesh Vignette */}
        <img
          src={HERO_IMAGE}
          alt="LinkBus Intercity Fleet"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
        <div className="absolute inset-0 bg-brand-950/20 mix-blend-multiply" />

        {/* Top Floating Highlight Chips */}
        <div className="relative z-10 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl">
            <TicketIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span>Instant Mobile QR Boarding</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl">
            <SparklesIcon className="h-3.5 w-3.5 text-amber-400" />
            <span>Zero Booking Convenience Fees</span>
          </div>
        </div>

        {/* Bottom Passenger Benefits Glass Card */}
        <div className="relative z-10 max-w-lg space-y-6">
          
          {/* Glass Card */}
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-2xl transition-all hover:border-white/30">
            <div className="flex items-center gap-2 pb-3 border-b border-white/15">
              <SparklesIcon className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Member Passenger Privileges
              </h3>
            </div>

            <ul className="mt-4 space-y-3.5 text-sm text-slate-100 font-medium">
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                </div>
                <span>
                  <strong className="text-white font-bold">Interactive Seat Picker</strong> — Choose your exact window or aisle seat on the live 2D coach diagram.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                </div>
                <span>
                  <strong className="text-white font-bold">10-Minute Seat Lock</strong> — Seats are securely held exclusively for you during checkout.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                </div>
                <span>
                  <strong className="text-white font-bold">Mobile Money & Card Payments</strong> — Instant confirmation via MTN MoMo, Airtel Money, or Visa/Mastercard.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                </div>
                <span>
                  <strong className="text-white font-bold">Digital Wallet & Receipts</strong> — Access all past boarding passes and tax invoices in one dashboard.
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Platform Security Guarantee */}
          <div className="flex items-center gap-6 text-xs font-medium text-white/70 px-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
              <span>TLS 1.3 Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 text-emerald-400" />
              <span>PCI-DSS Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
              <span>2FA Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}