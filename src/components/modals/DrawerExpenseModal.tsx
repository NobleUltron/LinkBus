import React, { useState } from 'react';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  StoreIcon,
  WalletIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { logDrawerTransaction, type ActiveShiftMetrics } from '../../services/reconciliations';
import { money } from '../../utils/format';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface DrawerExpenseModalProps {
  open: boolean;
  onClose: () => void;
  metrics: ActiveShiftMetrics | null;
  defaultType?: 'petty_expense' | 'safe_drop' | 'cash_in';
  onSuccess: (updatedShift: ActiveShiftMetrics) => void;
}

const EXPENSE_CATEGORIES = [
  'Receipt Paper Rolls & Printing',
  'Emergency Terminal Cleaning & Sanitizer',
  'Generator Fuel / Power Backup',
  'Bus Bay Wash & Maintenance',
  'Station Drinking Water & Supplies',
  'Courier / Parcel Packing Tape',
  'Other Terminal Operational Expense',
];

export function DrawerExpenseModal({
  open,
  onClose,
  metrics,
  defaultType = 'petty_expense',
  onSuccess,
}: DrawerExpenseModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'petty_expense' | 'safe_drop' | 'cash_in'>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Robert Mugisha (Station Supervisor)');
  const [submitting, setSubmitting] = useState(false);

  const availableCash = metrics?.system_expected_cash || 0;
  const numAmount = Number(amount || 0);
  const isOverdrawing = (type === 'petty_expense' || type === 'safe_drop') && numAmount > availableCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metrics) return;

    if (numAmount <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }

    if (isOverdrawing) {
      toast.error(`Cannot payout ${money(numAmount)}. Current drawer cash is only ${money(availableCash)}.`);
      return;
    }

    if (!reason.trim()) {
      toast.error('Please enter a clear explanation for this cash drawer movement.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await logDrawerTransaction({
        shift_id: metrics.shift_id,
        type,
        amount: numAmount,
        category: type === 'safe_drop' ? 'Mid-Shift Safe Drop' : type === 'cash_in' ? 'Supervisor Float Top-Up' : category,
        reason,
        authorized_by: authorizedBy,
      });

      const actionTitle =
        type === 'petty_expense'
          ? 'Station expense logged'
          : type === 'safe_drop'
          ? 'Mid-shift safe drop recorded'
          : 'Cash-in float top-up recorded';

      toast.success(`${actionTitle}: ${money(numAmount)}.`);
      onSuccess(updated);
      onClose();
      setAmount('');
      setReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record drawer transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!metrics) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cash Drawer Movement &amp; Outflow Record"
      subtitle={`Active Shift #${metrics.shift_code} · Current Drawer Balance: ${money(availableCash)}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="drawer-movement-form"
            loading={submitting}
            disabled={isOverdrawing}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            icon={<CheckCircle2Icon className="h-4 w-4" />}
          >
            Record Movement &amp; Update Drawer
          </Button>
        </div>
      }
    >
      <form id="drawer-movement-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Segment Pills */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Transaction Classification
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('petty_expense')}
              className={`rounded-xl border p-2.5 text-xs font-bold transition-all hover-lift active:scale-95 text-center ${
                type === 'petty_expense'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-sm'
                  : 'border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              🛠️ Petty Expense (Cash Out)
            </button>
            <button
              type="button"
              onClick={() => setType('safe_drop')}
              className={`rounded-xl border p-2.5 text-xs font-bold transition-all hover-lift active:scale-95 text-center ${
                type === 'safe_drop'
                  ? 'border-blue-500 bg-blue-500/15 text-blue-900 dark:text-blue-200 shadow-sm'
                  : 'border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              🏦 Safe Drop (Remittance)
            </button>
            <button
              type="button"
              onClick={() => setType('cash_in')}
              className={`rounded-xl border p-2.5 text-xs font-bold transition-all hover-lift active:scale-95 text-center ${
                type === 'cash_in'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 shadow-sm'
                  : 'border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              ➕ Float Top-Up (Cash In)
            </button>
          </div>
        </div>

        {/* Current Available Cash Banner */}
        <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-bold text-fg">Current Cash in Drawer:</span>
          </div>
          <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
            {money(availableCash)}
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <TextField
            id="movement-amount"
            label="Transaction Amount (UGX)"
            type="number"
            min={0}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 25000"
          />
          {isOverdrawing && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangleIcon className="h-3.5 w-3.5" />
              Insufficient cash in drawer! Exceeds available {money(availableCash)} by {money(numAmount - availableCash)}.
            </p>
          )}
        </div>

        {/* Category (for petty expenses) */}
        {type === 'petty_expense' && (
          <div>
            <label htmlFor="expense-cat" className="mb-1.5 block text-xs font-bold text-fg">
              Expense Category
            </label>
            <select
              id="expense-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field text-xs font-semibold"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description & Supervisor */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="movement-reason"
            label="Detailed Reason / Receipt Details"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              type === 'petty_expense'
                ? 'e.g. Purchased 5 thermal paper rolls'
                : type === 'safe_drop'
                ? 'e.g. Midday cash drop to terminal safe'
                : 'e.g. Added 50k change for rush hour'
            }
          />

          <TextField
            id="authorized-supervisor"
            label="Authorized By (Supervisor)"
            required
            value={authorizedBy}
            onChange={(e) => setAuthorizedBy(e.target.value)}
            placeholder="e.g. Robert Mugisha"
          />
        </div>
      </form>
    </Modal>
  );
}
