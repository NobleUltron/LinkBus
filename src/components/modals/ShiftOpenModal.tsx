import React, { useState } from 'react';
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
  CoinsIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StoreIcon,
  UserCheckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { openShift, type ActiveShiftMetrics } from '../../services/reconciliations';
import { money } from '../../utils/format';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface ShiftOpenModalProps {
  open: boolean;
  onClose: () => void;
  terminalId?: number;
  terminalName?: string;
  terminalCity?: string;
  onSuccess: (shift: ActiveShiftMetrics) => void;
}

const FLOAT_PRESETS = [50000, 100000, 200000, 300000];

export function ShiftOpenModal({
  open,
  onClose,
  terminalId = 1,
  terminalName = 'Namayiba / Central Terminal',
  terminalCity = 'Kampala',
  onSuccess,
}: ShiftOpenModalProps) {
  const { user } = useAuth();
  const [startingFloat, setStartingFloat] = useState('100000');
  const [supervisorName, setSupervisorName] = useState('Robert Mugisha (Station Supervisor)');
  const [notes, setNotes] = useState('Opening till loose change float issued by station manager.');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatAmount = Number(startingFloat || 0);
    if (floatAmount < 0) {
      toast.error('Starting float amount must be zero or positive.');
      return;
    }

    setSubmitting(true);
    try {
      const shift = await openShift({
        terminal_id: terminalId,
        terminal_name: terminalName,
        terminal_city: terminalCity,
        cashier_id: user?.id || 1,
        cashier_name: user?.name || 'Counter Cashier',
        supervisor_name: supervisorName,
        starting_float: floatAmount,
        notes,
      });

      toast.success(`Duty shift #${shift.shift_code} opened with ${money(floatAmount)} starting float.`);
      onSuccess(shift);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open Cash Drawer & Start Duty Shift"
      subtitle={`Station: ${terminalName} · Cashier: ${user?.name || 'Counter Cashier'}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="open-shift-form"
            loading={submitting}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            icon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            Start Shift &amp; Open Drawer
          </Button>
        </div>
      }
    >
      <form id="open-shift-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Terminal Station Banner */}
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <StoreIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-sm text-fg">{terminalName}</p>
              <p className="text-xs text-muted flex items-center gap-1">
                <MapPinIcon className="h-3 w-3 text-brand-600" /> {terminalCity}, Uganda
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[0.6875rem] font-bold text-muted uppercase">Cashier on Duty</span>
            <p className="text-xs font-bold text-fg">{user?.name || 'Counter Cashier'}</p>
          </div>
        </div>

        {/* Starting Cash Float Entry */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <BanknoteIcon className="h-4 w-4 text-emerald-600" />
              Starting Cash Till Float (UGX)
            </span>
            <span className="text-[0.625rem] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              Physical Cash in Drawer
            </span>
          </div>

          <TextField
            id="starting-float"
            label="Initial Cash Handed Over for Change"
            type="number"
            min={0}
            required
            value={startingFloat}
            onChange={(e) => setStartingFloat(e.target.value)}
            hint="Physical currency provided in the till at the beginning of the shift."
          />

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mr-1">
              Quick Float Presets:
            </span>
            {FLOAT_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setStartingFloat(String(amount))}
                className={`rounded-xl border px-3 py-1 text-xs font-black transition-all hover-lift active:scale-95 ${
                  startingFloat === String(amount)
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-emerald-500/40 bg-surface text-emerald-950 dark:text-emerald-100 hover:bg-emerald-500/20'
                }`}
              >
                {money(amount)}
              </button>
            ))}
          </div>
        </div>

        {/* Supervisor Authorization & Opening Notes */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="supervisor-name"
            label="Approving Station Supervisor"
            required
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            placeholder="e.g. Robert Mugisha (Manager)"
          />

          <TextField
            id="shift-notes"
            label="Opening Shift Notes / Remarks"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Loose change verified with cashier"
          />
        </div>
      </form>
    </Modal>
  );
}
