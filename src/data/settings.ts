import type { Setting } from '../types/models';

export const settingsSeed: Setting[] = [
// company
{ id: 1, key: 'company_name', value: 'Link Bus Services Ltd', group: 'company', description: 'Legal name used on tickets and receipts' },
{ id: 2, key: 'company_email', value: 'hello@linkbus.co.ug', group: 'company', description: 'Public support inbox' },
{ id: 3, key: 'company_phone', value: '+256 772 120 340', group: 'company', description: 'Support hotline' },
{ id: 4, key: 'company_address', value: 'Nakivubo Rd, Namayiba, Kampala', group: 'company', description: 'Head office address' },
{ id: 5, key: 'support_hours', value: '06:00 – 22:00 daily', group: 'company', description: 'Hours shown on the contact page' },

// booking
{ id: 6, key: 'tax_rate_percentage', value: '3', group: 'booking', description: 'VAT applied after promo discount' },
{ id: 7, key: 'cancellation_fee_percentage', value: '10', group: 'booking', description: 'Charged on passenger-initiated cancellations' },
{ id: 8, key: 'seat_lock_minutes', value: '10', group: 'booking', description: 'How long held seats stay reserved during checkout' },
{ id: 9, key: 'max_seats_per_booking', value: '5', group: 'booking', description: 'Seat ceiling for a single booking' },
{ id: 10, key: 'boarding_opens_minutes_before', value: '30', group: 'booking', description: 'When a trip flips to boarding' },
{ id: 11, key: 'vip_fare_multiplier', value: '1.5', group: 'booking', description: 'VIP seat fare relative to base fare' },

// payment
{ id: 12, key: 'enable_cash', value: 'true', group: 'payment', description: 'Accept cash at counters' },
{ id: 13, key: 'enable_mtn_mobile_money', value: 'true', group: 'payment', description: 'Accept MTN Mobile Money' },
{ id: 14, key: 'enable_airtel_money', value: 'true', group: 'payment', description: 'Accept Airtel Money' },
{ id: 15, key: 'enable_card', value: 'false', group: 'payment', description: 'Accept debit and credit cards' },
{ id: 16, key: 'momo_merchant_code', value: '*165*3*550340#', group: 'payment', description: 'Merchant code shown to passengers' },
{ id: 17, key: 'refund_window_hours', value: '24', group: 'payment', description: 'Window in which refunds may be issued' },

// luggage
{ id: 18, key: 'free_luggage_kg', value: '20', group: 'luggage', description: 'Weight included with every ticket' },
{ id: 19, key: 'excess_luggage_fee_per_kg', value: '3500', group: 'luggage', description: 'Charge per kilogram over the allowance' },
{ id: 20, key: 'max_luggage_kg', value: '40', group: 'luggage', description: 'Hard limit per passenger' },
{ id: 21, key: 'parcel_base_price', value: '15000', group: 'luggage', description: 'Starting price for parcel delivery' }];


export function settingsMap(list: Setting[]): Record<string, string> {
  return list.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}