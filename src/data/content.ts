export const HERO_IMAGE = "/6767bf9f-5855-407f-9a73-07d676a90d97.jpg";


export interface Feature {
  icon: 'ticket' | 'shield' | 'clock' | 'package' | 'creditCard' | 'messageSquare' | 'wifi' | 'map';
  title: string;
  body: string;
  tag?: string;
}

export const homeFeatures: Feature[] = [
  {
    icon: 'ticket',
    title: 'Seat you actually chose',
    body: 'Pick your exact seat on a live cabin map — VIP front rows, window views, or full rows for traveling groups.',
    tag: 'Live Cabin Map',
  },
  {
    icon: 'clock',
    title: 'Held for ten minutes',
    body: 'Your seat is locked the moment you select it. Nobody can take it while you enter passenger details and pay.',
    tag: 'Zero Overbooking',
  },
  {
    icon: 'shield',
    title: 'Scan-and-go QR boarding',
    body: 'Every ticket generates an instant QR code. Counter staff and drivers board you in seconds with a fast digital scan.',
    tag: 'Paperless',
  },
  {
    icon: 'package',
    title: 'Luggage & parcel tracking',
    body: 'Send parcels or check bags with real-time waypoint updates from terminal check-in to recipient collection.',
    tag: 'Live Milestones',
  },
  {
    icon: 'creditCard',
    title: 'MTN MoMo, Airtel & Cards',
    body: 'Instant checkout using MTN Mobile Money, Airtel Money, or Visa/Mastercard with immediate SMS e-receipts.',
    tag: 'Instant Checkout',
  },
  {
    icon: 'messageSquare',
    title: 'WhatsApp passes & updates',
    body: 'Get your digital boarding passes and departure notices delivered right to WhatsApp with 1-click sharing.',
    tag: '1-Click Sharing',
  },
];


export interface Testimonial {
  id: string;
  category: 'passenger' | 'staff' | 'driver';
  quote: string;
  name: string;
  role: string;
  rating: number;
  badge: string;
  locationOrRoute: string;
  avatarInitials: string;
  avatarColor: string;
  statHighlight?: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 't-1',
    category: 'passenger',
    quote:
      'I book the Masaka run every Friday and the live seat map means I always end up in the exact window seat I prefer. The 10-minute hold saved me twice when my mobile money prompt was delayed.',
    name: 'Patience Nabirye',
    role: 'Weekly Commuter',
    locationOrRoute: 'Kampala → Masaka Corridor',
    rating: 5,
    badge: 'Verified Passenger',
    avatarInitials: 'PN',
    avatarColor: 'bg-emerald-600',
    statHighlight: 'Saved 10-min seat reservation',
  },
  {
    id: 't-2',
    category: 'passenger',
    quote:
      'Booking online and walking straight to the bus with my phone QR code has completely eliminated queueing at the terminal at 6 AM. The WhatsApp ticket sharing is brilliant for sending boarding passes to my family.',
    name: 'Dr. Brian Kigozi',
    role: 'Business Traveler',
    locationOrRoute: 'Kampala → Gulu Express',
    rating: 5,
    badge: 'Verified Passenger',
    avatarInitials: 'BK',
    avatarColor: 'bg-teal-600',
    statHighlight: '100% paperless check-in',
  },
  {
    id: 't-3',
    category: 'staff',
    quote:
      'We moved our whole counter onto the POS terminal. Walk-in sales that took four minutes now take under sixty seconds, and the manifest is already synchronized when the driver arrives.',
    name: 'Eric Wasswa',
    role: 'Counter Supervisor',
    locationOrRoute: 'Namayiba Terminal, Counter 12',
    rating: 5,
    badge: 'Terminal Staff',
    avatarInitials: 'EW',
    avatarColor: 'bg-blue-600',
    statHighlight: 'Checkout under 60 seconds',
  },
  {
    id: 't-4',
    category: 'staff',
    quote:
      'Handling parcel drop-offs and issuing instant barcode bag tags on the POS terminal has completely eliminated lost items. Customers track their parcels right from their phones.',
    name: 'Sarah Namubiru',
    role: 'Operations Lead',
    locationOrRoute: 'Mbarara Main Terminal',
    rating: 5,
    badge: 'Terminal Staff',
    avatarInitials: 'SN',
    avatarColor: 'bg-indigo-600',
    statHighlight: 'Zero misplaced parcels',
  },
  {
    id: 't-5',
    category: 'driver',
    quote:
      'Boarding used to be a paper list and a torch. Now I open the digital manifest on my phone, scan each passenger in seconds, and know exactly who is seated before we pull out of the bay.',
    name: 'Moses Okello',
    role: 'Senior Driver',
    locationOrRoute: 'Western Route (Fort Portal)',
    rating: 5,
    badge: 'Verified Driver',
    avatarInitials: 'MO',
    avatarColor: 'bg-amber-600',
    statHighlight: '3-second boarding per passenger',
  },
  {
    id: 't-6',
    category: 'driver',
    quote:
      'The live manifest shows real-time pickups for passengers boarding at intermediate stations like Mukono and Lugazi, so I never leave an advance-booked passenger behind.',
    name: 'Hassan Sempebwa',
    role: 'Intercity Captain',
    locationOrRoute: 'Eastern Shuttle (Jinja Line)',
    rating: 5,
    badge: 'Verified Driver',
    avatarInitials: 'HS',
    avatarColor: 'bg-orange-600',
    statHighlight: 'Real-time intermediate stops',
  },
];


