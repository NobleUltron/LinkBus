import type { Bus, BusRoute, Trip, TripSeat, TripStatus } from '../types/models';
import { baseFareForDistance } from './network';

/** Small deterministic PRNG so the mock dataset is identical on every load. */
export function makeRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = state * 16807 % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export const SEAT_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function generateSeats(trip: Trip, bus: Bus, startId: number): TripSeat[] {
  const rows = Math.ceil(bus.capacity / 4);
  const vipRows = bus.bus_type === 'standard' ? 2 : 3;
  const seats: TripSeat[] = [];
  let id = startId;

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (seats.length >= bus.capacity) break;
      seats.push({
        id: id++,
        trip_id: trip.id,
        seat_number: `${row}${SEAT_LETTERS[col]}`,
        seat_class: row <= vipRows ? 'vip' : 'standard',
        status: 'available'
      });
    }
  }
  return seats;
}

function atHour(base: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function statusFor(departure: Date, arrival: Date): TripStatus {
  const now = Date.now();
  if (arrival.getTime() < now) return 'completed';
  if (departure.getTime() <= now) return 'in_transit';
  if (departure.getTime() - now <= 30 * 60000) return 'boarding';
  return 'scheduled';
}

const DEPARTURE_TEMPLATES: Record<number, {hour: number;minute: number;busId: number;driverId: number;}[]> = {
  1: [
  { hour: 6, minute: 30, busId: 1, driverId: 1 },
  { hour: 10, minute: 0, busId: 2, driverId: 2 },
  { hour: 15, minute: 30, busId: 7, driverId: 3 }],

  2: [
  { hour: 7, minute: 0, busId: 2, driverId: 2 },
  { hour: 14, minute: 0, busId: 1, driverId: 1 }],

  3: [
  { hour: 7, minute: 15, busId: 3, driverId: 3 },
  { hour: 12, minute: 45, busId: 4, driverId: 2 },
  { hour: 17, minute: 0, busId: 8, driverId: 1 }],

  4: [
  { hour: 8, minute: 0, busId: 3, driverId: 3 },
  { hour: 16, minute: 30, busId: 4, driverId: 2 }],

  5: [
  { hour: 6, minute: 0, busId: 8, driverId: 1 },
  { hour: 13, minute: 30, busId: 7, driverId: 3 }],

  6: [{ hour: 9, minute: 0, busId: 8, driverId: 1 }],
  7: [{ hour: 21, minute: 0, busId: 5, driverId: 3 }],
  8: [{ hour: 20, minute: 30, busId: 10, driverId: 3 }],
  9: [
  { hour: 8, minute: 30, busId: 4, driverId: 2 },
  { hour: 11, minute: 30, busId: 4, driverId: 2 },
  { hour: 18, minute: 0, busId: 7, driverId: 1 }],

  10: [{ hour: 10, minute: 0, busId: 4, driverId: 2 }],
  11: [
  { hour: 7, minute: 45, busId: 2, driverId: 1 },
  { hour: 14, minute: 15, busId: 7, driverId: 2 }],

  12: [{ hour: 8, minute: 15, busId: 2, driverId: 1 }]
};

export const TRIP_DAY_RANGE = { from: -4, to: 10 };

export function generateTrips(routes: BusRoute[], buses: Bus[]): Trip[] {
  const trips: Trip[] = [];
  const base = new Date();
  let id = 1;

  for (let day = TRIP_DAY_RANGE.from; day <= TRIP_DAY_RANGE.to; day += 1) {
    routes.forEach((route) => {
      const template = DEPARTURE_TEMPLATES[route.id];
      if (!template || route.status !== 'active') return;

      template.forEach((slot) => {
        const bus = buses.find((b) => b.id === slot.busId);
        if (!bus) return;
        const departure = atHour(base, day, slot.hour, slot.minute);
        const arrival = new Date(departure.getTime() + route.estimated_duration_minutes * 60000);
        const status = statusFor(departure, arrival);
        const premium = bus.bus_type === 'standard' ? 0 : bus.bus_type === 'vip' ? 800 : 1200;

        trips.push({
          id: id++,
          route_id: route.id,
          bus_id: bus.id,
          driver_id: slot.driverId,
          departure_time: departure.toISOString(),
          arrival_time: arrival.toISOString(),
          fare: baseFareForDistance(route.distance_km) + premium,
          status: bus.status === 'maintenance' && day > 0 ? 'cancelled' : status,
          available_seats: bus.capacity
        });
      });
    });
  }

  return trips;
}