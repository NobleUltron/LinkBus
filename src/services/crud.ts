import type {
  Advertisement,
  Bus,
  BusRoute,
  Driver,
  PromoCode,
  Role,
  Terminal,
  User } from
'../types/models';
import { makeResource } from './resource';

/** One resource controller per managed table, matching the admin CRUD endpoints. */

export const busesApi = makeResource<Bus>('buses', ['plate_number', 'model', 'bus_type', 'status', 'notes'], () => ({
  plate_number: '',
  model: '',
  bus_type: 'standard',
  capacity: 44,
  status: 'active',
  notes: ''
}));

export const driversApi = makeResource<Driver>('drivers', ['license_number', 'status', 'notes'], () => ({
  license_number: '',
  license_expiry: '',
  status: 'active',
  experience_years: 0,
  notes: ''
} as any));

export const terminalsApi = makeResource<Terminal>('terminals', ['name', 'city', 'address', 'status'], () => ({
  name: '',
  city: '',
  address: '',
  latitude: 0,
  longitude: 0,
  status: 'active',
  photo: null
}));

export const routesApi = makeResource<BusRoute>('routes', ['status'], () => ({
  origin_terminal_id: 0,
  destination_terminal_id: 0,
  distance_km: 0,
  estimated_duration_minutes: 0,
  status: 'active'
}));

export const usersApi = makeResource<User>('users', ['name', 'email', 'phone', 'role'], () => ({
  name: '',
  email: '',
  phone: '',
  avatar: null,
  role_id: 3,
  role: 'passenger',
  is_driver: false,
  created_at: new Date().toISOString()
}));

export const rolesApi = makeResource<Role>('roles', ['name', 'slug', 'description'], () => ({
  name: '',
  slug: 'passenger',
  description: ''
}));

export const promoCodesApi = makeResource<PromoCode>('promoCodes', ['code', 'description', 'discount_type'], () => ({
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_booking_amount: 0,
  max_uses: 100,
  used_count: 0,
  is_active: true,
  expires_at: ''
}));

export const advertisementsApi = makeResource<Advertisement>(
  'advertisements',
  ['title', 'description', 'type', 'status'],
  () => ({
    title: '',
    description: '',
    image_url: '',
    link_url: '/search',
    type: 'banner',
    status: 'active',
    start_date: '',
    end_date: '',
    priority: 1
  })
);