import type { Paginated } from '../types/api';
import type { CashDenominations, DrawerTransaction, ShiftReconciliation } from '../types/models';
import { api } from './api-client';
import { matches } from './http';

export const DENOMINATION_VALUES: Record<keyof CashDenominations, number> = {
  notes_50k: 50000,
  notes_20k: 20000,
  notes_10k: 10000,
  notes_5k: 5000,
  notes_2k: 2000,
  notes_1k: 1000,
  coins: 1, // entered directly as coin total value
};

export function calculateCountedCash(denominations: CashDenominations): number {
  return (
    (denominations.notes_50k || 0) * 50000 +
    (denominations.notes_20k || 0) * 20000 +
    (denominations.notes_10k || 0) * 10000 +
    (denominations.notes_5k || 0) * 5000 +
    (denominations.notes_2k || 0) * 2000 +
    (denominations.notes_1k || 0) * 1000 +
    (denominations.coins || 0)
  );
}

// Local mock storage keys
const RECONCILIATIONS_KEY = 'linkbus_shift_reconciliations';
const ACTIVE_SHIFT_KEY = 'linkbus_active_shift_state';

function getStoredReconciliations(): ShiftReconciliation[] {
  try {
    const raw = localStorage.getItem(RECONCILIATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  // Initial rich sample seed for Uganda stations
  const seed: ShiftReconciliation[] = [
    {
      id: 1,
      shift_code: 'SHF-260826-001',
      terminal_id: 1,
      terminal_name: 'Namayiba / Central Terminal',
      terminal_city: 'Kampala',
      cashier_id: 2,
      cashier_name: 'Sarah Nakato',
      supervisor_name: 'Robert Mugisha (Station Manager)',
      shift_date: '2026-08-26',
      opened_at: '2026-08-26T06:00:00Z',
      closed_at: '2026-08-26T14:30:00Z',
      status: 'reconciled',
      opening_float: 100000,
      cash_in_total: 0,
      cash_out_expenses: 25000,
      safe_drops_total: 0,
      cash_refunds_total: 0,
      drawer_transactions: [
        {
          id: 101,
          shift_id: 1,
          type: 'petty_expense',
          amount: 25000,
          category: 'Receipt Paper & Terminal Cleaning',
          reason: 'Purchased 5 thermal receipt paper rolls for counter POS',
          authorized_by: 'Robert Mugisha',
          created_at: '2026-08-26T10:15:00Z',
        },
      ],
      ticket_sales_cash: 1850000,
      ticket_sales_momo: 940000,
      ticket_sales_airtel: 420000,
      ticket_sales_card: 350000,
      ticket_sales_total: 3560000,
      ticket_count: 78,
      luggage_fees_cash: 146000,
      luggage_fees_momo: 38000,
      luggage_fees_airtel: 16000,
      luggage_fees_total: 200000,
      luggage_count: 24,
      parcel_fees_cash: 285000,
      parcel_fees_momo: 65000,
      parcel_fees_airtel: 40000,
      parcel_fees_total: 390000,
      parcel_count: 19,
      system_expected_cash: 2356000, // 100k float + 1850k + 146k + 285k - 25k expense
      system_expected_momo: 1043000,
      system_expected_airtel: 476000,
      system_expected_card: 350000,
      system_expected_total: 4150000,
      denominations: {
        notes_50k: 40, // 2,000,000
        notes_20k: 15, // 300,000
        notes_10k: 4,  // 40,000
        notes_5k: 3,   // 15,000
        notes_2k: 0,
        notes_1k: 1,   // 1,000
        coins: 0,
      },
      actual_counted_cash: 2356000,
      variance_cash: 0,
      closing_notes: 'Morning shift balanced cleanly. Float and receipt paper expense accounted for.',
    },
    {
      id: 2,
      shift_code: 'SHF-260826-002',
      terminal_id: 3,
      terminal_name: 'Mbarara Main Terminal',
      terminal_city: 'Mbarara',
      cashier_id: 3,
      cashier_name: 'David Tumusiime',
      supervisor_name: 'Agnes Kyomugisha',
      shift_date: '2026-08-26',
      opened_at: '2026-08-26T07:00:00Z',
      closed_at: '2026-08-26T15:00:00Z',
      status: 'reconciled',
      opening_float: 50000,
      cash_in_total: 0,
      cash_out_expenses: 0,
      safe_drops_total: 0,
      cash_refunds_total: 0,
      ticket_sales_cash: 920000,
      ticket_sales_momo: 650000,
      ticket_sales_airtel: 280000,
      ticket_sales_card: 0,
      ticket_sales_total: 1850000,
      ticket_count: 42,
      luggage_fees_cash: 64000,
      luggage_fees_momo: 16000,
      luggage_fees_airtel: 0,
      luggage_fees_total: 80000,
      luggage_count: 10,
      parcel_fees_cash: 135000,
      parcel_fees_momo: 45000,
      parcel_fees_airtel: 20000,
      parcel_fees_total: 200000,
      parcel_count: 12,
      system_expected_cash: 1169000, // 50k + 920k + 64k + 135k
      system_expected_momo: 711000,
      system_expected_airtel: 300000,
      system_expected_card: 0,
      system_expected_total: 2130000,
      denominations: {
        notes_50k: 19, // 950,000
        notes_20k: 8,  // 160,000
        notes_10k: 4,  // 40,000
        notes_5k: 3,   // 15,000
        notes_2k: 2,   // 4,000
        notes_1k: 0,
        coins: 0,
      },
      actual_counted_cash: 1169000,
      variance_cash: 0,
      closing_notes: 'All parcels and tickets reconciled with passenger manifest.',
    },
  ];

  try {
    localStorage.setItem(RECONCILIATIONS_KEY, JSON.stringify(seed));
  } catch {
    // ignore
  }

  return seed;
}

export interface ReconciliationsQuery {
  page?: number;
  perPage?: number;
  terminal_id?: number | string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export async function listReconciliations(
  query: ReconciliationsQuery = {}
): Promise<Paginated<ShiftReconciliation>> {
  const items = getStoredReconciliations();
  let filtered = [...items];

  if (query.terminal_id) {
    filtered = filtered.filter((r) => String(r.terminal_id) === String(query.terminal_id));
  }

  if (query.status) {
    filtered = filtered.filter((r) => r.status === query.status);
  }

  if (query.date_from) {
    filtered = filtered.filter((r) => r.shift_date >= query.date_from!);
  }

  if (query.date_to) {
    filtered = filtered.filter((r) => r.shift_date <= query.date_to!);
  }

  if (query.search?.trim()) {
    filtered = filtered.filter((r) =>
      matches([r.shift_code, r.cashier_name, r.terminal_name, r.terminal_city, r.supervisor_name || ''], query.search!)
    );
  }

  const page = query.page || 1;
  const perPage = query.perPage || 15;
  const start = (page - 1) * perPage;
  const data = filtered.slice(start, start + perPage);

  return {
    data,
    meta: {
      total: filtered.length,
      current_page: page,
      last_page: Math.ceil(filtered.length / perPage) || 1,
      per_page: perPage,
    },
  };
}

export interface ActiveShiftMetrics {
  shift_id: number;
  shift_code: string;
  status: 'open' | 'closed';
  opened_at: string;
  terminal_id: number;
  terminal_name: string;
  terminal_city: string;
  cashier_id: number;
  cashier_name: string;
  supervisor_name?: string;

  // Drawer Inflows & Outflows
  opening_float: number;
  cash_in_total: number;
  cash_out_expenses: number;
  safe_drops_total: number;
  cash_refunds_total: number;
  drawer_transactions: DrawerTransaction[];

  // Revenue Streams
  ticket_sales_cash: number;
  ticket_sales_momo: number;
  ticket_sales_airtel: number;
  ticket_sales_card: number;
  ticket_sales_total: number;
  ticket_count: number;

  luggage_fees_cash: number;
  luggage_fees_momo: number;
  luggage_fees_airtel: number;
  luggage_fees_total: number;
  luggage_count: number;

  parcel_fees_cash: number;
  parcel_fees_momo: number;
  parcel_fees_airtel: number;
  parcel_fees_total: number;
  parcel_count: number;

  // Real-time Expected Cash in Till Math
  system_expected_cash: number;
  system_expected_momo: number;
  system_expected_airtel: number;
  system_expected_card: number;
  system_expected_total: number;
}

function getStoredActiveShift(): ActiveShiftMetrics | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.status === 'open') return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if the current terminal cashier has an active open shift.
 */
export function hasActiveShift(): boolean {
  const shift = getStoredActiveShift();
  return Boolean(shift && shift.status === 'open');
}

/**
 * Computes live current shift counter collections and drawer cash.
 */
export async function getActiveShiftMetrics(terminalId: number = 1): Promise<ActiveShiftMetrics | null> {
  const existing = getStoredActiveShift();
  if (existing) return existing;

  // Default seed open shift if never initialized
  const defaultShift: ActiveShiftMetrics = {
    shift_id: 101,
    shift_code: 'SHF-ACTIVE-001',
    status: 'open',
    opened_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    terminal_id: 1,
    terminal_name: 'Namayiba / Central Terminal',
    terminal_city: 'Kampala',
    cashier_id: 1,
    cashier_name: 'Counter Cashier',
    supervisor_name: 'Robert Mugisha (Station Supervisor)',

    opening_float: 100000,
    cash_in_total: 50000,
    cash_out_expenses: 25000,
    safe_drops_total: 0,
    cash_refunds_total: 0,
    drawer_transactions: [
      {
        id: 1,
        shift_id: 101,
        type: 'float_in',
        amount: 100000,
        category: 'Opening Float',
        reason: 'Shift opening till float change',
        authorized_by: 'Robert Mugisha',
        created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: 2,
        shift_id: 101,
        type: 'cash_in',
        amount: 50000,
        category: 'Midday Float Top-up',
        reason: 'Added 50k in small 1k/2k notes for rush hour change',
        authorized_by: 'Robert Mugisha',
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 3,
        shift_id: 101,
        type: 'petty_expense',
        amount: 25000,
        category: 'Receipt Paper & Sanitizer',
        reason: 'Bought POS receipt roll paper',
        authorized_by: 'Robert Mugisha',
        created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
    ],

    ticket_sales_cash: 680000,
    ticket_sales_momo: 340000,
    ticket_sales_airtel: 150000,
    ticket_sales_card: 70000,
    ticket_sales_total: 1240000,
    ticket_count: 28,

    luggage_fees_cash: 54000,
    luggage_fees_momo: 18000,
    luggage_fees_airtel: 8000,
    luggage_fees_total: 80000,
    luggage_count: 9,

    parcel_fees_cash: 125000,
    parcel_fees_momo: 35000,
    parcel_fees_airtel: 20000,
    parcel_fees_total: 180000,
    parcel_count: 8,

    // 100k (float) + 50k (cash-in) + 680k (tickets) + 54k (luggage) + 125k (parcels) - 25k (expense) = 984,000 UGX
    system_expected_cash: 984000,
    system_expected_momo: 393000,
    system_expected_airtel: 178000,
    system_expected_card: 70000,
    system_expected_total: 1625000,
  };

  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (raw === null) {
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(defaultShift));
      return defaultShift;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Opens a new cashier shift and records starting cash float.
 */
export async function openShift(params: {
  terminal_id: number;
  terminal_name: string;
  terminal_city: string;
  cashier_id: number;
  cashier_name: string;
  supervisor_name?: string;
  starting_float: number;
  notes?: string;
}): Promise<ActiveShiftMetrics> {
  const shiftId = Date.now();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const shiftCode = `SHF-${today}-${String(Math.floor(Math.random() * 900) + 100)}`;

  const newShift: ActiveShiftMetrics = {
    shift_id: shiftId,
    shift_code: shiftCode,
    status: 'open',
    opened_at: new Date().toISOString(),
    terminal_id: params.terminal_id,
    terminal_name: params.terminal_name,
    terminal_city: params.terminal_city,
    cashier_id: params.cashier_id,
    cashier_name: params.cashier_name,
    supervisor_name: params.supervisor_name || 'Station Duty Supervisor',

    opening_float: params.starting_float,
    cash_in_total: 0,
    cash_out_expenses: 0,
    safe_drops_total: 0,
    cash_refunds_total: 0,
    drawer_transactions: [
      {
        id: Date.now(),
        shift_id: shiftId,
        type: 'float_in',
        amount: params.starting_float,
        category: 'Opening Float',
        reason: params.notes || 'Shift opening till float change',
        authorized_by: params.supervisor_name,
        created_at: new Date().toISOString(),
      },
    ],

    ticket_sales_cash: 0,
    ticket_sales_momo: 0,
    ticket_sales_airtel: 0,
    ticket_sales_card: 0,
    ticket_sales_total: 0,
    ticket_count: 0,

    luggage_fees_cash: 0,
    luggage_fees_momo: 0,
    luggage_fees_airtel: 0,
    luggage_fees_total: 0,
    luggage_count: 0,

    parcel_fees_cash: 0,
    parcel_fees_momo: 0,
    parcel_fees_airtel: 0,
    parcel_fees_total: 0,
    parcel_count: 0,

    system_expected_cash: params.starting_float,
    system_expected_momo: 0,
    system_expected_airtel: 0,
    system_expected_card: 0,
    system_expected_total: params.starting_float,
  };

  localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(newShift));
  return newShift;
}

/**
 * Logs a mid-shift drawer movement (cash in, petty expense, safe drop).
 */
export async function logDrawerTransaction(params: {
  shift_id: number;
  type: 'cash_in' | 'petty_expense' | 'safe_drop';
  amount: number;
  category: string;
  reason: string;
  authorized_by?: string;
}): Promise<ActiveShiftMetrics> {
  const shift = getStoredActiveShift();
  if (!shift) {
    throw new Error('Forbidden: You must open a cash drawer shift before recording expenses or movements.');
  }

  const newTx: DrawerTransaction = {
    id: Date.now(),
    shift_id: shift.shift_id,
    type: params.type,
    amount: params.amount,
    category: params.category,
    reason: params.reason,
    authorized_by: params.authorized_by || shift.supervisor_name,
    created_at: new Date().toISOString(),
  };

  const transactions = [newTx, ...(shift.drawer_transactions || [])];

  let cashIn = shift.cash_in_total || 0;
  let cashOut = shift.cash_out_expenses || 0;
  let safeDrops = shift.safe_drops_total || 0;

  if (params.type === 'cash_in') cashIn += params.amount;
  if (params.type === 'petty_expense') cashOut += params.amount;
  if (params.type === 'safe_drop') safeDrops += params.amount;

  const expectedCash =
    shift.opening_float +
    shift.ticket_sales_cash +
    shift.luggage_fees_cash +
    shift.parcel_fees_cash +
    cashIn -
    cashOut -
    safeDrops -
    (shift.cash_refunds_total || 0);

  const updated: ActiveShiftMetrics = {
    ...shift,
    cash_in_total: cashIn,
    cash_out_expenses: cashOut,
    safe_drops_total: safeDrops,
    drawer_transactions: transactions,
    system_expected_cash: expectedCash,
  };

  localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(updated));
  return updated;
}

export interface ShiftCloseoutInput {
  terminal_id: number;
  terminal_name: string;
  terminal_city: string;
  cashier_id: number;
  cashier_name: string;
  supervisor_name?: string;
  metrics: ActiveShiftMetrics;
  denominations: CashDenominations;
  variance_reason?: string;
  closing_notes?: string;
}

export async function submitShiftCloseout(input: ShiftCloseoutInput): Promise<ShiftReconciliation> {
  const items = getStoredReconciliations();
  const countedCash = calculateCountedCash(input.denominations);
  const variance = countedCash - input.metrics.system_expected_cash;
  const status = variance === 0 ? 'reconciled' : Math.abs(variance) <= 1000 ? 'reconciled' : 'flagged';

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const shiftNumber = String(items.length + 1).padStart(3, '0');
  const shiftCode = input.metrics.shift_code || `SHF-${today}-${shiftNumber}`;

  const record: ShiftReconciliation = {
    id: Date.now(),
    shift_code: shiftCode,
    terminal_id: input.terminal_id,
    terminal_name: input.terminal_name,
    terminal_city: input.terminal_city,
    cashier_id: input.cashier_id,
    cashier_name: input.cashier_name,
    supervisor_name: input.supervisor_name || 'Station Duty Supervisor',
    shift_date: new Date().toISOString().slice(0, 10),
    opened_at: input.metrics.opened_at || new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    closed_at: new Date().toISOString(),
    status,

    opening_float: input.metrics.opening_float,
    cash_in_total: input.metrics.cash_in_total,
    cash_out_expenses: input.metrics.cash_out_expenses,
    safe_drops_total: input.metrics.safe_drops_total,
    cash_refunds_total: input.metrics.cash_refunds_total,
    drawer_transactions: input.metrics.drawer_transactions,

    ticket_sales_cash: input.metrics.ticket_sales_cash,
    ticket_sales_momo: input.metrics.ticket_sales_momo,
    ticket_sales_airtel: input.metrics.ticket_sales_airtel,
    ticket_sales_card: input.metrics.ticket_sales_card,
    ticket_sales_total: input.metrics.ticket_sales_total,
    ticket_count: input.metrics.ticket_count,

    luggage_fees_cash: input.metrics.luggage_fees_cash,
    luggage_fees_momo: input.metrics.luggage_fees_momo,
    luggage_fees_airtel: input.metrics.luggage_fees_airtel,
    luggage_fees_total: input.metrics.luggage_fees_total,
    luggage_count: input.metrics.luggage_count,

    parcel_fees_cash: input.metrics.parcel_fees_cash,
    parcel_fees_momo: input.metrics.parcel_fees_momo,
    parcel_fees_airtel: input.metrics.parcel_fees_airtel,
    parcel_fees_total: input.metrics.parcel_fees_total,
    parcel_count: input.metrics.parcel_count,

    system_expected_cash: input.metrics.system_expected_cash,
    system_expected_momo: input.metrics.system_expected_momo,
    system_expected_airtel: input.metrics.system_expected_airtel,
    system_expected_card: input.metrics.system_expected_card,
    system_expected_total: input.metrics.system_expected_total,

    denominations: input.denominations,
    actual_counted_cash: countedCash,
    variance_cash: variance,
    variance_reason: input.variance_reason,
    closing_notes: input.closing_notes,
  };

  items.unshift(record);
  localStorage.setItem(RECONCILIATIONS_KEY, JSON.stringify(items));

  // Shift is now officially closed & locked. Next shift must declare fresh float.
  localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify({ status: 'closed' }));
  return record;
}
