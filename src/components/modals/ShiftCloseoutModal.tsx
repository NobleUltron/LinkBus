import React, { useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
  const expectedCash = metrics?.system_expected_cash ?? metrics?.expected_cash ?? 0;
  const variance = countedCash - expectedCash;

  const totalInflows =
    (metrics?.ticket_sales_cash || 0) +
    (metrics?.luggage_fees_cash || 0) +
    (metrics?.parcel_fees_cash || 0) +
    (metrics?.cash_in_total || 0);

  const totalOutflows =
    (metrics?.cash_out_expenses || 0) + (metrics?.safe_drops_total || 0) + (metrics?.cash_refunds_total || 0);

  const handleDenominationChange = (key: keyof CashDenominations, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setDenominations((prev) => ({ ...prev, [key]: num }));
  };

  const handleQuickFillExact = () => {
    if (!expectedCash) return;
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
    toast.success('Exact cash match populated for fast count verification.');
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
        terminal_id: metrics.terminal_id || 1,
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
      title="Station Cash Drawer Closeout &amp; Z-Report"
      subtitle={`Shift #${metrics.shift_code} · ${terminalName} · Cashier: ${user?.name || 'Cashier'}`}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={handleQuickFillExact}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline cursor-pointer"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Auto-fill exact drawer match
          </button>

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
              Verify &amp; Lock Shift Closeout
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ─── 1. Compact Shift Drawer Math Equation ─── */}
        <div className="rounded-2xl border border-line bg-surface-2/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-extrabold uppercase tracking-wider text-muted flex items-center gap-1">
              <CalculatorIcon className="h-3.5 w-3.5 text-brand-600" />
              Expected Drawer Cash Formula
            </span>
            <span className="text-[0.6875rem] text-muted">
              Tickets: <strong className="text-fg">{money(metrics.ticket_sales_cash || 0)}</strong> · Cargo: <strong className="text-fg">{money((metrics.luggage_fees_cash || 0) + (metrics.parcel_fees_cash || 0))}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Opening Float */}
            <div className="bg-surface p-2 rounded-xl border border-line">
              <span className="text-[0.625rem] font-bold text-muted uppercase block">Opening Float</span>
              <span className="font-mono font-black text-xs text-fg">{money(metrics.opening_float ?? metrics.starting_cash ?? 0)}</span>
            </div>

            {/* Inflows */}
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              <span className="text-[0.625rem] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">+ Cash Inflows</span>
              <span className="font-mono font-black text-xs text-emerald-950 dark:text-emerald-100">{money(totalInflows)}</span>
            </div>

            {/* Outflows */}
            <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[0.625rem] font-bold text-rose-800 dark:text-rose-300 uppercase block">- Outflows &amp; Drops</span>
              <span className="font-mono font-black text-xs text-rose-950 dark:text-rose-100">{money(totalOutflows)}</span>
            </div>

            {/* Expected Cash */}
            <div className="bg-brand-500/10 p-2 rounded-xl border border-brand-500/30">
              <span className="text-[0.625rem] font-bold text-brand-800 dark:text-brand-300 uppercase block">= Expected Cash</span>
              <span className="font-mono font-black text-xs text-brand-950 dark:text-brand-100">{money(expectedCash)}</span>
            </div>
          </div>
        </div>

        {/* ─── 2. Physical Currency Note Counter (2-Column Grid) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
              <BanknoteIcon className="h-4 w-4 text-emerald-600" />
              Physical Currency Count (Banknotes &amp; Coins)
            </span>
            <span className="text-xs font-mono font-bold text-fg">
              Counted Total: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{money(countedCash)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-2xl border border-line bg-surface p-3.5 text-xs">
            {/* 50,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 min-w-[76px]">
                  50,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_50k || ''}
                  onChange={(e) => handleDenominationChange('notes_50k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_50k || 0) * 50000)}
              </span>
            </div>

            {/* 20,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 min-w-[76px]">
                  20,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_20k || ''}
                  onChange={(e) => handleDenominationChange('notes_20k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_20k || 0) * 20000)}
              </span>
            </div>

            {/* 10,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 min-w-[76px]">
                  10,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_10k || ''}
                  onChange={(e) => handleDenominationChange('notes_10k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_10k || 0) * 10000)}
              </span>
            </div>

            {/* 5,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 min-w-[76px]">
                  5,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_5k || ''}
                  onChange={(e) => handleDenominationChange('notes_5k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_5k || 0) * 5000)}
              </span>
            </div>

            {/* 2,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 min-w-[76px]">
                  2,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_2k || ''}
                  onChange={(e) => handleDenominationChange('notes_2k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_2k || 0) * 2000)}
              </span>
            </div>

            {/* 1,000 Note */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30 min-w-[76px]">
                  1,000
                </span>
                <span className="text-muted text-xs">×</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.notes_1k || ''}
                  onChange={(e) => handleDenominationChange('notes_1k', e.target.value)}
                  placeholder="0"
                  className="w-16 h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs font-bold text-fg text-center focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money((denominations.notes_1k || 0) * 1000)}
              </span>
            </div>

            {/* Loose Coins Total Input */}
            <div className="sm:col-span-2 flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
              <div className="flex items-center gap-2 flex-1">
                <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-black px-2 py-1 rounded-md bg-slate-500/15 text-slate-800 dark:text-slate-200 border border-slate-500/30">
                  <CoinsIcon className="h-3 w-3" /> Loose Coins
                </span>
                <input
                  type="number"
                  min="0"
                  value={denominations.coins || ''}
                  onChange={(e) => handleDenominationChange('coins', e.target.value)}
                  placeholder="Total coins value in UGX (e.g. 1500)"
                  className="w-full h-8 rounded-lg border border-line bg-surface px-2.5 font-mono text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
                />
              </div>
              <span className="font-mono font-black text-xs text-fg">
                {money(denominations.coins || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 3. Adaptive Live Reconciliation Status Banner ─── */}
        <div>
          {countedCash === 0 ? (
            <div className="rounded-xl p-3 border border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BanknoteIcon className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold">
                  Physical count in progress — Enter your physical banknotes above.
                </span>
              </div>
              <span className="text-xs font-mono font-black">
                Target: {money(expectedCash)}
              </span>
            </div>
          ) : variance === 0 ? (
            <div className="rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-xs">Drawer Balanced — Exact Match (0 UGX Variance)</p>
                  <p className="text-[0.6875rem] opacity-80">Physical cash matches system expected drawer total perfectly.</p>
                </div>
              </div>
              <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                0 UGX
              </span>
            </div>
          ) : (
            <div
              className={`rounded-xl p-3 border flex items-center justify-between ${
                variance > 0
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {variance > 0 ? (
                  <AlertCircleIcon className="h-4 w-4 text-blue-600 shrink-0" />
                ) : (
                  <AlertTriangleIcon className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="font-extrabold text-xs">
                    {variance > 0 ? `Cash Overage: +${money(variance)}` : `Cash Shortage: ${money(variance)}`}
                  </p>
                  <p className="text-[0.6875rem] opacity-80">
                    {variance > 0
                      ? 'Counted cash exceeds expected total. Please enter an explanation note.'
                      : 'Counted cash is lower than expected. Variance will be submitted for supervisor audit.'}
                  </p>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {variance > 0 ? `+${money(variance)}` : money(variance)}
              </span>
            </div>
          )}

          {/* Variance Reason Input (Shown whenever count is non-zero and mismatched) */}
          {countedCash > 0 && variance !== 0 && (
            <div className="mt-2.5">
              <label className="block text-xs font-bold text-fg mb-1">
                Reason for Variance / Discrepancy <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                placeholder="Explain the cause of overage/shortage (e.g. passenger change rounding, loose coin difference)..."
                className="w-full h-8 rounded-xl border border-line bg-surface px-3 text-xs text-fg focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* ─── 4. Supervisor & Handover Notes (2-Column) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-line pt-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-muted mb-1">
              Station Duty Supervisor Name
            </label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full h-8 rounded-xl border border-line bg-surface px-2.5 text-xs text-fg focus:border-brand-500 focus:outline-none"
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
              className="w-full h-8 rounded-xl border border-line bg-surface px-2.5 text-xs text-fg focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
