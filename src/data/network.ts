import type { BusRoute, Terminal } from '../types/models';

const KAMPALA_PHOTO = "/88f6bae5-3866-445a-aeef-eb1351f1b0b8.jpg";
const REGIONAL_PHOTO = "/3c451714-6737-4cb5-89dc-a8822e9eeca6.jpg";

export const terminalsSeed: Terminal[] = [
{ id: 1, name: 'Namayiba Central', city: 'Kampala', address: 'Nakivubo Rd, Namayiba', latitude: 0.3152, longitude: 32.5816, status: 'active', photo: KAMPALA_PHOTO },
{ id: 2, name: 'Masaka Main Station', city: 'Masaka', address: 'Kampala–Masaka Rd', latitude: -0.3417, longitude: 31.7361, status: 'active', photo: REGIONAL_PHOTO },
{ id: 3, name: 'Jinja Terminal', city: 'Jinja', address: 'Main Street, Jinja', latitude: 0.4244, longitude: 33.2041, status: 'active', photo: REGIONAL_PHOTO },
{ id: 4, name: 'Mbale Eastern Station', city: 'Mbale', address: 'Republic Street, Mbale', latitude: 1.0784, longitude: 34.1755, status: 'active', photo: REGIONAL_PHOTO },
{ id: 5, name: 'Fort Portal Western Hub', city: 'Fort Portal', address: 'Kasese Rd, Fort Portal', latitude: 0.6544, longitude: 30.2751, status: 'active', photo: null },
{ id: 6, name: 'Entebbe Lakeside', city: 'Entebbe', address: 'Airport Rd, Entebbe', latitude: 0.0512, longitude: 32.4630, status: 'active', photo: null },
{ id: 7, name: 'Hoima Northern Station', city: 'Hoima', address: 'Hoima Town Centre', latitude: 1.4356, longitude: 31.3524, status: 'active', photo: REGIONAL_PHOTO },
{ id: 8, name: 'Kalangala Bay', city: 'Kalangala', address: 'Bugoma Landing Site', latitude: -0.3086, longitude: 32.2939, status: 'inactive', photo: null }];


export const routesSeed: BusRoute[] = [
{ id: 1, origin_terminal_id: 1, destination_terminal_id: 2, distance_km: 135, estimated_duration_minutes: 165, status: 'active' },
{ id: 2, origin_terminal_id: 2, destination_terminal_id: 1, distance_km: 135, estimated_duration_minutes: 165, status: 'active' },
{ id: 3, origin_terminal_id: 1, destination_terminal_id: 3, distance_km: 105, estimated_duration_minutes: 130, status: 'active' },
{ id: 4, origin_terminal_id: 3, destination_terminal_id: 1, distance_km: 105, estimated_duration_minutes: 130, status: 'active' },
{ id: 5, origin_terminal_id: 1, destination_terminal_id: 4, distance_km: 157, estimated_duration_minutes: 195, status: 'active' },
{ id: 6, origin_terminal_id: 4, destination_terminal_id: 1, distance_km: 157, estimated_duration_minutes: 195, status: 'active' },
{ id: 7, origin_terminal_id: 1, destination_terminal_id: 5, distance_km: 305, estimated_duration_minutes: 390, status: 'active' },
{ id: 8, origin_terminal_id: 5, destination_terminal_id: 1, distance_km: 305, estimated_duration_minutes: 390, status: 'active' },
{ id: 9, origin_terminal_id: 1, destination_terminal_id: 6, distance_km: 47, estimated_duration_minutes: 60, status: 'active' },
{ id: 10, origin_terminal_id: 6, destination_terminal_id: 1, distance_km: 47, estimated_duration_minutes: 60, status: 'active' },
{ id: 11, origin_terminal_id: 1, destination_terminal_id: 7, distance_km: 158, estimated_duration_minutes: 180, status: 'active' },
{ id: 12, origin_terminal_id: 7, destination_terminal_id: 1, distance_km: 158, estimated_duration_minutes: 180, status: 'active' },
{ id: 13, origin_terminal_id: 1, destination_terminal_id: 8, distance_km: 137, estimated_duration_minutes: 175, status: 'inactive' },
{ id: 14, origin_terminal_id: 8, destination_terminal_id: 1, distance_km: 137, estimated_duration_minutes: 175, status: 'inactive' }];


/** Base fare derived from distance, rounded to the nearest 100 shillings. */
export function baseFareForDistance(distanceKm: number): number {
  return Math.round(distanceKm * 240 / 100) * 100;
}