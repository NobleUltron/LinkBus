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
  tag_number: string;
  description: string;
  weight_kg: number;
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