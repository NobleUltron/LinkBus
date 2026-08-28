import React, { useEffect, useState } from 'react';
import {
  AwardIcon,
  CheckCircle2Icon,
  FileBadgeIcon,
  KeyIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextField, SelectField, TextAreaField } from '../ui/Field';
import { InlineError } from '../ui/States';
import { driversApi } from '../../services/crud';
import type { Bus, Driver, User } from '../../types/models';

interface DriverModalProps {
  open: boolean;
  driver: Driver | null;
  users: User[];
  buses?: Bus[];
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions = [
  { value: 'active', label: 'Active on Duty' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
];

export function DriverModal({
  open,
  driver,
  users,
  buses = [],
  onClose,
  onSaved,
}: DriverModalProps) {
  const isEditing = Boolean(driver);

  // Account Mode: 'new' = register new user credentials, 'existing' = link existing user account
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Driver details
  const [assignedBusId, setAssignedBusId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [experienceYears, setExperienceYears] = useState(3);
  const [status, setStatus] = useState<Driver['status']>('active');
  const [notes, setNotes] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter existing staff users that are eligible to link
  const staffUsers = users.filter((u) => u.is_active !== false);

  useEffect(() => {
    if (open) {
      setError(null);
      if (driver) {
        setMode('existing');
        setUserId(String(driver.user_id));
        setName(driver.name || '');
        setEmail(driver.email || '');
        setPhone(driver.phone || '');
        setPassword('');
        setAssignedBusId(driver.assigned_bus_id ? String(driver.assigned_bus_id) : '');
        setLicenseNumber(driver.license_number || '');
        setLicenseExpiry(driver.license_expiry ? driver.license_expiry.split('T')[0] : '');
        setExperienceYears(driver.experience_years ?? 3);
        setStatus(driver.status || 'active');
        setNotes(driver.notes || '');
      } else {
        setMode('new');
        setUserId(staffUsers[0] ? String(staffUsers[0].id) : '');
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setAssignedBusId('');
        setLicenseNumber('');
        setLicenseExpiry('');
        setExperienceYears(3);
        setStatus('active');
        setNotes('');
      }
    }
  }, [open, driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!licenseNumber.trim()) {
      setError('Driving permit / licence number is required.');
      return;
    }
    if (!licenseExpiry) {
      setError('Permit expiry date is required.');
      return;
    }

    if (!isEditing) {
      if (mode === 'new') {
        if (!name.trim()) {
          setError('Driver full name is required.');
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setError('A valid email address is required.');
          return;
        }
      } else {
        if (!userId) {
          setError('Please select an existing staff account to link.');
          return;
        }
      }
    }

    try {
      setPending(true);

      if (isEditing && driver) {
        await driversApi.update(driver.id, {
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          assigned_bus_id: assignedBusId ? Number(assignedBusId) : null,
          license_number: licenseNumber.trim(),
          license_expiry: licenseExpiry,
          experience_years: Number(experienceYears) || 0,
          status,
          notes: notes.trim() || undefined,
        });
        toast.success('Driver profile updated successfully');
      } else {
        if (mode === 'new') {
          await driversApi.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            password: password.trim() || undefined,
            assigned_bus_id: assignedBusId ? Number(assignedBusId) : null,
            license_number: licenseNumber.trim(),
            license_expiry: licenseExpiry,
            experience_years: Number(experienceYears) || 0,
            status,
            notes: notes.trim() || undefined,
          });
          toast.success('New driver account & certificate profile created');
        } else {
          await driversApi.create({
            user_id: Number(userId),
            assigned_bus_id: assignedBusId ? Number(assignedBusId) : null,
            license_number: licenseNumber.trim(),
            license_expiry: licenseExpiry,
            experience_years: Number(experienceYears) || 0,
            status,
            notes: notes.trim() || undefined,
          });
          toast.success('Driver profile linked to existing staff account');
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save driver record.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Driver Record' : 'Register Intercity Coach Driver'}
      subtitle={
        isEditing
          ? `Licence #${driver?.license_number}`
          : 'Create new driver login credentials or link an existing staff profile'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && <InlineError message={error} />}

        {/* ── Mode Selection (Only shown when creating a new driver) ── */}
        {!isEditing && (
          <div className="space-y-2 rounded-2xl bg-surface-2/60 border border-line p-4">
            <label className="block text-xs font-black uppercase tracking-wider text-muted">
              Driver Account Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMode('new');
                  setError(null);
                }}
                className={`flex items-start gap-3 rounded-xl p-3 text-left transition-all border ${
                  mode === 'new'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-surface border-line text-muted hover:border-line-hover hover:text-fg'
                }`}
              >
                <div className="mt-0.5 rounded-lg bg-emerald-700/10 p-1.5 text-emerald-700 dark:text-emerald-400">
                  <UserPlusIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-fg">Register New Account</p>
                  <p className="text-[0.6875rem] text-muted leading-relaxed">
                    Create new login email and credentials for a new captain.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('existing');
                  setError(null);
                }}
                className={`flex items-start gap-3 rounded-xl p-3 text-left transition-all border ${
                  mode === 'existing'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-surface border-line text-muted hover:border-line-hover hover:text-fg'
                }`}
              >
                <div className="mt-0.5 rounded-lg bg-emerald-700/10 p-1.5 text-emerald-700 dark:text-emerald-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-fg">Link Existing Staff</p>
                  <p className="text-[0.6875rem] text-muted leading-relaxed">
                    Select an existing staff user and assign them driver certification.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Section 1: User Account Credentials ── */}
        <div className="space-y-4 rounded-2xl bg-surface p-4 border border-line">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-fg border-b border-line pb-2">
            <UserIcon className="h-3.5 w-3.5 text-brand-600" />
            <span>Captain Personal & Login Details</span>
          </div>

          {!isEditing && mode === 'existing' ? (
            <div>
              <SelectField
                label="Select Staff Member"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                options={staffUsers.map((u) => ({
                  value: String(u.id),
                  label: `${u.name} (${u.email}) ${u.phone ? `· ${u.phone}` : ''}`,
                }))}
                hint="Only registered staff members appear in this list."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Full Name"
                required
                placeholder="e.g. Mugerwa Joshua"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                label="Email Address"
                type="email"
                required={!isEditing}
                placeholder="e.g. m.joshua@linkbus.co.ug"
                value={email}
                disabled={isEditing}
                onChange={(e) => setEmail(e.target.value)}
                hint={isEditing ? 'Email cannot be changed after creation' : undefined}
              />

              <TextField
                label="Phone Number"
                type="tel"
                placeholder="e.g. +256 701 234 567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {!isEditing && (
                <TextField
                  label="Initial Password"
                  type="password"
                  placeholder="Leave empty for default (linkbus@driver)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: Licence & Certification Details ── */}
        <div className="space-y-4 rounded-2xl bg-surface p-4 border border-line">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-fg border-b border-line pb-2">
            <FileBadgeIcon className="h-3.5 w-3.5 text-brand-600" />
            <span>Permit, Experience & Availability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Driving Permit / Licence #"
              required
              placeholder="e.g. UG-DL-094432"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />

            <TextField
              label="Permit Expiry Date"
              type="date"
              required
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
            />

            <TextField
              label="Years of Commercial Coach Experience"
              type="number"
              min={0}
              required
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />

            <SelectField
              label="Availability & Duty Status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as Driver['status'])}
              options={statusOptions}
            />

            <div className="sm:col-span-2">
              <SelectField
                label="Permanently Assigned Primary Coach"
                value={assignedBusId}
                onChange={(e) => setAssignedBusId(e.target.value)}
                options={[
                  { value: '', label: '— No Assigned Coach (Spare Driver) —' },
                  ...buses.map((b) => {
                    const isTaken = b.assigned_driver && (!driver || b.assigned_driver.id !== driver.id);
                    return {
                      value: String(b.id),
                      label: `${b.plate_number} (${b.model} · ${b.capacity} Seats · ${b.bus_type.toUpperCase()})${
                        isTaken ? ` [Currently Assigned: ${b.assigned_driver?.name}]` : ''
                      }`,
                    };
                  }),
                ]}
                hint="Mandatory LinkBus Business Rule: Each active driver is permanently paired to one primary coach."
              />
            </div>

            <div className="sm:col-span-2">
              <TextAreaField
                label="Route Specializations & Medical Notes"
                rows={2}
                placeholder="e.g. Kampala-Gulu corridor specialist. Class CM heavy commercial endorsement."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Modal Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEditing ? 'Save Changes' : mode === 'new' ? 'Register Driver Account' : 'Link & Certify Driver'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
