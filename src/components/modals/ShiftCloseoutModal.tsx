import React, { useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  BriefcaseIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CoinsIcon,
  CreditCardIcon,
  PackageIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TicketIcon,
  UserCheckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  calculateCountedCash,
  submitShiftCloseout,
  type ActiveShiftMetrics,
  type CashDenominations,
  type ShiftReconciliation,
} from '../../services/reconciliations';
import { money } from '../../utils/format';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/Field';

interface ShiftCloseoutModalProps {
  open: boolean;
  onClose: () => void;
  metrics: ActiveShiftMetrics | null;
  terminalName?: string;
  terminalCity?: string;
  onSuccess: (reconciliation: ShiftReconciliation) => void;
}

const initialDenominations: CashDenominations = {
  notes_50k: 0,
  notes_20k: 0,
  notes_10k: 0,
  notes_5k: 0,
  notes_2k: 0,
  notes_1k: 0,
  coins: 0,
};

export function ShiftCloseoutModal({
  open,
  onClose,
  metrics,
  terminalName = 'Namayiba / Central Terminal',
  terminalCity = 'Kampala',
  onSuccess,
}: ShiftCloseoutModalProps) {
  const { user } = useAuth();
  const [denominations, setDenominations] = useState<CashDenominations>(initialDenominations);
  const [supervisorName, setSupervisorName] = useState('Robert Mugisha (Station Supervisor)');
  const [varianceReason, setVarianceReason] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const countedCash = useMemo(() => calculateCountedCash(denominations), [denominations]);
  const expectedCash = metrics?.system_expected_cash || 0;
  const variance = countedCash - expectedCash;

  const handleDenominationChange = (key: keyof CashDenominations, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setDenominations((prev) => ({ ...prev, [key]: num }));
  };

  const handleQuickFillExact = () => {
    if (!expectedCash) return;
    // Calculate a realistic breakdown for the exact expected cash
    let remaining = expectedCash;
    const n50k = Math.floor(remaining / 50000);
    remaining %= 50000;
    const n20k = Math.floor(remaining / 20000);
    remaining %= 20000;
    const n10k = Math.floor(remaining / 10000);
    remaining %= 10000;
    const n5k = Math.floor(remaining / 5000);
    remaining %= 5000;
    const n2k = Math.floor(remaining / 2000);
    remaining %= 2000;
    const n1k = Math.floor(remaining / 1000);
    remaining %= 1000;

    setDenominations({
      notes_50k: n50k,
      notes_20k: n20k,
      notes_10k: n10k,
      notes_5k: n5k,
      notes_2k: n2k,
      notes_1k: n1k,
      coins: remaining,
    });
    toast.success('Filled exact denomination count for preview/testing.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metrics) return;

    if (variance !== 0 && !varianceReason.trim()) {
      toast.error('Please enter an explanation reason for the cash variance/discrepancy.');
      return;
    }

    setSubmitting(true);
    try {
      const rec = await submitShiftCloseout({
        terminal_id: 1,
        terminal_name: terminalName,
        terminal_city: terminalCity,
        cashier_id: user?.id || 1,
        cashier_name: user?.name || 'Counter Cashier',
        supervisor_name: supervisorName,
        metrics,
        denominations,
        variance_reason: varianceReason,
        closing_notes: closingNotes,
      });

      toast.success(`Shift #${rec.shift_code} successfully reconciled and locked.`);
      onSuccess(rec);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit shift reconciliation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!metrics) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Station Cash Drawer Reconciliation & Shift Closeout"
      subtitle={`${terminalName} · Cashier: ${user?.name || 'Station Agent'}`}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFillExact}
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              ⚡ Auto-fill exact count (Test)
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Verify & Lock Shift Closeout
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ─── 1. System Expected Shift Collections Summary ─── */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg mb-2.5 flex items-center gap-1.5">
            <CalculatorIcon className="h-4 w-4 text-brand-600" />
            1. Shift Collections Summary (Live System Ledger)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Ticket Fares Card */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                  <TicketIcon className="h-3.5 w-3.5 text-brand-600" />
                  Ticket Sales ({metrics.ticket_count})
                </span>
                <span className="font-mono text-xs font-bold text-fg">
                  {money(metrics.ticket_sales_total)}
                </span>
              </div>
              <div className="space-y-1 text-[0.6875rem] text-muted border-t border-line/60 pt-1.5">
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="font-mono text-fg font-semibold">{money(metrics.ticket_sales_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MTN MoMo / Airtel:</span>
                  <span className="font-mono">{money(metrics.ticket_sales_momo + metrics.ticket_sales_airtel)}</span>
                </div>
                <div className="flex justify-between">
                  <span>POS Card / Visa:</span>
                  <span className="font-mono">{money(metrics.ticket_sales_card)}</span>
                </div>
              </div>
            </div>

            {/* Excess Luggage Card */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                  <BriefcaseIcon className="h-3.5 w-3.5 text-amber-600" />
                  Excess Luggage ({metrics.luggage_count})
                </span>
                <span className="font-mono text-xs font-bold text-fg">
                  {money(metrics.luggage_fees_total)}
                </span>
              </div>
              <div className="space-y-1 text-[0.6875rem] text-muted border-t border-line/60 pt-1.5">
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="font-mono text-fg font-semibold">{money(metrics.luggage_fees_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MTN MoMo:</span>
                  <span className="font-mono">{money(metrics.luggage_fees_momo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Airtel Money:</span>
                  <span className="font-mono">{money(metrics.luggage_fees_airtel)}</span>
                </div>
              </div>
            </div>

            {/* Parcel Freight Card */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                  <PackageIcon className="h-3.5 w-3.5 text-blue-600" />
                  Parcel Freight ({metrics.parcel_count})
                </span>
                <span className="font-mono text-xs font-bold text-fg">
                  {money(metrics.parcel_fees_total)}
                </span>
              </div>
              <div className="space-y-1 text-[0.6875rem] text-muted border-t border-line/60 pt-1.5">
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="font-mono text-fg font-semibold">{money(metrics.parcel_fees_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MTN MoMo:</span>
                  <span className="font-mono">{money(metrics.parcel_fees_momo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Airtel Money:</span>
                  <span className="font-mono">{money(metrics.parcel_fees_airtel)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Target Banner */}
          <div className="mt-3 rounded-xl bg-brand-500/10 border border-brand-500/30 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[0.6875rem] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider block">
                Total Expected Cash in Drawer
              </span>
              <span className="text-xl font-black font-mono text-brand-800 dark:text-brand-200">
                {money(expectedCash)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-muted">
              <div>
                <span>Digital Settlements:</span>{' '}
                <strong className="text-fg font-mono">
                  {money(metrics.system_expected_momo + metrics.system_expected_airtel + metrics.system_expected_card)}
                </strong>
              </div>
              <div>
                <span>Total Shift Revenue:</span>{' '}
                <strong className="text-fg font-mono">
                  {money(metrics.system_expected_total)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. Physical Cash Drawer Denomination Counter ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
              <BanknoteIcon className="h-4 w-4 text-emerald-600" />
              2. Physical Cash Drawer Count (UGX Banknotes & Coins)
            </h3>
            <span className="text-xs font-mono font-bold text-fg">
              Counted Cash: <strong className="text-emerald-700 dark:text-emerald-400 text-sm">{money(countedCash)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-line bg-surface p-3.5 text-xs">
            {/* 50,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                50,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_50k || ''}
                  onChange={(e) => handleDenominationChange('notes_50k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_50k || 0) * 50000)}
                </span>
              </div>
            </div>

            {/* 20,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                20,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_20k || ''}
                  onChange={(e) => handleDenominationChange('notes_20k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_20k || 0) * 20000)}
                </span>
              </div>
            </div>

            {/* 10,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                10,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_10k || ''}
                  onChange={(e) => handleDenominationChange('notes_10k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_10k || 0) * 10000)}
                </span>
              </div>
            </div>

            {/* 5,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                5,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_5k || ''}
                  onChange={(e) => handleDenominationChange('notes_5k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_5k || 0) * 5000)}
                </span>
              </div>
            </div>

            {/* 2,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                2,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_2k || ''}
                  onChange={(e) => handleDenominationChange('notes_2k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_2k || 0) * 2000)}
                </span>
              </div>
            </div>

            {/* 1,000 Note */}
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                1,000 UGX Notes
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_1k || ''}
                  onChange={(e) => handleDenominationChange('notes_1k', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-[0.625rem] font-mono text-muted whitespace-nowrap">
                  = {money((denominations.notes_1k || 0) * 1000)}
                </span>
              </div>
            </div>

            {/* Loose Coins Value */}
            <div className="sm:col-span-2">
              <label className="block text-[0.6875rem] font-bold text-muted mb-1">
                Total Loose Coins Value (UGX)
              </label>
              <input
                type="number"
                min="0"
                value={denominations.coins || ''}
                onChange={(e) => handleDenominationChange('coins', e.target.value)}
                placeholder="Coins total (e.g. 1500)"
                className="w-full h-9 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ─── 3. Variance Indicator & Discrepancy Reason ─── */}
        <div>
          <div
            className={`rounded-xl p-4 border flex items-center justify-between ${
              variance === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : variance > 0
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {variance === 0 ? (
                <CheckCircle2Icon className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : variance > 0 ? (
                <AlertCircleIcon className="h-5 w-5 text-blue-600 shrink-0" />
              ) : (
                <AlertTriangleIcon className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-extrabold text-sm">
                  {variance === 0
                    ? 'Drawer Balanced — Exact Match'
                    : variance > 0
                    ? `Cash Overage: +${money(variance)}`
                    : `Cash Shortage: ${money(variance)}`}
                </p>
                <p className="text-[0.6875rem] opacity-80">
                  {variance === 0
                    ? 'Physical cash in drawer perfectly matches system ticket, luggage, and parcel records.'
                    : variance > 0
                    ? 'Physical cash exceeds system expected cash. Please enter an explanatory note below.'
                    : 'Physical cash is lower than expected. Shortages will be flagged for station audit.'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono font-black text-base">
              {variance === 0 ? '0 UGX' : variance > 0 ? `+${money(variance)}` : money(variance)}
            </div>
          </div>

          {variance !== 0 && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-fg mb-1">
                Reason for Variance / Discrepancy <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                placeholder="Explain the cause of overage/shortage (e.g., loose change difference, customer coin rounding)..."
                className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-fg focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* ─── 4. Shift Handover & Supervisor Verification ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-muted mb-1">
              Station Duty Supervisor Name
            </label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-fg focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1">
              Shift Handover Notes (Optional)
            </label>
            <input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Handover to next cashier, terminal notes..."
              className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-fg focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
