import type { Booking, Bus, BusRoute, Driver, Terminal, Ticket, Trip, TripSeat, User } from './models';

/** Mirrors Laravel's paginate() envelope. */
export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface TripSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
}

/** A trip joined with its route, terminals, bus and driver — as the API returns it. */
export interface TripDetail extends Trip {
  route: BusRoute;
  origin: Terminal;
  destination: Terminal;
  bus: Bus;
  driver: Driver;
  driver_user: User | null;
  seats: TripSeat[];
}

export interface BookingDetail extends Booking {
  trip: TripDetail;
  tickets: Ticket[];
  seats: TripSeat[];
  passenger: User | null;
  linked_booking: Booking | null;
}

export interface PromoValidation {
  code: string;
  description: string;
  discount: number;
}

export interface DashboardStats {
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
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}