import type { Advertisement, PromoCode } from '../types/models';

const inDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const promoCodesSeed: PromoCode[] = [
{ id: 1, code: 'LINK10', description: '10% off any trip', discount_type: 'percentage', discount_value: 10, min_booking_amount: 20000, max_uses: 500, used_count: 214, is_active: true, expires_at: inDays(45) },
{ id: 2, code: 'WEEKEND20K', description: 'UGX 20,000 off weekend travel', discount_type: 'fixed', discount_value: 20000, min_booking_amount: 80000, max_uses: 300, used_count: 88, is_active: true, expires_at: inDays(21) },
{ id: 3, code: 'STUDENT15', description: '15% student discount', discount_type: 'percentage', discount_value: 15, min_booking_amount: 30000, max_uses: 1000, used_count: 512, is_active: true, expires_at: inDays(120) },
{ id: 4, code: 'LAUNCH50', description: 'Launch campaign — 50% off', discount_type: 'percentage', discount_value: 50, min_booking_amount: 10000, max_uses: 200, used_count: 200, is_active: true, expires_at: inDays(10) },
{ id: 5, code: 'EASTER24', description: 'Easter season fixed discount', discount_type: 'fixed', discount_value: 15000, min_booking_amount: 50000, max_uses: 400, used_count: 176, is_active: false, expires_at: inDays(-30) },
{ id: 6, code: 'VIPUPGRADE', description: 'UGX 30,000 off VIP cabins', discount_type: 'fixed', discount_value: 30000, min_booking_amount: 150000, max_uses: 150, used_count: 41, is_active: true, expires_at: inDays(60) }];


export const advertisementsSeed: Advertisement[] = [
{
  id: 1,
  title: 'Lake Victoria weekends from UGX 25,000',
  description: 'Book a return seat to Entebbe and get your luggage tag free.',
  image_url: "/90d622bb-2152-4c7f-b507-c8f17d30ad03.jpg",
  link_url: '/search',
  type: 'banner',
  status: 'active',
  start_date: inDays(-7),
  end_date: inDays(30),
  priority: 1
},
{
  id: 2,
  title: 'Send a parcel on the next departure',
  description: 'Same-day parcel delivery between all Link Bus Services terminals.',
  image_url: "/0f7f1b08-312a-406e-a536-3b46982381d7.jpg",
  link_url: '/services',
  type: 'banner',
  status: 'active',
  start_date: inDays(-3),
  end_date: inDays(45),
  priority: 2
},
{
  id: 3,
  title: 'Students save 15% every day',
  description: 'Use code STUDENT15 at checkout with a valid student ID.',
  image_url: "/6767bf9f-5855-407f-9a73-07d676a90d97.jpg",
  link_url: '/search',
  type: 'sidebar',
  status: 'active',
  start_date: inDays(-14),
  end_date: inDays(90),
  priority: 3
},
{
  id: 4,
  title: 'Independence Day timetable',
  description: 'Extra departures on all corridors — archived campaign.',
  image_url: "/90d622bb-2152-4c7f-b507-c8f17d30ad03.jpg",
  link_url: '/terminals',
  type: 'popup',
  status: 'inactive',
  start_date: inDays(-120),
  end_date: inDays(-90),
  priority: 5
}];