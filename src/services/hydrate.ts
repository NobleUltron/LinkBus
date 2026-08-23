import type { BookingDetail, TripDetail } from '../types/api';
import type { Booking, Terminal, Trip } from '../types/models';

const fallbackTerminal: Terminal = {
  id: 0,
  name: 'Unknown terminal',
  city: '—',
  address: '',
  latitude: 0,
  longitude: 0,
  status: 'inactive',
  photo: null,
};

export function hydrateTrip(trip: Trip): TripDetail {
  return (trip as unknown) as TripDetail;
}

export function hydrateBooking(booking: Booking): BookingDetail {
  return (booking as unknown) as BookingDetail;
}

export function routeLabel(_routeId: number): string {
  return 'Route';
}

export function driverName(_driverId: number): string {
  return 'Driver';
}