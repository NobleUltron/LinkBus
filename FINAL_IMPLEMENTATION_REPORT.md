# LinkBus — Final Implementation Report

## 1. Executive Summary

The **LinkBus Ticketing, Logistics & Fleet Management System** has been fully transformed from an in-memory simulated application into a complete, persistent, multi-tenant full-stack enterprise web application built on **React 18 + TypeScript + Vite**, **Laravel 12 REST API**, and **MySQL (MariaDB/XAMPP)**.

---

## 2. Architecture & Technology Stack

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   React 18 + TypeScript                 │
       │                 Vite + TailwindCSS + Lucide             │
       └────────────────────────────┬────────────────────────────┘
                                    │  HTTP / JSON / Bearer Token
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                   Laravel 12 REST API                   │
       │          Sanctum Auth + Eloquent ORM + RBAC             │
       └────────────────────────────┬────────────────────────────┘
                                    │  SQL Transactions / Locks
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                      MySQL / XAMPP                      │
       │           InnoDB Engine with Foreign Keys & B-Tree      │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Overview (`database/schema.sql`)

The MySQL database contains **19 relational tables** designed with foreign key constraints, proper indices, and InnoDB transactional support:

1. **`roles`**: RBAC roles (`admin`, `staff`, `driver`, `passenger`).
2. **`users`**: System users with Sanctum token authentication & profile management.
3. **`terminals`**: Bus stations across Uganda (Kampala, Gulu, Mbarara, Jinja, Mbale, Fort Portal).
4. **`bus_routes`**: Distance, duration, and terminal origin/destination links.
5. **`buses`**: Fleet records (plate numbers, seating capacities, vehicle models, status).
6. **`drivers`**: Driver license numbers, expiry, experience, linked user profiles.
7. **`trips`**: Scheduled bus journeys with fares, status (`scheduled`, `boarding`, `in_transit`, `completed`, `cancelled`), and departure/arrival times.
8. **`trip_seats`**: Individual seat rows (`1A`..`14D`) with status (`available`, `locked`, `booked`).
9. **`seat_locks`**: Concurrent seat holds with expiration timestamps preventing double booking.
10. **`bookings`**: Transactional ticket purchase records with total calculation, promo code applications, and cancellation logic.
11. **`tickets`**: Individual passenger tickets with ticket numbers, QR codes, and boarding timestamps.
12. **`payments`**: Payment ledger (MTN Mobile Money, Airtel Money, Card, Cash) with transaction IDs.
13. **`luggage`**: Tagged luggage items with weight tracking, overage fees, and status (`checked_in`, `in_transit`, `delivered`, `lost`).
14. **`parcels`**: Freight parcel shipping records with tracking numbers (`PCL-xxxxx`), sender/recipient info, and terminal routes.
15. **`promo_codes`**: Promotional discount vouchers (percentage/fixed value, max uses, expiration).
16. **`advertisements`**: Banner, popup, and sidebar promo slots.
17. **`settings`**: System configurations (tax rate, cancellation fee %, seat lock minutes, free luggage limits).
18. **`notifications`**: In-app passenger notifications.
19. **`audit_logs`**: System audit trail for compliance and tracking changes.

---

## 4. Key Business Logic Implementations

### A. Atomic Seat Locking & Double-Booking Prevention
Implemented in `App\Http\Controllers\Api\BookingController@lockSeat` and `@store` using MySQL `lockForUpdate()` within DB transactions:
- Passengers lock selected seats for 10 minutes.
- Concurrent requests for the same seat during checkout receive a `409 Conflict` response.
- Locks expire automatically and are reclaimed.

### B. Role-Based Access Control (RBAC)
Role middleware (`App\Http\Middleware\RoleMiddleware`) restricts endpoints:
- **`passenger`**: Search trips, lock seats, book tickets, view personal bookings.
- **`driver`**: View assigned manifest, check in passengers via QR scan/ticket number.
- **`staff`**: POS counter sales, luggage check-in, parcel dispatch, passenger boarding.
- **`admin`**: Fleet management, driver assignments, settings, promo codes, financial reports.

---

## 5. Startup & Execution Instructions

1. **Start XAMPP MySQL** (Ensure MySQL service is running on port 3306).
2. **Double-click `start-linkbus.bat`** in the root directory `c:\xampp\htdocs\LinkBus`.
   - Automatically starts the Laravel API server on `http://localhost:8000`.
   - Automatically starts the React Vite dev server on `http://localhost:5173`.
   - Automatically opens your web browser.

### Default Login Accounts (Password: `password`)
- **Admin**: `admin@linkbus.co.ug`
- **Staff**: `staff@linkbus.co.ug`
- **Driver**: `driver1@linkbus.co.ug`
- **Passenger**: `passenger@linkbus.co.ug`

---

## 6. Verification Status

- [x] **Database Connectivity**: Verified via XAMPP MariaDB `linkbus` database.
- [x] **Database Seeders**: Executed successfully with Ugandan routes, terminals, buses, and trips.
- [x] **Laravel 12 API**: Serves 56 REST endpoints on `http://localhost:8000/api`.
- [x] **React Frontend**: Built cleanly via `npm run build` with zero TypeScript or bundle errors.
- [x] **State Persistence**: Complete data persistence across React frontend and MySQL backend.
