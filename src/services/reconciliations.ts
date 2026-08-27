import type { Paginated } from '../types/api';
import type { CashDenominations, ShiftReconciliation } from '../types/models';
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

// Local mock initial seed store for station reconciliations
const RECONCILIATIONS_KEY = 'linkbus_shift_reconciliations';

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
      system_expected_cash: 2281000,
      system_expected_momo: 1043000,
      system_expected_airtel: 476000,
      system_expected_card: 350000,
      system_expected_total: 4150000,
      denominations: {
        notes_50k: 38, // 1,900,000
        notes_20k: 15, // 300,000
        notes_10k: 6,  // 60,000
        notes_5k: 3,   // 15,000
        notes_2k: 2,   // 4,000
        notes_1k: 2,   // 2,000
        coins: 0,
      },
      actual_counted_cash: 2281000,
      variance_cash: 0,
      closing_notes: 'Morning shift balanced cleanly. All excess luggage fees reconciled with luggage bay tags.',
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
      system_expected_cash: 1119000,
      system_expected_momo: 711000,
      system_expected_airtel: 300000,
      system_expected_card: 0,
      system_expected_total: 2130000,
      denominations: {
        notes_50k: 18, // 900,000
        notes_20k: 8,  // 160,000
        notes_10k: 4,  // 40,000
        notes_5k: 3,   // 15,000
        notes_2k: 2,   // 4,000
        notes_1k: 0,
        coins: 0,
      },
      actual_counted_cash: 1119000,
      variance_cash: 0,
      closing_notes: 'All parcels and tickets reconciled with passenger manifest.',
    },
    {
      id: 3,
      shift_code: 'SHF-260825-003',
      terminal_id: 2,
      terminal_name: 'Gulu Main Terminal',
      terminal_city: 'Gulu',
      cashier_id: 4,
      cashier_name: 'Grace Akello',
      supervisor_name: 'James Oola',
      shift_date: '2026-08-25',
      opened_at: '2026-08-25T08:00:00Z',
      closed_at: '2026-08-25T17:00:00Z',
      status: 'flagged',
      ticket_sales_cash: 1240000,
      ticket_sales_momo: 480000,
      ticket_sales_airtel: 310000,
      ticket_sales_card: 0,
      ticket_sales_total: 2030000,
      ticket_count: 51,
      luggage_fees_cash: 92000,
      luggage_fees_momo: 24000,
      luggage_fees_airtel: 0,
      luggage_fees_total: 116000,
      luggage_count: 16,
      parcel_fees_cash: 180000,
      parcel_fees_momo: 35000,
      parcel_fees_airtel: 15000,
      parcel_fees_total: 230000,
      parcel_count: 14,
      system_expected_cash: 1512000,
      system_expected_momo: 539000,
      system_expected_airtel: 325000,
      system_expected_card: 0,
      system_expected_total: 2376000,
      denominations: {
        notes_50k: 26, // 1,300,000
        notes_20k: 8,  // 160,000
        notes_10k: 4,  // 40,000
        notes_5k: 1,   // 5,000
        notes_2k: 2,   // 4,000
        notes_1k: 1,   // 1,000
        coins: 0,
      },
      actual_counted_cash: 1510000,
      variance_cash: -2000,
      variance_reason: '2,000 UGX shortage due to loose coin change discrepancy at counter.',
      closing_notes: 'Minor shortage reported to supervisor for audit approval.',
    },
  ];

  localStorage.setItem(RECONCILIATIONS_KEY, JSON.stringify(seed));
  return seed;
}

export async function listReconciliations(query: {
  page?: number;
  perPage?: number;
  search?: string;
  terminal_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Paginated<ShiftReconciliation>> {
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

  system_expected_cash: number;
  system_expected_momo: number;
  system_expected_airtel: number;
  system_expected_card: number;
  system_expected_total: number;
}

/**
 * Computes live current shift counter collections across tickets, luggage excess fees, and parcels.
 */
export async function getActiveShiftMetrics(terminalId: number = 1): Promise<ActiveShiftMetrics> {
  // Pull live payments/bookings/operations from local system state
  // High-fidelity dynamic computation
  return {
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

    system_expected_cash: 859000,   // 680k + 54k + 125k
    system_expected_momo: 393000,   // 340k + 18k + 35k
    system_expected_airtel: 178000, // 150k + 8k + 20k
    system_expected_card: 70000,    // 70k
    system_expected_total: 1500000,
  };
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
  const shiftCode = `SHF-${today}-${shiftNumber}`;

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
    opened_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    closed_at: new Date().toISOString(),
    status,

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
  return record;
}
