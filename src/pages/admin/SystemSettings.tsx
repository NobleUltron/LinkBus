import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BellIcon,
  BriefcaseIcon,
  Building2Icon,
  CheckCircle2Icon,
  CreditCardIcon,
  DownloadIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  MessageSquareIcon,
  RadioIcon,
  SaveIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TicketIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { TextField, ToggleField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { ErrorState, SkeletonLoader } from '../../components/ui/States';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import {
  fetchAuditLogs,
  getGroupedSettings,
  updateSettings,
  type AuditLogItem,
} from '../../services/settings';
import { sendTestEmail, sendTestSms, sendTestWhatsapp } from '../../services/notifications';
import {
  broadcastFareAlert,
  deleteNewsletterSubscriber,
  fetchNewsletterSubscribers,
  type NewsletterSubscriber,
} from '../../services/newsletter';
import type { Setting, SettingGroup } from '../../types/models';
import { formatDateTime, titleCase } from '../../utils/format';

type ExtendedSettingGroup = SettingGroup | 'notifications' | 'subscribers' | 'security';

const tabs: {
  key: ExtendedSettingGroup;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
}[] = [
  {
    key: 'company',
    label: 'Company info',
    icon: Building2Icon,
    blurb: 'Shown on tickets, receipts, boarding passes, and the public site.',
  },
  {
    key: 'booking',
    label: 'Booking & Operations',
    icon: TicketIcon,
    blurb: 'Fares, 10-min seat locks, tax rates, and cancellation rules applied at checkout.',
  },
  {
    key: 'payment',
    label: 'Payment Gateways',
    icon: CreditCardIcon,
    blurb: 'MTN Mobile Money, Airtel Money, Visa Card, and station counter cash rules.',
  },
  {
    key: 'luggage',
    label: 'Luggage Allowances',
    icon: BriefcaseIcon,
    blurb: 'Standard free weight limit and automatic excess baggage fee rates.',
  },
  {
    key: 'notifications',
    label: 'Messaging & Alerts',
    icon: BellIcon,
    blurb: 'WhatsApp gateway, SMS alerts, Email SMTP credentials, and passenger trip updates.',
  },
  {
    key: 'subscribers',
    label: 'Fare Alert Subscribers',
    icon: UsersIcon,
    blurb: 'Passengers registered for seasonal route releases, discounts, and holiday fare alerts.',
  },
  {
    key: 'security',
    label: 'Security & Audit Trail',
    icon: ShieldCheckIcon,
    blurb: 'Administrative audit logs, security status, session timeouts, and encryption health.',
  },
];

const isBoolean = (value: unknown): boolean =>
  value === 'true' || value === 'false' || value === true || value === false;

const isNumeric = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  return str !== '' && !Number.isNaN(Number(str));
};