export const services = [
{
  icon: 'bus' as const,
  title: 'Intercity coach travel',
  body: 'Scheduled departures on every major corridor, from the 60-minute Entebbe shuttle to the overnight Fort Portal sleeper.',
  points: ['Standard, VIP and sleeper cabins', 'Up to 14 departures a day', 'Reserved seating on every service']
},
{
  icon: 'crown' as const,
  title: 'VIP cabins',
  body: 'Front-of-cabin reclining seats with more legroom and charging at every row, priced at 1.5× the base fare.',
  points: ['Reclining leather seats', 'USB charging', 'Priority boarding']
},
{
  icon: 'package' as const,
  title: 'Parcel delivery',
  body: 'Send documents and goods on the next departure. Every parcel gets a tracking number and a signature on collection.',
  points: ['Terminal-to-terminal', 'Tracked end to end', 'Same-day on most corridors']
},
{
  icon: 'briefcase' as const,
  title: 'Luggage handling',
  body: '20kg included with every ticket, tagged at check-in and reunited with you at the destination bay.',
  points: ['20kg free allowance', 'Printed bag tags', 'Excess billed per kilogram']
},
{
  icon: 'users' as const,
  title: 'Group and corporate travel',
  body: 'Block-book rows or a whole coach for teams, schools and events, invoiced monthly.',
  points: ['Block seat reservations', 'Monthly invoicing', 'Dedicated account manager']
},
{
  icon: 'store' as const,
  title: 'Counter and agent sales',
  body: 'Walk-in passengers are served on the same system, so an agent sale and an app booking share one seat map.',
  points: ['POS at every terminal', 'Cash and mobile money', 'Instant printed tickets']
}];


export const aboutStats = [
{ label: 'Passengers carried in 2025', value: '1.4M' },
{ label: 'Departures every week', value: '620' },
{ label: 'Terminals served', value: '8' },
{ label: 'On-time departure rate', value: '96%' }];


export const aboutMilestones = [
{ year: '2017', title: 'One route, two coaches', body: 'Link Bus Services opened with a single Kampala–Masaka service and a paper ledger at the Namayiba counter.' },
{ year: '2020', title: 'Digital ticketing', body: 'Paper tickets were retired in favour of QR boarding passes, cutting boarding time by more than half.' },
{ year: '2023', title: 'Parcels and luggage', body: 'The network began moving tracked parcels alongside passengers on every scheduled departure.' },
{ year: '2026', title: 'One connected platform', body: 'Counters, drivers, passengers and management now work from the same live seat map and manifest.' }];


