import type { RoleSlug } from '../../types/models';

export type NavIcon =
'dashboard' |
'reports' |
'pos' |
'bookings' |
'tickets' |
'payments' |
'promo' |
'trips' |
'routes' |
'buses' |
'terminals' |
'drivers' |
'luggage' |
'parcels' |
'users' |
'roles' |
'ads' |
'settings' |
'checkin' |
'search' |
'profile';

export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface PortalConfig {
  key: RoleSlug;
  name: string;
  groups: NavGroup[];
  /** Five links promoted to the mobile bottom bar. */
  mobile: string[];
}

export const adminPortal: PortalConfig = {
  key: 'admin',
  name: 'Admin',
  groups: [
  {
    label: 'Overview',
    items: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Reports', to: '/admin/reports', icon: 'reports' }]

  },
  {
    label: 'Selling',
    items: [
    { label: 'POS terminal', to: '/admin/pos', icon: 'pos' },
    { label: 'Bookings', to: '/admin/bookings', icon: 'bookings' },
    { label: 'Tickets', to: '/admin/tickets', icon: 'tickets' },
    { label: 'Payments', to: '/admin/payments', icon: 'payments' },
    { label: 'Promo codes', to: '/admin/promo-codes', icon: 'promo' }]

  },
  {
    label: 'Operations',
    items: [
    { label: 'Trips', to: '/admin/trips', icon: 'trips' },
    { label: 'Routes', to: '/admin/routes', icon: 'routes' },
    { label: 'Buses', to: '/admin/buses', icon: 'buses' },
    { label: 'Terminals', to: '/admin/terminals', icon: 'terminals' },
    { label: 'Drivers', to: '/admin/drivers', icon: 'drivers' },
    { label: 'Luggage', to: '/admin/luggage', icon: 'luggage' },
    { label: 'Parcels', to: '/admin/parcels', icon: 'parcels' }]

  },
  {
    label: 'Administration',
    items: [
    { label: 'Users', to: '/admin/users', icon: 'users' },
    { label: 'Roles', to: '/admin/roles', icon: 'roles' },
    { label: 'Advertisements', to: '/admin/advertisements', icon: 'ads' },
    { label: 'Settings', to: '/admin/settings', icon: 'settings' }]

  }],

  mobile: ['/admin/dashboard', '/admin/pos', '/admin/bookings', '/admin/trips', '/admin/reports']
};

export const staffPortal: PortalConfig = {
  key: 'staff',
  name: 'Staff',
  groups: [
  {
    label: 'Today',
    items: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: 'dashboard' },
    { label: 'Check-in', to: '/staff/check-in', icon: 'checkin' },
    { label: 'POS terminal', to: '/staff/pos', icon: 'pos' }]

  },
  {
    label: 'Sales',
    items: [
    { label: 'Bookings', to: '/staff/bookings', icon: 'bookings' },
    { label: 'Tickets', to: '/staff/tickets', icon: 'tickets' },
    { label: 'Payments', to: '/staff/payments', icon: 'payments' }]

  },
  {
    label: 'Handling',
    items: [
    { label: 'Luggage', to: '/staff/luggage', icon: 'luggage' },
    { label: 'Parcels', to: '/staff/parcels', icon: 'parcels' }]

  }],

  mobile: ['/staff/dashboard', '/staff/check-in', '/staff/pos', '/staff/bookings', '/staff/luggage']
};

export const driverPortal: PortalConfig = {
  key: 'driver',
  name: 'Driver',
  groups: [
    {
      label: 'Captain Cockpit',
      items: [
        { label: 'Captain Dashboard', to: '/driver', icon: 'dashboard', end: true },
        { label: 'Assigned Trips', to: '/driver/trips', icon: 'trips' },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Profile & Licence', to: '/driver/profile', icon: 'profile' },
      ],
    },
  ],

  mobile: ['/driver', '/driver/trips', '/driver/profile'],
};

export const passengerPortal: PortalConfig = {
  key: 'passenger',
  name: 'Passenger',
  groups: [
  {
    label: 'Travel',
    items: [
    { label: 'Dashboard', to: '/passenger/dashboard', icon: 'dashboard' },
    { label: 'Find a trip', to: '/search', icon: 'search' },
    { label: 'My tickets', to: '/my-tickets', icon: 'tickets' }]

  },
  {
    label: 'Account',
    items: [{ label: 'Profile & settings', to: '/settings', icon: 'profile' }]
  }],

  mobile: ['/passenger/dashboard', '/search', '/my-tickets', '/settings']
};

