import type { Bus, Driver, Role, User } from '../types/models';

export const rolesSeed: Role[] = [
{ id: 1, name: 'Administrator', slug: 'admin', description: 'Full access to every portal, configuration and report' },
{ id: 2, name: 'Counter Staff', slug: 'staff', description: 'Sells tickets, checks passengers in, handles luggage and parcels' },
{ id: 3, name: 'Passenger', slug: 'passenger', description: 'Books trips and manages their own tickets' },
{ id: 4, name: 'Driver', slug: 'driver', description: 'Runs assigned trips and boards passengers from the manifest' }];


export const usersSeed: User[] = [
{ id: 1, name: 'Sarah Nakato', email: 'admin@linkbus.co.ug', phone: '+256 772 100 001', avatar: null, role_id: 1, role: 'admin', is_driver: false, created_at: '2024-01-08T08:00:00' },
{ id: 2, name: 'Eric Wasswa', email: 'staff@linkbus.co.ug', phone: '+256 772 100 002', avatar: null, role_id: 2, role: 'staff', is_driver: false, created_at: '2024-02-14T08:00:00' },
{ id: 3, name: 'Patience Nabirye', email: 'passenger@linkbus.co.ug', phone: '+256 772 100 003', avatar: null, role_id: 3, role: 'passenger', is_driver: false, created_at: '2024-03-02T08:00:00' },
{ id: 4, name: 'Moses Okello', email: 'driver@linkbus.co.ug', phone: '+256 772 100 004', avatar: null, role_id: 4, role: 'driver', is_driver: true, created_at: '2024-01-19T08:00:00' },
{ id: 5, name: 'Samuel Kagwa', email: 'samuel.d@linkbus.co.ug', phone: '+256 772 100 005', avatar: null, role_id: 4, role: 'driver', is_driver: true, created_at: '2024-04-11T08:00:00' },
{ id: 6, name: 'Divine Atim', email: 'divine.d@linkbus.co.ug', phone: '+256 772 100 006', avatar: null, role_id: 4, role: 'driver', is_driver: true, created_at: '2024-05-06T08:00:00' },
{ id: 7, name: 'Patrick Ssemakula', email: 'patrick.d@linkbus.co.ug', phone: '+256 772 100 007', avatar: null, role_id: 4, role: 'driver', is_driver: true, created_at: '2024-06-21T08:00:00' },
{ id: 8, name: 'Solomon Byaruhanga', email: 'solomon@linkbus.co.ug', phone: '+256 772 100 008', avatar: null, role_id: 2, role: 'staff', is_driver: false, created_at: '2024-07-03T08:00:00' },
{ id: 9, name: 'Kevin Mugisha', email: 'kevin@example.com', phone: '+256 772 100 009', avatar: null, role_id: 3, role: 'passenger', is_driver: false, created_at: '2024-08-15T08:00:00' },
{ id: 10, name: 'Grace Namutebi', email: 'grace@example.com', phone: '+256 772 100 010', avatar: null, role_id: 3, role: 'passenger', is_driver: false, created_at: '2024-09-09T08:00:00' },
{ id: 11, name: 'Timothy Kizza', email: 'timothy@example.com', phone: '+256 772 100 011', avatar: null, role_id: 3, role: 'passenger', is_driver: false, created_at: '2024-10-27T08:00:00' },
{ id: 12, name: 'Josephine Amoding', email: 'josephine@example.com', phone: '+256 772 100 012', avatar: null, role_id: 3, role: 'passenger', is_driver: false, created_at: '2024-11-30T08:00:00' }];


export const busesSeed: Bus[] = [
{ id: 1, plate_number: 'UBG 480K', model: 'Yutong ZK6122', bus_type: 'vip', capacity: 36, status: 'active', notes: 'Reclining VIP seats, USB charging at every row' },
{ id: 2, plate_number: 'UAX 217J', model: 'Higer KLQ6122', bus_type: 'standard', capacity: 48, status: 'active', notes: '' },
{ id: 3, plate_number: 'UBH 902M', model: 'Scania Touring', bus_type: 'vip', capacity: 40, status: 'active', notes: 'Onboard Wi-Fi' },
{ id: 4, plate_number: 'UAP 664L', model: 'Toyota Coaster', bus_type: 'standard', capacity: 28, status: 'active', notes: 'Short-haul shuttle' },
{ id: 5, plate_number: 'UBJ 155P', model: 'Marcopolo Paradiso', bus_type: 'sleeper', capacity: 32, status: 'active', notes: 'Overnight service only' },
{ id: 6, plate_number: 'UBG 731N', model: 'Higer KLQ6122', bus_type: 'standard', capacity: 48, status: 'maintenance', notes: 'Gearbox service until Friday' },
{ id: 7, plate_number: 'UAQ 088H', model: 'Yutong ZK6107', bus_type: 'standard', capacity: 44, status: 'active', notes: '' },
{ id: 8, plate_number: 'UBK 342Q', model: 'Scania Irizar', bus_type: 'vip', capacity: 36, status: 'active', notes: '' },
{ id: 9, plate_number: 'UAN 519G', model: 'Toyota Coaster', bus_type: 'standard', capacity: 28, status: 'retired', notes: 'Withdrawn from service, awaiting auction' },
{ id: 10, plate_number: 'UBJ 776R', model: 'Marcopolo Viaggio', bus_type: 'sleeper', capacity: 32, status: 'active', notes: '' }];


export const driversSeed: Driver[] = [
{ id: 1, user_id: 4, license_number: 'UG-DL-884120', license_expiry: '2027-04-30', status: 'active', experience_years: 11, notes: 'Long-haul certified' },
{ id: 2, user_id: 5, license_number: 'UG-DL-771903', license_expiry: '2026-09-14', status: 'active', experience_years: 7, notes: '' },
{ id: 3, user_id: 6, license_number: 'UG-DL-660417', license_expiry: '2026-02-28', status: 'active', experience_years: 5, notes: 'Night service preferred' },
{ id: 4, user_id: 7, license_number: 'UG-DL-559288', license_expiry: '2025-12-31', status: 'on_leave', experience_years: 14, notes: 'Annual leave through the month' }];