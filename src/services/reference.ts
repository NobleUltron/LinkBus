import type { Bus, BusRoute, Driver, Role, Terminal, User } from '../types/models';
import { api } from './api-client';

export interface ReferenceData {
  terminals: Terminal[];
  routes: BusRoute[];
  buses: Bus[];
  drivers: (Driver & { name: string })[];
  users: User[];
  roles: Role[];
}

const DEFAULT_ROLES: Role[] = [
  { id: 1, name: 'Administrator', slug: 'admin', description: 'Full system access' },
  { id: 2, name: 'Staff', slug: 'staff', description: 'Ticketing & operations staff' },
  { id: 3, name: 'Driver', slug: 'driver', description: 'Bus driver' },
  { id: 4, name: 'Passenger', slug: 'passenger', description: 'Ticket-purchasing passenger' },
];

/** One call that feeds every select in the admin forms. */
export async function getReferenceData(): Promise<ReferenceData> {
  const [terminalsData, routesData, busesData, driversData, rolesData, usersData] = await Promise.all([
    api.get<{ terminals: Terminal[] }>('/terminals').catch(() => ({ terminals: [] })),
    api.get<{
      routes: Array<{
        id: number;
        distance_km: number;
        estimated_duration_minutes: number;
        status: 'active' | 'inactive';
        origin: { id: number; name: string; city: string };
        destination: { id: number; name: string; city: string };
      }>;
    }>('/routes').catch(() => ({ routes: [] })),
    api.get<{ buses: Bus[] }>('/buses').catch(() => ({ buses: [] })),
    api.get<{
      drivers: Array<{
        id: number;
        user_id: number;
        name: string;
        email: string;
        phone: string;
        license_number: string;
        license_expiry: string;
        status: Driver['status'];
        experience_years: number;
        notes: string;
      }>;
    }>('/drivers').catch(() => ({ drivers: [] })),
    api.get<{ roles?: Role[]; data?: Role[] }>('/roles').catch(() => ({ roles: DEFAULT_ROLES })),
    api.get<{ users?: User[]; data?: User[] }>('/admin/users').catch(() => ({ users: [] })),
  ]);

  const routes: BusRoute[] = (routesData.routes || []).map((r) => ({
    id: r.id,
    origin_terminal_id: r.origin.id,
    destination_terminal_id: r.destination.id,
    distance_km: r.distance_km,
    estimated_duration_minutes: r.estimated_duration_minutes,
    status: r.status,
  }));

  const drivers = (driversData.drivers || []).map((d) => ({
    id: d.id,
    user_id: d.user_id,
    name: d.name,
    license_number: d.license_number,
    license_expiry: d.license_expiry,
    status: d.status,
    experience_years: d.experience_years,
    notes: d.notes ?? '',
  }));

  const fetchedRoles: Role[] = rolesData.roles ?? rolesData.data ?? [];
  const roles: Role[] = fetchedRoles.length > 0 ? fetchedRoles : DEFAULT_ROLES;
  const users: User[] = usersData.users ?? usersData.data ?? [];

  return {
    terminals: terminalsData.terminals || [],
    routes,
    buses: busesData.buses || [],
    drivers,
    users,
    roles,
  };
}

export function routeName(routes: BusRoute[], terminals: Terminal[], routeId: number): string {
  const route = routes.find((r) => r.id === routeId);
  if (!route) return '—';
  const origin = terminals.find((t) => t.id === route.origin_terminal_id);
  const destination = terminals.find((t) => t.id === route.destination_terminal_id);
  return `${origin?.city ?? '—'} → ${destination?.city ?? '—'}`;
}