export const contactChannels = [
{ icon: 'phone' as const, label: 'Support hotline', value: '+256 772 120 340', note: '06:00 – 22:00 daily' },
{ icon: 'mail' as const, label: 'Email', value: 'hello@linkbus.co.ug', note: 'Replies within one business day' },
{ icon: 'map' as const, label: 'Head office', value: 'Nakivubo Rd, Namayiba, Kampala', note: 'Counter 12, arrivals hall' }];


export const faqs = [
{
  q: 'How long is my seat held during checkout?',
  a: 'Ten minutes from the moment you reach the passenger details step. A countdown appears in the header; if it runs out the seat is released back to the map and you start again.'
},
{
  q: 'Can I cancel a booking?',
  a: 'Yes, up until departure. A cancellation fee of 10% of the total is deducted and the balance is refunded to the original payment method. The exact fee is shown before you confirm.'
},
{
  q: 'How do round trips work?',
  a: 'A round trip creates two linked bookings with the same number of seats. Cancelling one cancels both, and both tickets appear together in My Tickets.'
},
{
  q: 'What is included in the luggage allowance?',
  a: '20kg per ticket. Anything over that is billed per kilogram at check-in, up to a 40kg limit per passenger.'
}];

export interface PopularCorridor {
  id: string;
  originName: string;
  originCity: string;
  originId: number;
  destName: string;
  destCity: string;
  destId: number;
  distanceKm: number;
  durationMinutes: number;
  fareFrom: number;
  dailyDepartures: number;
  tag?: string;
}

export const popularCorridors: PopularCorridor[] = [
  {
    id: 'kla-mbr',
    originCity: 'Kampala',
    originName: 'Kampala Central Bus Terminal',
    originId: 1,
    destCity: 'Mbarara',
    destName: 'Mbarara Terminal',
    destId: 3,
    distanceKm: 270,
    durationMinutes: 240,
    fareFrom: 35000,
    dailyDepartures: 12,
    tag: 'Frequent Express',
  },
  {
    id: 'kla-glu',
    originCity: 'Kampala',
    originName: 'Kampala Central Bus Terminal',
    originId: 1,
    destCity: 'Gulu',
    destName: 'Gulu Bus Park',
    destId: 2,
    distanceKm: 333,
    durationMinutes: 300,
    fareFrom: 32000,
    dailyDepartures: 8,
    tag: 'Northern Line',
  },
  {
    id: 'kla-ftp',
    originCity: 'Kampala',
    originName: 'Kampala Central Bus Terminal',
    originId: 1,
    destCity: 'Fort Portal',
    destName: 'Fort Portal Terminal',
    destId: 4,
    distanceKm: 295,
    durationMinutes: 270,
    fareFrom: 35000,
    dailyDepartures: 10,
    tag: 'Western Scenic',
  },
  {
    id: 'jnj-kla',
    originCity: 'Jinja',
    originName: 'Jinja Bus Terminal',
    originId: 5,
    destCity: 'Kampala',
    destName: 'Kampala Central Bus Terminal',
    destId: 1,
    distanceKm: 80,
    durationMinutes: 90,
    fareFrom: 15000,
    dailyDepartures: 14,
    tag: 'Hourly Shuttle',
  },
  {
    id: 'kla-kse',
    originCity: 'Kampala',
    originName: 'Kampala Central Bus Terminal',
    originId: 1,
    destCity: 'Kasese',
    destName: 'Kasese Terminal',
    destId: 8,
    distanceKm: 375,
    durationMinutes: 360,
    fareFrom: 40000,
    dailyDepartures: 6,
    tag: 'Direct Service',
  },
  {
    id: 'mbd-kla',
    originCity: 'Mubende',
    originName: 'Mubende Terminal',
    originId: 7,
    destCity: 'Kampala',
    destName: 'Kampala Central Bus Terminal',
    destId: 1,
    distanceKm: 150,
    durationMinutes: 150,
    fareFrom: 20000,
    dailyDepartures: 9,
    tag: 'Fast Transit',
  },
];