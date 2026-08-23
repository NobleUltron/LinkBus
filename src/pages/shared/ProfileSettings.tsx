import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BadgeCheckIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  SaveIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  Trash2Icon,
  TruckIcon,
  UploadIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { InlineError } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../hooks/useAsync';
import { changePassword, toggleTwoFactor, updateProfile } from '../../services/auth';
import { formatDate, getAvatarUrl, initials, titleCase } from '../../utils/format';

export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const isDriver =
    user?.role === 'driver' ||
    Boolean(user?.driver) ||
    location.pathname.startsWith('/driver');

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    avatar: user?.avatar ?? (null as string | null),
  });

  const [driverInfo, setDriverInfo] = useState({
    license_number: user?.driver?.license_number ?? 'UG-DL-' + (user?.id ? `202${user.id % 5}-00${user.id}` : '2024-001'),
    license_expiry: user?.driver?.license_expiry ?? new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
    experience_years: user?.driver?.experience_years ?? 5,
    driver_notes: user?.driver?.notes ?? '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA state
  const [toggling2fa, setToggling2fa] = useState(false);

  React.useEffect(() => {
    if (user) {
      setProfile({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        avatar: user.avatar ?? null,
      });
      setDriverInfo({
        license_number: user.driver?.license_number ?? 'UG-DL-' + (user.id ? `202${user.id % 5}-00${user.id}` : '2024-001'),
        license_expiry: user.driver?.license_expiry ?? new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
        experience_years: user.driver?.experience_years ?? 5,
        driver_notes: user.driver?.notes ?? '',
      });
    }
  }, [user]);

  if (!user) return null;

  const pickAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8_000_000) {
      setProfileError('Choose an image under 8MB.');
      return;
    }
    setProfileError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setProfile((current) => ({
            ...current,
            avatar: compressed,
          }));
        } else {
          setProfile((current) => ({
            ...current,
            avatar: String(reader.result),
          }));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    // Allow re-picking same file if desired
    event.target.value = '';
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!profile.name.trim()) errors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Enter a valid email address.';
    if (profile.phone.replace(/\D/g, '').length < 9) errors.phone = 'Enter a valid phone number.';
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const payload = {
        ...profile,
        ...(isDriver
          ? {
              license_number: driverInfo.license_number,
              license_expiry: driverInfo.license_expiry,
              experience_years: Number(driverInfo.experience_years),
              driver_notes: driverInfo.driver_notes,
            }
          : {}),
      };
      const updated = await updateProfile(user.id, payload);
      updateUser(updated);
      toast.success(isDriver ? 'Profile and driving licence updated' : 'Profile updated');
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const expiryDate = driverInfo.license_expiry ? new Date(driverInfo.license_expiry) : null;
  const now = new Date();
  const daysRemaining =
    expiryDate && !isNaN(expiryDate.getTime())
      ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!passwords.current_password) errors.current_password = 'Enter your current password.';
    if (passwords.password.length < 8) errors.password = 'Use at least 8 characters.';
    if (passwords.password !== passwords.password_confirmation)
      errors.password_confirmation = 'This does not match the new password.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await changePassword(passwords);
      setPasswords({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      toast.success('Password changed');
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggle2fa = async () => {
    const nextState = !user.two_factor_enabled;
    setToggling2fa(true);
    try {
      const res = await toggleTwoFactor(nextState);
      updateUser(res.user);
      if (res.two_factor_enabled) {
        toast.success('Two-Factor Authentication is now enabled!');
      } else {
        toast.success('Two-Factor Authentication has been disabled.');
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling2fa(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Your details" subtitle="Shown on tickets, receipts and manifests.">
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            {profileError && <InlineError message={profileError} />}

            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm relative shrink-0">
                <span className="select-none font-bold">
                  {initials(profile.name || user.name)}
                </span>
                {profile.avatar ? (
                  <img
                    src={getAvatarUrl(profile.avatar)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
              </span>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<UploadIcon className="h-4 w-4" />}
                    onClick={() => fileRef.current?.click()}
                  >
                    Upload photo
                  </Button>
                  {profile.avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                      icon={<Trash2Icon className="h-4 w-4" />}
                      onClick={() => setProfile((cur) => ({ ...cur, avatar: null }))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted">PNG or JPG, up to 8MB.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="profile-name"
                label="Full name"
                required
                value={profile.name}
                error={profileErrors.name}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    name: event.target.value,
                  })
                }
              />
              <TextField
                id="profile-phone"
                label="Phone number"
                type="tel"
                required
                value={profile.phone}
                error={profileErrors.phone}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    phone: event.target.value,
                  })
                }
              />
              <TextField
                id="profile-email"
                className="sm:col-span-2"
                label="Email address"
                type="email"
                required
                value={profile.email}
                error={profileErrors.email}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    email: event.target.value,
                  })
                }
              />
            </div>

            {/* ── Official Driving Licence & Credentials (for Drivers / Captains) ── */}
            {isDriver && (
              <div className="border-t border-line pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                      <TruckIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      Official Driving Licence & Credentials
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Ministry of Works & Transport / Uganda National Driving Permit details.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <BadgeCheckIcon className="h-3.5 w-3.5" />
                    Verified Captain
                  </span>
                </div>

                {/* Digital Permit Hologram Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 p-4 text-white shadow-md border border-slate-700">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <TruckIcon className="h-4 w-4 text-brand-400" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-300">
                        Republic of Uganda · Driving Permit
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.625rem] font-bold ${
                        daysRemaining < 0
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : daysRemaining <= 60
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {daysRemaining < 0
                        ? `🔴 Expired (${Math.abs(daysRemaining)}d ago)`
                        : daysRemaining <= 60
                        ? `⚠️ Renews in ${daysRemaining}d`
                        : `✅ Valid (${daysRemaining}d left)`}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3.5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-sm font-bold text-white shadow-inner relative">
                      <span className="select-none font-bold">
                        {initials(profile.name || user.name)}
                      </span>
                      {profile.avatar ? (
                        <img
                          src={getAvatarUrl(profile.avatar)}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                    </span>
                    <div>
                      <p className="font-extrabold text-sm tracking-wide text-white">{profile.name || user.name}</p>
                      <p className="font-mono text-xs font-bold text-brand-300 tracking-wider mt-0.5">
                        {driverInfo.license_number || 'UG-DL-PENDING'}
                      </p>
                      <p className="text-[0.625rem] text-slate-400 mt-0.5">
                        Expires:{' '}
                        <strong className="text-white">
                          {driverInfo.license_expiry ? formatDate(driverInfo.license_expiry) : '—'}
                        </strong>{' '}
                        · {driverInfo.experience_years} Yrs Experience
                      </p>
                    </div>
                  </div>

                  {/* Endorsement Classes Chips */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[0.625rem]">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono font-bold text-white">Class DE</span>
                      <span className="text-slate-300">Heavy Omnibus</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono font-bold text-white">Class CM</span>
                      <span className="text-slate-300">Commercial Bus</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2Icon className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-300">Medical Cleared</span>
                    </div>
                  </div>
                </div>

                {/* Form Inputs for Driver Licence */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    id="driver-license"
                    label="Permit / Licence Number"
                    required
                    value={driverInfo.license_number}
                    onChange={(e) => setDriverInfo({ ...driverInfo, license_number: e.target.value })}
                    placeholder="e.g. UG-DL-2024-001"
                  />
                  <TextField
                    id="driver-expiry"
                    label="Licence Expiry Date"
                    type="date"
                    required
                    value={driverInfo.license_expiry}
                    onChange={(e) => setDriverInfo({ ...driverInfo, license_expiry: e.target.value })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    id="driver-exp"
                    label="Driving Experience (Years)"
                    type="number"
                    min={0}
                    max={60}
                    value={driverInfo.experience_years}
                    onChange={(e) => setDriverInfo({ ...driverInfo, experience_years: Number(e.target.value) })}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1.5">Fleet Duty Status</label>
                    <div className="flex items-center h-10 px-3 rounded-xl border border-line bg-surface-2/60 text-xs font-bold text-fg">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                      {titleCase(user?.driver?.status || 'active')} (Active On Duty)
                    </div>
                  </div>
                </div>

                <TextField
                  id="driver-notes"
                  label="Emergency Next-of-Kin Contact & Medical Notes"
                  value={driverInfo.driver_notes}
                  onChange={(e) => setDriverInfo({ ...driverInfo, driver_notes: e.target.value })}
                  placeholder="e.g. Next of Kin: Jane Okello (+256 772 123 456), Blood Group O+"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <p className="text-xs text-muted">
                Signed in as <span className="font-semibold text-fg">{titleCase(user.role)}</span>
              </p>
              <Button type="submit" loading={savingProfile} icon={<SaveIcon className="h-4 w-4" />}>
                Save changes
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Password" subtitle="Use at least 8 characters.">
          <form onSubmit={savePassword} noValidate className="space-y-4">
            {passwordError && <InlineError message={passwordError} />}

            <TextField
              id="password-current"
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              value={passwords.current_password}
              error={passwordErrors.current_password}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  current_password: event.target.value,
                })
              }
            />
            <TextField
              id="password-new"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              value={passwords.password}
              error={passwordErrors.password}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  password: event.target.value,
                })
              }
            />
            <TextField
              id="password-confirm"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              value={passwords.password_confirmation}
              error={passwordErrors.password_confirmation}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  password_confirmation: event.target.value,
                })
              }
            />

            <Button type="submit" block loading={savingPassword} icon={<KeyRoundIcon className="h-4 w-4" />}>
              Change password
            </Button>
          </form>
        </Panel>
      </div>

      {/* ── Two-Factor Authentication Security Card ── */}
      <Panel
        title="Two-Factor Authentication (2FA)"
        subtitle="Add an extra layer of security to prevent unauthorized access to your account."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                user.two_factor_enabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface-2 text-muted'
              }`}
            >
              {user.two_factor_enabled ? (
                <ShieldCheckIcon className="h-5 w-5" />
              ) : (
                <ShieldOffIcon className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-fg">Email & SMS Security Verification</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    user.two_factor_enabled
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-surface-2 text-muted'
                  }`}
                >
                  {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted max-w-xl">
                When enabled, every login attempt will require entering a 6-digit one-time security code sent to your registered email address ({user.email}).
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={user.two_factor_enabled ? 'outline' : 'primary'}
            loading={toggling2fa}
            icon={user.two_factor_enabled ? <ShieldOffIcon className="h-4 w-4" /> : <ShieldCheckIcon className="h-4 w-4" />}
            onClick={handleToggle2fa}
          >
            {user.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}