export type RoleSlug = 'admin' | 'staff' | 'passenger' | 'driver';

export interface Role {
  id: number;
  name: string;
  slug: RoleSlug;
  description: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  role_id: number;
  role: RoleSlug;
  role_name?: string;
  is_driver: boolean;
  is_active?: boolean;
  two_factor_enabled?: boolean;
  driver_id?: number | null;
  driver?: Driver | null;
  created_at: string;
}

export type TerminalStatus = 'active' | 'inactive';

export interface Terminal {
  id: number;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  status: TerminalStatus;
  photo: string | null;
}

export interface BusRoute {
  id: number;
  origin_terminal_id: number;
  destination_terminal_id: number;
  distance_km: number;
  estimated_duration_minutes: number;
  status: 'active' | 'inactive';
  origin?: {
    id?: number;
    name?: string;
    city?: string;
  };
  destination?: {
    id?: number;
    name?: string;
    city?: string;
  };
}

export type BusType = 'standard' | 'vip' | 'sleeper';

export interface Bus {
  id: number;
  plate_number: string;
  model: string;
  bus_type: BusType;
  capacity: number;
  status: 'active' | 'maintenance' | 'retired';
  notes: string;
}

export interface Driver {
  id: number;
  user_id: number;
  license_number: string;
  license_expiry: string;
  status: 'active' | 'suspended' | 'on_leave';
  experience_years: number;
  notes: string;
}

export type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'completed' | 'cancelled';

export interface Trip {
  id: number;
  route_id: number;
  bus_id: number;
  driver_id: number;
  departure_time: string;
  arrival_time: string;
  fare: number;
  status: TripStatus;
  available_seats: number;
}

export type SeatClass = 'standard' | 'vip';
export type SeatStatus = 'available' | 'locked' | 'booked';

export interface TripSeat {
  id: number;
  trip_id: number;
  seat_number: string;
  seat_class: SeatClass;
  status: SeatStatus;
  locked_by_me?: boolean;
  lock_expires_at?: string | null;
  locked_by_name?: string | null;
  locked_by_phone?: string | null;
}

export interface SeatLock {
  id: number;
  user_id: number;
  trip_id: number;
  seat_id: number;
  expires_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentMethod = 'cash' | 'mtn_mobile_money' | 'airtel_money' | 'card';

export interface Booking {
  id: number;
  booking_number: string;
  user_id: number;
  trip_id: number;
  status: BookingStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  linked_booking_id: number | null;
  cancellation_fee: number;
  cancelled_at: string | null;
  notes: string;
  created_at: string;
}

export type TicketStatus = 'active' | 'used' | 'cancelled';

export interface Ticket {
  id: number;
  booking_id: number;
  trip_seat_id: number;
  passenger_name: string;
  passenger_phone: string;
  ticket_number: string;
  qr_code: string;
  status: TicketStatus;
  boarded_at: string | null;
}

export interface Payment {
  id: number;
  booking_id: number;
  method: PaymentMethod;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id: string;
  created_at: string;
}

export interface Luggage {
  id: number;
  booking_id: number;
  trip_seat_id: number | null;
  shift_id?: number | null;
  tag_number: string;
  description: string;
  weight_kg: number;
  payment_method?: PaymentMethod;
  price?: number;
  excess_fee?: number;
  status: 'checked_in' | 'in_transit' | 'delivered' | 'lost';
  notes: string;
}

export interface Parcel {
  id: number;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  origin_terminal_id: number;
  destination_terminal_id: number;
  weight_kg: number;
  description: string;
  tracking_number: string;
  status: 'received' | 'in_transit' | 'arrived' | 'delivered' | 'lost';
  price: number;
  notes: string;
  created_at: string;
}

export interface PromoCode {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_amount: number;
  max_uses: number;
  used_count: number;
  max_uses_per_user?: number;
  first_booking_only?: boolean;
  is_active: boolean;
  expires_at: string;
}

export interface Advertisement {
  id: number;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  type: 'banner' | 'popup' | 'sidebar';
  status: 'active' | 'inactive';
  start_date: string;
  end_date: string;
  priority: number;
}

export type SettingGroup = 'company' | 'booking' | 'payment' | 'luggage' | 'notifications' | 'subscribers';

export interface Setting {
  id: number;
  key: string;
  value: string;
  group: SettingGroup;
  description: string;
}

export interface AppNotification {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, string | number> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: number;
  user_id: number | null;
  channel: 'sms' | 'email' | 'in_app';
  recipient: string;
  title: string | null;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated';
  error_message: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  model_type: string;
  model_id: number;
  old_values: string;
  new_values: string;
  created_at: string;
}

export type ReconciliationStatus = 'open' | 'reconciled' | 'flagged' | 'audited';

export interface CashDenominations {
  notes_50k: number; // UGX 50,000
  notes_20k: number; // UGX 20,000
  notes_10k: number; // UGX 10,000
  notes_5k: number;  // UGX 5,000
  notes_2k: number;  // UGX 2,000
  notes_1k: number;  // UGX 1,000
  coins: number;     // UGX 500, 200, 100, 50
}

export interface DrawerTransaction {
  id: number;
  shift_id: number;
  type: 'float_in' | 'cash_in' | 'petty_expense' | 'safe_drop' | 'refund';
  amount: number;
  category: string;
  reason: string;
  authorized_by?: string;
  created_at: string;
}

export interface ShiftReconciliation {
  id: number;
  shift_code: string;
  terminal_id: number;
  terminal_name: string;
  terminal_city: string;
  cashier_id: number;
  cashier_name: string;
  supervisor_name?: string;
  shift_date: string;
  opened_at: string;
  closed_at: string;
  status: ReconciliationStatus;

  // Drawer Opening Float & Cash Movements
  opening_float: number;
  cash_in_total: number;
  cash_out_expenses: number;
  safe_drops_total: number;
  cash_refunds_total: number;
  drawer_transactions?: DrawerTransaction[];

  // Breakdown by Category
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

  // Expected Totals
  system_expected_cash: number;
  system_expected_momo: number;
  system_expected_airtel: number;
  system_expected_card: number;
  system_expected_total: number;

  // Physical Count
  denominations: CashDenominations;
  actual_counted_cash: number;

  // Variance & Discrepancy
  variance_cash: number;
  variance_reason?: string;
  closing_notes?: string;
}