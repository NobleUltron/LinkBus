# LinkBus Shift Management & Cash Drawer System

## 1. System Overview & Single Financial Source of Truth

The **LinkBus Shift Management & Cash Drawer System** enforces 100% financial accountability across physical bus terminal counters, booking clerks, and supervisors.

### Core Architectural Principle
> **The backend database is the single financial source of truth.**
> The browser frontend never computes, persists, or reconciles cash balances independently. All financial states, balances, and ledger journals are authored, locked, and verified by the Laravel backend.

---

## 2. Expected Cash Calculation Formula

The server calculates physical drawer cash exclusively from physical currency actually deposited into or disbursed from the cashier's physical register:

$$\text{Physical Expected Cash} = \text{Opening Float} + \sum \text{Cash Inflows} - \sum \text{Cash Outflows} \pm \text{Adjustments}$$

### Expanded Formula Breakdown:
$$\begin{aligned}
\text{Physical Expected Cash} = &\;\text{Starting Float} \\
& + \text{Confirmed Cash Ticket Sales} \\
& + \text{Confirmed Cash Luggage Surcharges} \\
& + \text{Confirmed Cash Parcel Freight Fees} \\
& + \text{Cash-In Float Top-Ups} \\
& - \text{Petty Cash Expenses} \\
& - \text{Safe Drops (Mid-Shift Vault Transfers)} \\
& - \text{Cash Refunds} \\
& \pm \text{Approved Cash Corrections / Adjustments}
\end{aligned}$$

### Digital Payments Segregation
Digital settlements (**MTN Mobile Money**, **Airtel Money**, **Visa / Mastercard**, **Bank Transfers**) are:
- ✅ Tracked and audited for gross shift revenue reporting.
- ❌ **Strictly excluded** from the physical cash drawer balance.
- ⚡ **Permitted anytime** without requiring an open physical cash shift (e.g. online passenger bookings, remote card terminal payments).

$$\text{Gross Shift Turnover} = \text{Physical Expected Cash} + \text{MTN MoMo Total} + \text{Airtel Money Total} + \text{Card Total}$$

---

## 3. Immutable Financial Ledger (`shift_transactions`)

Every financial movement creates an append-only row in the `shift_transactions` table with an idempotency key to prevent double-postings:

| Field | Type | Description |
| :--- | :--- | :--- |
| `shift_id` | `foreignId` | Linked shift record |
| `user_id` | `foreignId` | Acting clerk / cashier |
| `type` | `varchar(50)` | `float_in`, `cash_sale_ticket`, `cash_fee_luggage`, `cash_fee_parcel`, `cash_in`, `petty_expense`, `safe_drop`, `refund`, `adjustment` |
| `amount` | `unsignedBigInteger` | Monetary value in UGX |
| `direction` | `enum('inflow', 'outflow')` | Inflow (adds to drawer) / Outflow (removes from drawer) |
| `payment_method` | `enum` | `cash`, `mtn_mobile_money`, `airtel_money`, `card`, `bank_transfer` |
| `source_type` | `string` (nullable) | Polymorphic model class (`Booking`, `Luggage`, `Parcel`, `Shift`) |
| `source_id` | `unsignedBigInteger` (nullable) | Polymorphic model ID |
| `idempotency_key` | `string` (nullable, unique) | Unique identifier preventing duplicate entries upon network retries |
| `category` | `string` | Human-readable classification |
| `reason` | `string` | Audit reason / narrative description |
| `authorized_by` | `string` (nullable) | Approving supervisor |

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api` and require Sanctum Bearer token authentication.

### `GET /shifts/current`
- **Access**: `staff`, `admin`, `driver`
- **Response**: `{ active_shift: ActiveShiftMetrics | null, has_active: boolean }`

### `POST /shifts/open`
- **Access**: `staff`, `admin`
- **Payload**:
  ```json
  {
    "starting_cash": 100000,
    "terminal_id": 1,
    "bus_id": null,
    "supervisor_name": "Robert Mugisha",
    "notes": "Morning desk opening float"
  }
  ```
- **Guardrails**:
  - `starting_cash >= 0`.
  - Rejects if cashier already has an active open shift (`400 Bad Request`).
  - Atomically creates `Shift` and `ShiftTransaction` (`float_in`).

### `POST /shifts/close`
- **Access**: `staff`, `admin`
- **Payload**:
  ```json
  {
    "actual_cash": 845000,
    "denominations": {
      "notes_50k": 10,
      "notes_20k": 12,
      "notes_10k": 8,
      "notes_5k": 4,
      "notes_2k": 2,
      "notes_1k": 1,
      "coins_1000": 0,
      "coins_500": 0,
      "coins_200": 0,
      "coins_100": 0,
      "coins_50": 0
    },
    "variance_reason": "Short change given during 7AM rush hour",
    "closing_notes": "All passenger manifests dispatched"
  }
  ```
- **Guardrails**:
  - Requires physical denomination breakdown.
  - Computes `expected_cash` with database row lock.
  - Mandatory `variance_reason` if `actual_cash != expected_cash` (`422 Unprocessable`).
  - Locks shift against further cash mutations.

### `POST /shifts/transactions`
- **Access**: `staff`, `admin`
- **Payload**:
  ```json
  {
    "type": "petty_expense",
    "amount": 25000,
    "category": "Receipt Paper Rolls",
    "reason": "Bought 10 POS thermal rolls from stationery vendor",
    "authorized_by": "Robert Mugisha"
  }
  ```
- **Overdraft Guard**:
  - Validates that cash outflows (`petty_expense`, `safe_drop`, `refund`) do not exceed current available till balance (`422 Unprocessable`).

### `POST /shifts/{shift}/reopen`
- **Access**: `admin`, `supervisor`, `station_manager`
- **Payload**:
  ```json
  {
    "reason": "Auditor requested reconciliation adjustment before final daily book lock"
  }
  ```
- **Audit**:
  - Disallows silent reopening; records an immutable `adjustment` transaction with authorizer.

### `GET /shifts/history`
- **Access**:
  - Regular Booking Clerks: View only their own shift history.
  - Managers / Admins: Filter across all terminal cashiers, date ranges, and variance flags.

### `GET /shifts/{shift}/report`
- **Access**: Shift owner or Admin
- **Payload**: Full Z-Report serialization for 80mm thermal printers or A4 PDF audit archiving.

---

## 5. Roles & Permissions Matrix

| Capability | Booking Clerk (`staff`) | Station Supervisor (`supervisor`) | System Administrator (`admin`) |
| :--- | :---: | :---: | :---: |
| Open Own Shift | ✅ | ✅ | ✅ |
| Record Cash Sale / Luggage / Parcel | ✅ (Requires Open Shift) | ✅ | ✅ |
| Record Float Top-Up / Safe Drop | ✅ | ✅ | ✅ |
| Record Petty Expense | ✅ (Within Till Balance) | ✅ | ✅ |
| Perform Z-Read Closeout | ✅ | ✅ | ✅ |
| View Own Shift Audit History | ✅ | ✅ | ✅ |
| View All Station Cashiers' Shifts | ❌ | ✅ | ✅ |
| Reopen Closed Shift with Justification | ❌ | ✅ | ✅ |

---

## 6. How to Run Migrations and Tests

### 1. Database Migrations
```bash
cd backend
php artisan migrate --force
```

### 2. Run Shift Feature Test Suite
```bash
cd backend
php artisan test --filter=ShiftManagementTest
```

### 3. Frontend Compilation & Build Check
```bash
npm run build
```
