import type { Parcel } from '../types/models';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 15, 0, 0);
  return d.toISOString();
};

export const parcelsSeed: Parcel[] = [
{ id: 1, sender_name: 'Alice Nabukenya', sender_phone: '+256 772 221 004', recipient_name: 'Fred Mugisha', recipient_phone: '+256 772 445 118', origin_terminal_id: 1, destination_terminal_id: 4, weight_kg: 3.5, description: 'Sealed envelope of legal documents', tracking_number: 'PCL-8841203', status: 'delivered', price: 28000, notes: 'Collected at counter 3', created_at: daysAgo(9) },
{ id: 2, sender_name: 'Bosco Kiwanuka', sender_phone: '+256 772 902 771', recipient_name: 'Marie Akello', recipient_phone: '+256 772 330 662', origin_terminal_id: 1, destination_terminal_id: 2, weight_kg: 12, description: 'Carton of school supplies', tracking_number: 'PCL-8841219', status: 'in_transit', price: 64000, notes: '', created_at: daysAgo(1) },
{ id: 3, sender_name: 'Sandra Kirabo', sender_phone: '+256 772 118 320', recipient_name: 'Oliver Rukundo', recipient_phone: '+256 772 771 099', origin_terminal_id: 3, destination_terminal_id: 1, weight_kg: 1.2, description: 'Mobile phone in padded box', tracking_number: 'PCL-8841244', status: 'arrived', price: 19000, notes: 'Recipient notified by SMS', created_at: daysAgo(1) },
{ id: 4, sender_name: 'Emmanuel Ssentongo', sender_phone: '+256 772 664 502', recipient_name: 'Chantal Nakabuye', recipient_phone: '+256 772 220 187', origin_terminal_id: 1, destination_terminal_id: 5, weight_kg: 24, description: 'Two sacks of coffee beans', tracking_number: 'PCL-8841260', status: 'received', price: 115000, notes: 'Overnight sleeper service', created_at: daysAgo(0) },
{ id: 5, sender_name: 'Yvette Nankunda', sender_phone: '+256 772 550 913', recipient_name: 'Innocent Wanyama', recipient_phone: '+256 772 442 006', origin_terminal_id: 4, destination_terminal_id: 1, weight_kg: 6.8, description: 'Fresh fish cooler box', tracking_number: 'PCL-8841271', status: 'in_transit', price: 42000, notes: 'Time sensitive — deliver on arrival', created_at: daysAgo(0) },
{ id: 6, sender_name: 'Dennis Ntwali', sender_phone: '+256 772 019 447', recipient_name: 'Alice Nyakato', recipient_phone: '+256 772 883 214', origin_terminal_id: 2, destination_terminal_id: 7, weight_kg: 4, description: 'Spare tractor parts', tracking_number: 'PCL-8841288', status: 'lost', price: 36000, notes: 'Investigation opened, claim filed 2 days ago', created_at: daysAgo(4) },
{ id: 7, sender_name: 'Peace Mutoni', sender_phone: '+256 772 337 771', recipient_name: 'Vincent Kabera', recipient_phone: '+256 772 664 993', origin_terminal_id: 1, destination_terminal_id: 3, weight_kg: 9.4, description: 'Bundle of textiles', tracking_number: 'PCL-8841294', status: 'delivered', price: 51000, notes: '', created_at: daysAgo(6) },
{ id: 8, sender_name: 'Robert Kasule', sender_phone: '+256 772 445 220', recipient_name: 'Josephine Auma', recipient_phone: '+256 772 110 774', origin_terminal_id: 7, destination_terminal_id: 1, weight_kg: 2.1, description: 'Bank documents pouch', tracking_number: 'PCL-8841301', status: 'arrived', price: 22000, notes: '', created_at: daysAgo(2) }];


export const luggageDescriptions = [
'Large blue suitcase',
'Black backpack',
'Woven travel bag',
'Cardboard box, taped',
'Sports duffel bag',
'Hard-shell grey trolley'];