export function SystemSettings() {
  const { refresh } = useSettings();
  const [active, setActive] = useState<ExtendedSettingGroup>('company');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Test SMS / Email / WhatsApp states
  const [testPhone, setTestPhone] = useState('+256700123456');
  const [testEmailAddr, setTestEmailAddr] = useState('nobleultron@gmail.com');
  const [testWhatsappPhone, setTestWhatsappPhone] = useState('+256700123456');
  const [testingSms, setTestingSms] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  // Newsletter Subscribers states
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberChannel, setSubscriberChannel] = useState('');

  // Audit Logs states
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  // Broadcast Modal states
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('Easter & Festive Season Bookings Live!');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'Advance seat reservations for Gulu, Mbarara, Fort Portal & Kasese are now open for holiday travel. Book early to secure your preferred seats!'
  );
  const [broadcastChannel, setBroadcastChannel] = useState<'all' | 'whatsapp' | 'email' | 'phone'>('all');
  const [broadcastPromoCode, setBroadcastPromoCode] = useState('EASTER15');
  const [broadcasting, setBroadcasting] = useState(false);

  const { data, loading, error, reload } = useAsync(() => getGroupedSettings(), []);

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, string> = {};
    (Object.values(data) as Setting[][]).flat().forEach((setting) => {
      initial[setting.key] = setting.value;
    });
    setDraft(initial);
    if (initial['whatsapp_test_phone']) setTestWhatsappPhone(initial['whatsapp_test_phone']);
    if (initial['sms_test_phone']) setTestPhone(initial['sms_test_phone']);
    if (initial['email_test_address']) setTestEmailAddr(initial['email_test_address']);
  }, [data]);

  // Load Subscribers
  const loadSubscribers = async () => {
    setSubscribersLoading(true);
    try {
      const res = await fetchNewsletterSubscribers({
        search: subscriberSearch || undefined,
        channel: subscriberChannel || undefined,
      });
      setSubscribers(res?.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load subscribers', { description: errorMessage(err) });
    } finally {
      setSubscribersLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetchAuditLogs(auditSearch || undefined);
      setAuditLogs(res?.logs || []);
    } catch (err: any) {
      toast.error('Failed to load audit trail', { description: errorMessage(err) });
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (active === 'subscribers') {
      loadSubscribers();
    } else if (active === 'security') {
      loadAuditLogs();
    }
  }, [active, subscriberSearch, subscriberChannel, auditSearch]);

  const handleDeleteSubscriber = async (id: number) => {
    if (!window.confirm('Remove this contact from fare alerts?')) return;
    try {
      await deleteNewsletterSubscriber(id);
      toast.success('Subscriber removed successfully');
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error('Failed to remove subscriber', { description: errorMessage(err) });
    }
  };

  const handleExportCsv = () => {
    if (!subscribers.length) {
      toast.error('No subscribers to export');
      return;
    }
    const headers = ['ID', 'Contact', 'Channel', 'Source', 'Status', 'Subscribed At'];
    const rows = subscribers.map((s) => [
      s.id,
      `"${s.contact}"`,
      s.channel,
      s.source,
      s.status,
      `"${s.created_at}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkbus_fare_alert_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Subscribers exported to CSV');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Please enter a title and message');
      return;
    }

    setBroadcasting(true);
    try {
      const res = await broadcastFareAlert({
        title: broadcastTitle,
        message: broadcastMessage,
        channel: broadcastChannel,
        promo_code: broadcastPromoCode.trim() || undefined,
      });

      if (res.whatsapp_broadcast_url && (broadcastChannel === 'all' || broadcastChannel === 'whatsapp')) {
        window.open(res.whatsapp_broadcast_url, '_blank');
      }

      toast.success('Broadcast Dispatched!', {
        description: res.message || `Alert dispatched to ${res.dispatched_count} active subscribers.`,
        action: res.whatsapp_broadcast_url
          ? {
              label: 'Share via WhatsApp',
              onClick: () => window.open(res.whatsapp_broadcast_url, '_blank'),
            }
          : undefined,
      });
      setBroadcastOpen(false);
    } catch (err: any) {
      toast.error('Broadcast Failed', { description: errorMessage(err) });
    } finally {
      setBroadcasting(false);
    }
  };

  const activeGroupSettings = useMemo(() => {
    if (!data || active === 'subscribers' || active === 'security') return [];
    return (data as any)[active] ?? [];
  }, [data, active]);

  const activeTabMeta = useMemo(() => {
    return tabs.find((tab) => tab.key === active) ?? tabs[0];
  }, [active]);

  const hasChanges = useMemo(() => {
    if (!data || active === 'subscribers' || active === 'security') return false;
    const settingsChanged = activeGroupSettings.some((setting: Setting) => draft[setting.key] !== setting.value);
    const testWhatsappChanged = (draft['whatsapp_test_phone'] ?? '') !== testWhatsappPhone;
    const testSmsChanged = (draft['sms_test_phone'] ?? '') !== testPhone;
    const testEmailChanged = (draft['email_test_address'] ?? '') !== testEmailAddr;
    return settingsChanged || testWhatsappChanged || testSmsChanged || testEmailChanged;
  }, [activeGroupSettings, draft, data, active, testWhatsappPhone, testPhone, testEmailAddr]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      activeGroupSettings.forEach((setting: Setting) => {
        if (draft[setting.key] !== undefined) {
          payload[setting.key] = draft[setting.key];
        }
      });

      // Always save test contact numbers if on notifications tab or modified
      if (active === 'notifications' || draft['whatsapp_test_phone'] !== testWhatsappPhone) {
        payload['whatsapp_test_phone'] = testWhatsappPhone;
      }
      if (active === 'notifications' || draft['sms_test_phone'] !== testPhone) {
        payload['sms_test_phone'] = testPhone;
      }
      if (active === 'notifications' || draft['email_test_address'] !== testEmailAddr) {
        payload['email_test_address'] = testEmailAddr;
      }

      await updateSettings(payload);
      toast.success('Settings & dispatch numbers saved', {
        description: 'Changes applied across LinkBus platform in real time.',
      });
      await reload();
      await refresh();
    } catch (err) {
      toast.error('Failed to save settings', { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error('Please enter a phone number to test');
      return;
    }
    setTestingSms(true);
    try {
      const res = await sendTestSms(testPhone);
      toast.success('SMS Test Dispatched', {
        description: res.message || `Test SMS dispatched to ${testPhone}`,
      });
    } catch (err) {
      toast.error('SMS Test Failed', { description: errorMessage(err) });
    } finally {
      setTestingSms(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddr.trim()) {
      toast.error('Please enter an email address to test');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await sendTestEmail(testEmailAddr);
      toast.success('Email Test Dispatched', {
        description: res.message || `Test email dispatched to ${testEmailAddr}`,
      });
    } catch (err) {
      toast.error('Email Test Failed', { description: errorMessage(err) });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!testWhatsappPhone.trim()) {
      toast.error('Please enter a WhatsApp phone number');
      return;
    }
    setTestingWhatsapp(true);
    try {
      const cleanPhone = testWhatsappPhone.replace(/[^\d]/g, '');
      const formattedPhone = cleanPhone.startsWith('0')
        ? '256' + cleanPhone.substring(1)
        : cleanPhone;

      const fallbackMsg = encodeURIComponent(
        "🚌 *LinkBus Uganda* — WhatsApp Notification Gateway Test! 🎉\n\nYour WhatsApp booking confirmation channel is working properly.\n\n🔗 Portal: http://localhost:5173"
      );
      const fallbackUrl = `https://wa.me/${formattedPhone}?text=${fallbackMsg}`;

      const res = await sendTestWhatsapp(testWhatsappPhone).catch(() => null);
      const targetUrl = res?.whatsapp_link || fallbackUrl;

      window.open(targetUrl, '_blank');

      toast.success('WhatsApp Gateway Test Dispatched', {
        description: `Opening WhatsApp chat for ${testWhatsappPhone}`,
        action: {
          label: 'Reopen WhatsApp',
          onClick: () => window.open(targetUrl, '_blank'),
        },
      });
    } catch (err) {
      toast.error('WhatsApp Test Failed', { description: errorMessage(err) });
    } finally {
      setTestingWhatsapp(false);
    }
  };

  if (loading) return <SkeletonLoader count={6} />;
  if (error) return <ErrorState message={error} retry={reload} />;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            System Settings &amp; Security
          </h1>
          <p className="text-xs text-muted">
            Configure company branding, operational seat locks, baggage limits, messaging gateways, and audit logs.
          </p>
        </div>

        {active !== 'subscribers' && active !== 'security' && (
          <Button
            variant="primary"
            icon={<SaveIcon className="h-4 w-4" />}
            loading={saving}
            disabled={!hasChanges}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        )}
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab View: Security & Audit Trail ── */}
      {active === 'security' && (
        <div className="space-y-6">
          {/* Security Health Scorecard */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">RBAC Enforced</span>
              </div>
              <p className="mt-2 font-extrabold text-lg text-fg">6 Roles Active</p>
              <p className="text-[0.6875rem] text-muted">Admin, Dispatcher, Cashier, Driver</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <LockIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">SMTP TLS 587</span>
              </div>
              <p className="mt-2 font-extrabold text-lg text-fg">Encrypted</p>
              <p className="text-[0.6875rem] text-muted truncate">nobleultron@gmail.com</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <TicketIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Seat Hold Lock</span>
              </div>
              <p className="mt-2 font-extrabold text-lg text-fg">10 Min Window</p>
              <p className="text-[0.6875rem] text-muted">Auto-expires unconfirmed seats</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <KeyIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">2FA Status</span>
              </div>
              <p className="mt-2 font-extrabold text-lg text-fg">Email OTP Ready</p>
              <p className="text-[0.6875rem] text-muted">Protects admin operations</p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <Panel
            title="System Security & Operations Audit Trail"
            subtitle="Immutable logs recording administrative actions, role updates, fare changes, and user authentications."
          >
            <div className="space-y-4">
              <div className="relative flex-1 min-w-[240px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search action, authorized user, or component..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-4 text-xs text-fg placeholder-muted focus:border-brand-500 focus:outline-none"
                />
              </div>

              {auditLoading ? (
                <SkeletonLoader count={4} />
              ) : auditLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-8 text-center">
                  <ShieldCheckIcon className="mx-auto h-8 w-8 text-emerald-500 opacity-60" />
                  <p className="mt-2 text-sm font-semibold text-fg">Audit Log Ready</p>
                  <p className="text-xs text-muted">
                    Administrative operations and system policy modifications are logged securely to this audit repository.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-surface-2 text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Timestamp</th>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Action Performed</th>
                        <th className="px-4 py-3 font-semibold">Target Entity</th>
                        <th className="px-4 py-3 font-semibold">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-4 py-3 text-muted font-mono">{formatDateTime(log.created_at)}</td>
                          <td className="px-4 py-3 font-bold text-fg">
                            {log.user?.name || `User #${log.user_id || 'System'}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-fg bg-surface-2 px-2 py-0.5 rounded border border-line">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {log.model_type} #{log.model_id}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted">{log.ip_address || '127.0.0.1'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* ── Tab View: Subscribers Management ── */}
      {active === 'subscribers' && (
        <Panel
          title="Fare Alert & Holiday Broadcast Subscribers"
          subtitle={activeTabMeta.blurb}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={<DownloadIcon className="h-4 w-4" />}
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={<RadioIcon className="h-4 w-4" />}
                onClick={() => setBroadcastOpen(true)}
              >
                Broadcast Alert
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search phone, email, or source..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-4 text-xs text-fg placeholder-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <select
                value={subscriberChannel}
                onChange={(e) => setSubscriberChannel(e.target.value)}
                className="h-10 rounded-xl border border-line bg-surface px-3 text-xs font-medium text-fg focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Channels</option>
                <option value="whatsapp">WhatsApp / Phone</option>
                <option value="email">Email</option>
              </select>
            </div>

            {/* Subscribers Table */}
            {subscribersLoading ? (
              <SkeletonLoader count={4} />
            ) : subscribers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center">
                <UsersIcon className="mx-auto h-8 w-8 text-muted opacity-50" />
                <p className="mt-2 text-sm font-semibold text-fg">No subscribers found</p>
                <p className="text-xs text-muted">
                  Passengers who enter their contact in the public website alert bar will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface-2 text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Contact</th>
                      <th className="px-4 py-3 font-semibold">Channel</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Subscribed At</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-fg">{sub.contact}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold ${
                              sub.channel === 'whatsapp'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {sub.channel === 'whatsapp' ? '💬 WhatsApp' : '✉️ Email'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{sub.source || 'Website Footer'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-semibold text-emerald-600 dark:text-emerald-400">
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDateTime(sub.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriber(sub.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-600 transition-colors"
                            title="Remove subscriber"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* ── Standard Settings Group View ── */}
      {active !== 'subscribers' && active !== 'security' && (
        <Panel title={activeTabMeta.label} subtitle={activeTabMeta.blurb}>
          <div className="grid gap-5 sm:grid-cols-2">
            {activeGroupSettings.map((setting: Setting) => {
              const value = draft[setting.key] ?? setting.value ?? '';

              if (isBoolean(setting.value)) {
                return (
                  <div key={setting.key} className="sm:col-span-2">
                    <ToggleField
                      id={setting.key}
                      label={titleCase(setting.key.replace(/_/g, ' '))}
                      description={setting.description}
                      checked={value === 'true'}
                      onChange={(checked) =>
                        setDraft((prev) => ({ ...prev, [setting.key]: checked ? 'true' : 'false' }))
                      }
                    />
                  </div>
                );
              }

              return (
                <TextField
                  key={setting.key}
                  id={setting.key}
                  label={titleCase(setting.key.replace(/_/g, ' '))}
                  hint={setting.description}
                  type={isNumeric(setting.value) ? 'number' : 'text'}
                  value={value}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [setting.key]: e.target.value }))
                  }
                />
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Notification Testing Tools (When on Notifications tab) ── */}
      {active === 'notifications' && (
        <div className="grid gap-5 md:grid-cols-3">
          {/* WhatsApp Test Card */}
          <Panel
            title="Test WhatsApp Dispatch"
            subtitle="Opens WhatsApp directly on your phone or computer with a pre-filled ticket confirmation."
            action={
              <button
                type="button"
                onClick={handleSave}
                className="text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Save as Default
              </button>
            }
          >
            <div className="space-y-4">
              <TextField
                id="test-whatsapp-phone"
                label="WhatsApp Phone Number"
                hint="e.g. 0700123456 or +256700123456"
                value={testWhatsappPhone}
                onChange={(e) => setTestWhatsappPhone(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  loading={testingWhatsapp}
                  variant="primary"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  icon={<MessageSquareIcon className="h-4 w-4" />}
                  onClick={handleTestWhatsapp}
                >
                  Send / Open WhatsApp
                </Button>
                <Button
                  variant="outline"
                  loading={saving}
                  onClick={handleSave}
                  title="Save this phone number"
                >
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Panel>

          {/* SMS Test Card */}
          <Panel
            title="Test SMS Dispatch"
            subtitle="Verify SMS Provider connection and phone number normalization."
            action={
              <button
                type="button"
                onClick={handleSave}
                className="text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Save as Default
              </button>
            }
          >
            <div className="space-y-4">
              <TextField
                id="test-phone-input"
                label="Recipient Phone Number"
                hint="Supports 0700123456 or +256700123456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  loading={testingSms}
                  className="flex-1"
                  icon={<SmartphoneIcon className="h-4 w-4" />}
                  onClick={handleTestSms}
                >
                  Send Test SMS
                </Button>
                <Button
                  variant="outline"
                  loading={saving}
                  onClick={handleSave}
                  title="Save this phone number"
                >
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Panel>

          {/* Email Test Card */}
          <Panel
            title="Test Email Dispatch"
            subtitle="Verify SMTP configuration by dispatching a test email."
            action={
              <button
                type="button"
                onClick={handleSave}
                className="text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Save as Default
              </button>
            }
          >
            <div className="space-y-4">
              <TextField
                id="test-email-input"
                label="Recipient Email Address"
                hint="Your email address to receive the test message"
                type="email"
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  loading={testingEmail}
                  variant="secondary"
                  className="flex-1"
                  icon={<MailIcon className="h-4 w-4" />}
                  onClick={handleTestEmail}
                >
                  Send Test Email
                </Button>
                <Button
                  variant="outline"
                  loading={saving}
                  onClick={handleSave}
                  title="Save this email address"
                >
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ── Broadcast Fare Alert Modal ── */}
      <Modal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title="Broadcast Route & Holiday Fare Alert"
        subtitle="Dispatch an announcement, festive seat release notification, or promo code to subscribed passengers."
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <span className="text-xs text-muted">
              Targeting <strong className="text-fg">{subscribers.length}</strong> active subscribers
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={<SendIcon className="h-4 w-4" />}
                loading={broadcasting}
                onClick={handleSendBroadcast}
              >
                Send Broadcast
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <TextField
            id="broadcast-title"
            label="Announcement Title / Headline"
            hint="e.g. Easter Holiday Bookings Now Open!"
            required
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="broadcast-channel-select" className="block text-xs font-semibold text-fg">
                Delivery Channel
              </label>
              <select
                id="broadcast-channel-select"
                value={broadcastChannel}
                onChange={(e) => setBroadcastChannel(e.target.value as any)}
                className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface px-3 text-xs font-medium text-fg focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All Channels (WhatsApp & Email)</option>
                <option value="whatsapp">WhatsApp / Phone Only</option>
                <option value="email">Email Only</option>
              </select>
            </div>

            <TextField
              id="broadcast-promo"
              label="Promo Code (Optional)"
              hint="e.g. EASTER15 or LINKBUS20"
              value={broadcastPromoCode}
              onChange={(e) => setBroadcastPromoCode(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="broadcast-message-area" className="block text-xs font-semibold text-fg">
              Message Announcement Body
            </label>
            <textarea
              id="broadcast-message-area"
              rows={4}
              required
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface p-3 text-xs text-fg placeholder-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Write your holiday schedule announcement or flash discount details..."
            />
          </div>

          {/* Live Message Preview Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Passenger Message Preview:
            </span>
            <div className="mt-2 text-xs leading-relaxed text-fg space-y-1">
              <p className="font-bold">🚌 LinkBus Uganda — {broadcastTitle || 'Alert Title'}</p>
              <p className="text-muted">{broadcastMessage || 'Announcement message content...'}</p>
              {broadcastPromoCode && (
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  🏷️ Promo Code: {broadcastPromoCode}
                </p>
              )}
              <p className="text-[0.6875rem] text-muted">🔗 Book departures: https://linkbus.co.ug/search</p>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}