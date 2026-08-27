import type { BookingDetail, DashboardStats, Paginated } from '../types/api';
import type { Payment } from '../types/models';
import { api, ApiRequestError } from './api-client';
import { matches, paginate } from './http';

export type PaymentCategory = 'bus_ticket' | 'excess_luggage' | 'parcel_freight';

export interface PaymentDetail {
  id: number;
  transaction_id: string;
  category?: PaymentCategory;
  reference_type?: 'booking' | 'luggage_tag' | 'parcel_waybill';
  reference_number?: string;
  customer_name?: string;
  customer_phone?: string;
  booking_id?: number;
  booking_number: string;
  passenger_name: string;
  passenger_phone?: string;
  route: string;
  method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

/** GET /api/reports/dashboard */
export async function getDashboardStats(timeframe: Timeframe = '30days'): Promise<DashboardStats> {
  try {
    const data = await api.get<{
      total_users: number;
      total_buses: number;
      total_routes: number;
      revenue: number;
      trends: {
        users: number;
        buses: number;
        routes: number;
        revenue: number;
      };
      revenue_chart: { label: string; date?: string; revenue: number }[];
      bookings_chart: { label: string; date?: string; bookings: number }[];
      top_routes: { label: string; value: number }[];
      recent_bookings: BookingDetail[];
    }>('/reports/dashboard', { timeframe });

    return {
      total_users: data.total_users ?? 0,
      total_buses: data.total_buses ?? 0,
      total_routes: data.total_routes ?? 0,
      revenue: data.revenue ?? 0,
      trends: data.trends ?? {
        users: 0,
        buses: 0,
        routes: 0,
        revenue: 0,
      },
      revenue_chart: data.revenue_chart ?? [],
      bookings_chart: data.bookings_chart ?? [],
      top_routes: data.top_routes ?? [],
      recent_bookings: data.recent_bookings ?? [],
    };
  } catch {
    return {
      total_users: 0,
      total_buses: 0,
      total_routes: 0,
      revenue: 0,
      trends: {
        users: 0,
        buses: 0,
        routes: 0,
        revenue: 0,
      },
      revenue_chart: [],
      bookings_chart: [],
      top_routes: [],
      recent_bookings: [],
    };
  }
}

export interface StaffDashboard {
  trips_today: number;
  bookings_today: number;
  check_ins_today: number;
  revenue_today: number;
  schedule: {
    trip_id: number;
    route: string;
    departure_time: string;
    bus: string;
    status: string;
    booked: number;
    capacity: number;
  }[];
}

/** GET /api/staff/dashboard */
export async function getStaffDashboard(): Promise<StaffDashboard> {
  try {
    const data = await api.get<{
      today: { revenue: number; bookings: number; trips: number; passengers: number };
      schedule?: StaffDashboard['schedule'];
    }>('/reports/dashboard');

    return {
      trips_today: data.today?.trips ?? 0,
      bookings_today: data.today?.bookings ?? 0,
      check_ins_today: data.today?.passengers ?? 0,
      revenue_today: data.today?.revenue ?? 0,
      schedule: data.schedule ?? [],
    };
  } catch {
    return {
      trips_today: 0,
      bookings_today: 0,
      check_ins_today: 0,
      revenue_today: 0,
      schedule: [],
    };
  }
}

export interface ReportRow {
  id?: number;
  route: string;
  departures: number;
  passengers: number;
  occupancy: number;
  revenue: number;
}

export interface ReportData {
  summary: {
    revenue: number;
    bookings: number;
    passengers: number;
    average_fare: number;
    cancellations: number;
    occupancy: number;
  };
  revenue_series: { label: string; revenue: number; bookings: number }[];
  payment_mix: { label: string; value: number }[];
  rows: ReportRow[];
}

/** GET /api/reports/revenue */
export async function getReport(params: { date_from: string; date_to: string }): Promise<ReportData> {
  try {
    const data = await api.get<{
      total: number;
      summary: {
        revenue: number;
        bookings: number;
        passengers: number;
        average_fare: number;
        cancellations: number;
        occupancy: number;
      };
      revenue_series: Array<{ label: string; revenue: number; bookings: number }>;
      payment_mix: Array<{ label: string; value: number }>;
      rows: ReportRow[];
    }>('/reports/revenue', { from: params.date_from, to: params.date_to });

    return {
      summary: {
        revenue: data.summary?.revenue ?? data.total ?? 0,
        bookings: data.summary?.bookings ?? 0,
        passengers: data.summary?.passengers ?? 0,
        average_fare: data.summary?.average_fare ?? 0,
        cancellations: data.summary?.cancellations ?? 0,
        occupancy: data.summary?.occupancy ?? 0,
      },
      revenue_series: data.revenue_series ?? [],
      payment_mix: data.payment_mix ?? [],
      rows: (data.rows ?? []).map((row, idx) => ({
        ...row,
        id: row.id ?? idx + 1,
      })),
    };
  } catch {
    return {
      summary: { revenue: 0, bookings: 0, passengers: 0, average_fare: 0, cancellations: 0, occupancy: 0 },
      revenue_series: [],
      payment_mix: [],
      rows: [],
    };
  }
}

/** GET /api/reports/revenue/export/excel - Stream genuine XLSX binary workbook */
export async function exportReportExcel(params: { date_from: string; date_to: string }): Promise<string> {
  return api.download(
    '/reports/revenue/export/excel',
    { from: params.date_from, to: params.date_to },
    `linkbus-financial-report-${params.date_from}-to-${params.date_to}.xlsx`
  );
}

export function buildReportCsv(report: ReportData, params: { date_from: string; date_to: string }): string {
  const lines: string[] = [];
  // UTF-8 BOM for direct Microsoft Excel compatibility
  lines.push('\uFEFF"LINKBUS SERVICES LTD — OPERATIONAL & FINANCIAL REPORT"');
  lines.push(`"Reporting Period:","${params.date_from} to ${params.date_to}"`);
  lines.push(`"Export Generated:","${new Date().toISOString()}"`);
  lines.push(`"Station HQ:","Kampala Central Terminal"`);
  lines.push('');

  // 1. Executive Key Performance Indicators
  lines.push('"1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)"');
  lines.push('"Metric","Value"');
  lines.push(`"Gross Period Revenue (UGX)",${report.summary.revenue}`);
  lines.push(`"Total Confirmed Bookings",${report.summary.bookings}`);
  lines.push(`"Total Passengers Transported",${report.summary.passengers}`);
  lines.push(`"Average Ticket Fare (UGX)",${report.summary.average_fare}`);
  lines.push(`"Fleet Seat Occupancy Rate","${report.summary.occupancy}%"`);
  lines.push(`"Cancelled / Refunded Bookings",${report.summary.cancellations}`);
  lines.push('');

  // 2. Payment Channel Settlement Breakdown
  if (report.payment_mix && report.payment_mix.length > 0) {
    const totalPayments = report.payment_mix.reduce((sum, item) => sum + item.value, 0);
    lines.push('"2. PAYMENT GATEWAY SETTLEMENT BREAKDOWN"');
    lines.push('"Payment Method / Channel","Revenue (UGX)","Share %"');
    for (const p of report.payment_mix) {
      const share = totalPayments > 0 ? Math.round((p.value / totalPayments) * 100) : 0;
      lines.push(`"${p.label}",${p.value},"${share}%"`);
    }
    lines.push(`"Total Channel Settlements",${totalPayments},"100%"`);
    lines.push('');
  }

  // 3. Daily Trajectory Series
  if (report.revenue_series && report.revenue_series.length > 0) {
    lines.push('"3. DAILY REVENUE & BOOKING TRAJECTORY"');
    lines.push('"Date","Daily Bookings","Gross Revenue (UGX)"');
    for (const d of report.revenue_series) {
      lines.push(`"${d.label}",${d.bookings},${d.revenue}`);
    }
    lines.push('');
  }

  // 4. Corridor Performance Breakdown Ledger
  lines.push('"4. CORRIDOR PERFORMANCE BREAKDOWN LEDGER"');
  lines.push('"Corridor / Route Name","Departures","Total Passengers","Seat Load Factor %","Gross Revenue (UGX)"');
  let totalDepartures = 0;
  let totalPassengers = 0;
  let totalRevenue = 0;

  for (const r of report.rows) {
    totalDepartures += r.departures;
    totalPassengers += r.passengers;
    totalRevenue += r.revenue;
    lines.push(`"${r.route.replace(/"/g, '""')}",${r.departures},${r.passengers},"${r.occupancy}%",${r.revenue}`);
  }

  const avgOccupancy = report.rows.length > 0
    ? Math.round(report.rows.reduce((sum, r) => sum + r.occupancy, 0) / report.rows.length)
    : 0;

  lines.push(`"GRAND TOTAL (${report.rows.length} CORRIDORS)",${totalDepartures},${totalPassengers},"${avgOccupancy}%",${totalRevenue}`);

  return lines.join('\r\n');
}

/** GET /api/admin/payments */
export async function listPayments(query: {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  status?: string;
  method?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<PaymentDetail>> {
  try {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      per_page: query.perPage ?? 15,
    };
    if (query.search) params.search = query.search;
    if (query.category) params.category = query.category;
    if (query.status) params.status = query.status;
    if (query.method) params.method = query.method;
    if (query.date) params.date = query.date;
    if (query.from ?? query.date_from) params.from = (query.from ?? query.date_from)!;
    if (query.to ?? query.date_to) params.to = (query.to ?? query.date_to)!;

    const res = await api.get<{
      data: PaymentDetail[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>('/admin/payments', { params });

    return {
      data: res.data ?? [],
      meta: {
        current_page: res.meta?.current_page ?? 1,
        per_page: res.meta?.per_page ?? 15,
        total: res.meta?.total ?? 0,
        last_page: res.meta?.last_page ?? 1,
      },
    };
  } catch {
    return paginate([], query.page ?? 1, query.perPage ?? 15);
  }
}

/** PUT /api/admin/payments/{id}/status */
export async function updatePaymentStatus(
  paymentId: number,
  status: 'completed' | 'pending' | 'failed' | 'refunded'
): Promise<Payment> {
  return api.put<Payment>(`/admin/payments/${paymentId}/status`, { status });
}