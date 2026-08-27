import React, { useEffect, useState } from 'react';
import {
  ArrowDownRightIcon,
  ClockIcon,
  CoinsIcon,
  LockIcon,
  PlusIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getActiveShiftMetrics, type ActiveShiftMetrics } from '../../services/reconciliations';
import { formatTime, money } from '../../utils/format';
import { DrawerExpenseModal } from '../modals/DrawerExpenseModal';
import { ShiftCloseoutModal } from '../modals/ShiftCloseoutModal';
import { ShiftOpenModal } from '../modals/ShiftOpenModal';

export function ShiftTopBadge() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'driver';

  const activeShift = useAsync(() => getActiveShiftMetrics(1), []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00h 00m');

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeoutModal, setCloseoutModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseType, setExpenseType] = useState<'petty_expense' | 'safe_drop' | 'cash_in'>('petty_expense');

  const shift = activeShift.data;
  const isOpen = Boolean(shift && shift.status === 'open');

  // Listen for real-time shift transactions and updates
  useEffect(() => {
    const handleUpdate = () => {
      activeShift.reload();
    };
    window.addEventListener('shift_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('shift_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Calculate live elapsed shift time
  useEffect(() => {
    if (!isOpen || !shift?.opened_at) {
      setElapsedTime('00h 00m');
      return;
    }

    const updateTimer = () => {
      const start = new Date(shift.opened_at).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setElapsedTime(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [isOpen, shift?.opened_at]);

  if (!isStaff) return null;

  return (
    <>
      <div className="relative">
        {isOpen ? (
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-2xs group"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[0.6875rem] sm:text-xs">
              {shift?.shift_code}
            </span>
            <span className="hidden md:inline text-muted font-normal">·</span>
            <span className="hidden md:inline font-mono text-[0.6875rem] text-muted">
              {elapsedTime}
            </span>
            <span className="hidden lg:inline text-muted font-normal">·</span>
            <span className="hidden lg:inline font-mono font-bold text-fg">
              {money(shift?.system_expected_cash || 0)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpenShiftModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all shadow-2xs"
          >
            <LockIcon className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden sm:inline">Shift Closed</span>
            <span className="text-[0.6875rem] underline font-extrabold text-brand-600 dark:text-brand-400">
              Open Float
            </span>
          </button>
        )}

        {/* Dropdown Menu for Active Shift Actions */}
        {isOpen && dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl z-50 text-xs space-y-2">
              <div className="border-b border-line pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-fg">
                    #{shift?.shift_code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[0.625rem] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <ClockIcon className="h-2.5 w-2.5" /> {elapsedTime}
                  </span>
                </div>
                <p className="text-[0.6875rem] text-muted mt-0.5">{shift?.terminal_name}</p>
                <div className="mt-2 flex items-center justify-between bg-surface-2 p-2 rounded-lg">
                  <span className="text-[0.6875rem] text-muted">Drawer Cash:</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {money(shift?.system_expected_cash || 0)}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setExpenseType('cash_in');
                    setExpenseModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-2 transition-colors font-medium text-fg"
                >
                  <CoinsIcon className="h-3.5 w-3.5 text-emerald-600" />
                  + Float Top-Up (Cash In)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setExpenseType('petty_expense');
                    setExpenseModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-2 transition-colors font-medium text-fg"
                >
                  <ArrowDownRightIcon className="h-3.5 w-3.5 text-amber-600" />
                  - Log Petty Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setExpenseType('safe_drop');
                    setExpenseModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-2 transition-colors font-medium text-fg"
                >
                  <ArrowDownRightIcon className="h-3.5 w-3.5 text-blue-600" />
                  - Mid-Shift Safe Drop
                </button>
                <div className="border-t border-line pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setCloseoutModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold transition-colors"
                  >
                    <LockIcon className="h-3.5 w-3.5" />
                    Close Shift (Z-Read)
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shift Open Modal */}
      <ShiftOpenModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSuccess={() => activeShift.reload()}
      />

      {/* Drawer Expense Modal */}
      <DrawerExpenseModal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        metrics={shift}
        defaultType={expenseType}
        onSuccess={() => activeShift.reload()}
      />

      {/* Shift Closeout Modal */}
      <ShiftCloseoutModal
        open={closeoutModal}
        onClose={() => setCloseoutModal(false)}
        metrics={shift}
        onSuccess={() => activeShift.reload()}
      />
    </>
  );
}