interface PageMeta {
  title: string;
  subtitle: string;
}

/** Context-aware titles for the sticky top bar. */
export const pageMeta: Record<string, PageMeta> = {
  '/admin/dashboard': { title: 'Admin Portal', subtitle: 'Network operations & metrics' },
  '/admin/reports': { title: 'Reports', subtitle: 'Revenue and occupancy analytics with export' },
  '/admin/pos': { title: 'POS terminal', subtitle: 'Sell a ticket to a walk-in passenger' },
  '/admin/bookings': { title: 'Bookings', subtitle: 'Every booking across the network' },
  '/admin/tickets': { title: 'Tickets', subtitle: 'Issued boarding passes and their status' },
  '/admin/payments': { title: 'Payments', subtitle: 'Settlements, refunds and transaction records' },
  '/admin/promo-codes': { title: 'Promo codes', subtitle: 'Discount campaigns and their usage' },
  '/admin/trips': { title: 'Trips', subtitle: 'Scheduled departures, buses and drivers' },
  '/admin/routes': { title: 'Routes', subtitle: 'Corridors between terminals' },
  '/admin/buses': { title: 'Buses', subtitle: 'Fleet register and availability' },
  '/admin/terminals': { title: 'Terminals', subtitle: 'Stations, addresses and coordinates' },
  '/admin/drivers': { title: 'Drivers', subtitle: 'Licences, experience and availability' },
  '/admin/luggage': { title: 'Luggage', subtitle: 'Tagged bags moving through the network' },
  '/admin/parcels': { title: 'Parcels', subtitle: 'Freight bookings and delivery status' },
  '/admin/users': { title: 'Users', subtitle: 'Accounts and role assignment' },
  '/admin/roles': { title: 'Roles', subtitle: 'What each role is allowed to do' },
  '/admin/advertisements': { title: 'Advertisements', subtitle: 'Campaign banners shown to passengers' },
  '/admin/settings': { title: 'System settings', subtitle: 'Company, booking, payment and luggage rules' },
  '/admin/profile': { title: 'Profile & settings', subtitle: 'Your account details and password' },

  '/staff/dashboard': { title: 'Counter overview', subtitle: 'Today’s departures, sales and check-ins' },
  '/staff/check-in': { title: 'Passenger check-in', subtitle: 'Scan or key in a ticket to board a passenger' },
  '/staff/pos': { title: 'POS terminal', subtitle: 'Sell a ticket to a walk-in passenger' },
  '/staff/bookings': { title: 'Bookings', subtitle: 'Look up and adjust passenger bookings' },
  '/staff/tickets': { title: 'Tickets', subtitle: 'Issued boarding passes and their status' },
  '/staff/payments': { title: 'Payments', subtitle: 'Counter takings and transaction records' },
  '/staff/luggage': { title: 'Luggage desk', subtitle: 'Tag, track and hand over passenger bags' },
  '/staff/parcels': { title: 'Parcel desk', subtitle: 'Accept, dispatch and deliver parcels' },
  '/staff/profile': { title: 'Profile & settings', subtitle: 'Your account details and password' },

  '/driver': { title: 'Captain Dashboard', subtitle: 'Highway departure summary & active fleet cockpit' },
  '/driver/trips': { title: 'Assigned Departures', subtitle: 'Scheduled trips & passenger boarding manifests' },
  '/driver/profile': { title: 'Profile & Licence', subtitle: 'Your captain account and permit details' },

  '/passenger/dashboard': { title: 'Your travel', subtitle: 'Upcoming trips and recent bookings' },
  '/my-tickets': { title: 'My tickets', subtitle: 'Boarding passes for your upcoming and past trips' },
  '/settings': { title: 'Profile & settings', subtitle: 'Your account details and password' }
};

export function metaForPath(pathname: string): PageMeta {
  if (pageMeta[pathname]) return pageMeta[pathname];
  if (pathname.startsWith('/driver/trips/')) return { title: 'Trip manifest', subtitle: 'Passengers, seats and boarding' };
  if (pathname.startsWith('/book/')) return { title: 'Book a trip', subtitle: 'Choose seats, add passengers and pay' };
  if (pathname.startsWith('/search')) return { title: 'Find a trip', subtitle: 'Search departures across the network' };
  return { title: 'Link Bus Services', subtitle: '' };
}