<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\ShiftTransaction;
use App\Models\Terminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    /**
     * Get the currently active open shift for the authenticated clerk.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        $shift = Shift::with(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels'])
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (!$shift) {
            return response()->json([
                'active_shift' => null,
                'has_active'   => false,
            ]);
        }

        return response()->json([
            'active_shift' => $shift->getLiveMetrics(),
            'has_active'   => true,
        ]);
    }

    /**
     * Open a new cashier shift with starting cash float.
     */
    public function open(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'starting_cash'   => ['required', 'numeric', 'min:0'],
            'terminal_id'     => ['nullable', 'exists:terminals,id'],
            'bus_id'          => ['nullable', 'exists:buses,id'],
            'supervisor_name' => ['nullable', 'string', 'max:255'],
            'notes'           => ['nullable', 'string', 'max:1000'],
        ]);

        // Guard 1: Prevent duplicate active open shifts for the same clerk
        $existing = Shift::where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => "You already have an active open shift (#{$existing->shift_code}). You must close it before opening a new one.",
                'shift'   => $existing->getLiveMetrics(),
            ], 400);
        }

        $terminalId = $validated['terminal_id'] ?? $user->terminal_id ?? \App\Models\Terminal::first()?->id;

        // Generate unique human-readable shift code SHF-YYMMDD-XXX
        $todayStamp = now()->format('ymd');
        $shiftCountToday = Shift::whereDate('created_at', now()->toDateString())->count();
        $shiftCode = sprintf('SHF-%s-%03d', $todayStamp, $shiftCountToday + 1);

        $shift = DB::transaction(function () use ($user, $validated, $shiftCode, $terminalId) {
            $startingCash = (int) $validated['starting_cash'];

            $s = Shift::create([
                'shift_code'      => $shiftCode,
                'user_id'         => $user->id,
                'terminal_id'     => $terminalId,
                'bus_id'          => $validated['bus_id'] ?? null,
                'starting_cash'   => $startingCash,
                'expected_cash'   => $startingCash,
                'status'          => 'open',
                'opened_at'       => now(),
                'supervisor_name' => $validated['supervisor_name'] ?? 'Station Duty Supervisor',
                'closing_notes'   => $validated['notes'] ?? null,
            ]);

            // Record initial float movement in immutable ledger
            if ($startingCash > 0) {
                ShiftTransaction::recordEvent($s, [
                    'user_id'         => $user->id,
                    'type'            => 'float_in',
                    'amount'          => $startingCash,
                    'direction'       => 'inflow',
                    'payment_method'  => 'cash',
                    'category'        => 'Opening Float',
                    'reason'          => $validated['notes'] ?? 'Shift opening till float change',
                    'authorized_by'   => $validated['supervisor_name'] ?? 'Station Duty Supervisor',
                    'source_type'     => Shift::class,
                    'source_id'       => $s->id,
                    'idempotency_key' => "shift-{$s->id}-float-in",
                ]);
            }

            return $s;
        });

        return response()->json([
            'message' => 'Shift opened successfully. Counter cash desk unlocked.',
            'shift'   => $shift->getLiveMetrics(),
        ], 201);
    }

    /**
     * Reconcile physical cash and close the active shift (Z-Report).
     */
    public function close(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'actual_cash'     => ['required', 'numeric', 'min:0'],
            'denominations'   => ['nullable', 'array'],
            'variance_reason' => ['nullable', 'string', 'max:500'],
            'closing_notes'   => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($user, $validated) {
            $shift = Shift::with(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels'])
                ->where('user_id', $user->id)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                return response()->json([
                    'message' => 'No active open shift found for your account.',
                ], 404);
            }

            $expectedCash = $shift->calculateExpectedCash();
            $actualCash = (int) $validated['actual_cash'];
            $difference = $actualCash - $expectedCash;

            if ($difference !== 0 && empty(trim($validated['variance_reason'] ?? ''))) {
                return response()->json([
                    'message' => 'A variance reason is required when counted physical cash does not match expected till cash.',
                    'errors'  => ['variance_reason' => ['Please provide a written explanation for the cash variance.']],
                ], 422);
            }

            $shift->update([
                'expected_cash'      => $expectedCash,
                'actual_cash'        => $actualCash,
                'difference'         => $difference,
                'denominations'      => $validated['denominations'] ?? null,
                'status'             => 'closed',
                'closed_at'          => now(),
                'closed_by_user_id'  => $user->id,
                'variance_reason'    => $validated['variance_reason'] ?? null,
                'closing_notes'      => $validated['closing_notes'] ?? null,
            ]);

            return response()->json([
                'message' => 'Shift closed and reconciled successfully. Official Z-Report generated.',
                'shift'   => $shift->fresh(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels', 'closedBy'])->getLiveMetrics(),
            ]);
        });
    }

    /**
     * Record a mid-shift drawer movement (Petty Expense, Safe Drop, Cash-In Float Top-up, Adjustment).
     */
    public function addTransaction(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'type'          => ['required', 'in:cash_in,petty_expense,safe_drop,refund,adjustment'],
            'amount'        => ['required', 'numeric', 'min:100'],
            'category'      => ['required', 'string', 'max:100'],
            'reason'        => ['required', 'string', 'max:500'],
            'authorized_by' => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($user, $validated) {
            $shift = Shift::where('user_id', $user->id)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                return response()->json([
                    'message' => 'Forbidden: You must have an active open shift to record drawer transactions or expenses.',
                ], 403);
            }

            $amount = (int) $validated['amount'];
            $isOutflow = in_array($validated['type'], ['petty_expense', 'safe_drop', 'refund']);

            // Overdraft Guardrail: Ensure expenses and safe drops don't exceed physical cash in till
            if ($isOutflow) {
                $availableInTill = $shift->calculateExpectedCash();
                if ($amount > $availableInTill) {
                    return response()->json([
                        'message' => "Insufficient cash in active drawer! Current till balance is UGX " . number_format($availableInTill) . ", cannot withdraw UGX " . number_format($amount) . ".",
                    ], 422);
                }
            }

            $direction = $isOutflow ? 'outflow' : 'inflow';

            $tx = ShiftTransaction::recordEvent($shift, [
                'user_id'        => $user->id,
                'type'           => $validated['type'],
                'amount'         => $amount,
                'direction'      => $direction,
                'payment_method' => 'cash',
                'category'       => $validated['category'],
                'reason'         => $validated['reason'],
                'authorized_by'  => $validated['authorized_by'] ?? $shift->supervisor_name,
            ]);

            return response()->json([
                'message'     => 'Drawer transaction recorded successfully.',
                'transaction' => $tx,
                'shift'       => $shift->fresh(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels'])->getLiveMetrics(),
            ], 201);
        });
    }

    /**
     * Supervisor / Admin authorized endpoint to reopen a closed shift.
     */
    public function reopen(Request $request, Shift $shift): JsonResponse
    {
        $user = $request->user();
        $userRole = $user->role?->slug ?? $user->role?->name ?? '';
        $isSupervisor = $user->isAdmin() || in_array($userRole, ['admin', 'super_admin', 'station_manager', 'supervisor']);

        if (!$isSupervisor) {
            return response()->json([
                'message' => 'Unauthorized: Only station supervisors and administrators can reopen closed shifts.',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        if ($shift->status !== 'closed') {
            return response()->json([
                'message' => "Shift #{$shift->shift_code} is not currently closed (status: {$shift->status}).",
            ], 422);
        }

        // Verify the cashier does not currently have another open shift
        $cashierOpenShift = Shift::where('user_id', $shift->user_id)
            ->where('status', 'open')
            ->where('id', '!=', $shift->id)
            ->first();

        if ($cashierOpenShift) {
            return response()->json([
                'message' => "Cannot reopen: Cashier {$shift->user->name} already has an active open shift (#{$cashierOpenShift->shift_code}).",
            ], 422);
        }

        DB::transaction(function () use ($shift, $user, $validated) {
            // Post an immutable audit journal entry
            ShiftTransaction::recordEvent($shift, [
                'user_id'        => $user->id,
                'type'           => 'adjustment',
                'amount'         => 0,
                'direction'      => 'inflow',
                'payment_method' => 'cash',
                'category'       => 'Shift Reopened',
                'reason'         => "Shift reopened by {$user->name}: " . $validated['reason'],
                'authorized_by'  => $user->name,
            ]);

            $shift->update([
                'status'             => 'open',
                'closed_at'          => null,
                'closed_by_user_id'  => null,
            ]);
        });

        return response()->json([
            'message' => "Shift #{$shift->shift_code} reopened successfully.",
            'shift'   => $shift->fresh(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels'])->getLiveMetrics(),
        ]);
    }

    /**
     * Paginated Shift Audit Ledger for management and cashiers.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRole = $user->role?->slug ?? $user->role?->name ?? '';
        $isManager = $user->isAdmin() || in_array($userRole, ['admin', 'super_admin', 'station_manager', 'auditor', 'supervisor']);

        $query = Shift::with(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels', 'closedBy'])
            ->latest('opened_at');

        // Regular clerks only view their own shifts
        if (!$isManager) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('terminal_id')) {
            $query->where('terminal_id', $request->terminal_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('opened_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('opened_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('shift_code', 'like', $search)
                  ->orWhere('supervisor_name', 'like', $search)
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', $search))
                  ->orWhereHas('terminal', fn($t) => $t->where('name', 'like', $search)->orWhere('city', 'like', $search));
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $paginated = $query->paginate($perPage);

        // Transform into standardized reconciliation metrics format
        $data = collect($paginated->items())->map(fn(Shift $s) => $s->getLiveMetrics());

        return response()->json([
            'data' => $data,
            'meta' => [
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
            ],
        ]);
    }

    /**
     * Detailed Z-Report & Audit Summary for printing and PDF generation.
     */
    public function report(Request $request, Shift $shift): JsonResponse
    {
        $user = $request->user();
        $isManager = in_array($user->role?->name ?? '', ['admin', 'super_admin', 'station_manager', 'auditor', 'supervisor']);

        if (!$isManager && $shift->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized to view another cashier’s shift report.'], 403);
        }

        $shift->load(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels', 'closedBy']);

        return response()->json([
            'report' => $shift->getLiveMetrics(),
        ]);
    }
}
