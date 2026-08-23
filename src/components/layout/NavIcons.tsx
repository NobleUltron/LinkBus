import React from 'react';
import { BadgePercentIcon, BriefcaseIcon, BusIcon, CalendarClockIcon, ChartNoAxesColumnIcon, CreditCardIcon, IdCardIcon, LayoutDashboardIcon, MapPinIcon, MegaphoneIcon, PackageIcon, QrCodeIcon, RouteIcon, SearchIcon, Settings2Icon, ShieldCheckIcon, StoreIcon, TicketIcon, UserIcon, UsersIcon } from 'lucide-react';
import type { NavIcon } from './navConfig';
const map: Record<NavIcon, React.ComponentType<{
  className?: string;
}>> = {
  dashboard: LayoutDashboardIcon,
  reports: ChartNoAxesColumnIcon,
  pos: StoreIcon,
  bookings: CalendarClockIcon,
  tickets: TicketIcon,
  payments: CreditCardIcon,
  promo: BadgePercentIcon,
  trips: BusIcon,
  routes: RouteIcon,
  buses: BusIcon,
  terminals: MapPinIcon,
  drivers: IdCardIcon,
  luggage: BriefcaseIcon,
  parcels: PackageIcon,
  users: UsersIcon,
  roles: ShieldCheckIcon,
  ads: MegaphoneIcon,
  settings: Settings2Icon,
  checkin: QrCodeIcon,
  search: SearchIcon,
  profile: UserIcon
};
export function NavGlyph({
  icon,
  className = 'h-4 w-4'



}: {icon: NavIcon;className?: string;}) {
  const Component = map[icon];
  return <Component className={className} aria-hidden />;
}