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

        $shift = Shift::with(['terminal', 'user', 'transactions'])
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

        // Guard: Prevent duplicate active open shifts for the same clerk
        $existing = Shift::where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => "You already have an active open shift (#{$existing->shift_code}). You must close it before opening a new one.",
                'shift'   => $existing->getLiveMetrics(),
            ], 400);
        }

        $terminalId = $validated['terminal_id'] ?? $user->terminal_id ?? 1;
        $terminal = Terminal::find($terminalId);

        // Generate unique shift code SHF-YYMMDD-XXX
        $todayStamp = now()->format('ymd');
        $randomSeq = str_pad((string) (Shift::whereDate('created_at', now()->toDateString())->count() + 1), 3, '0', STR_PAD_LEFT);
        $shiftCode = "SHF-{$todayStamp}-{$randomSeq}";

        $shift = DB::transaction(function () use ($user, $validated, $shiftCode, $terminalId) {
            $s = Shift::create([
                'shift_code'      => $shiftCode,
                'user_id'         => $user->id,
                'terminal_id'     => $terminalId,
                'bus_id'          => $validated['bus_id'] ?? null,
                'starting_cash'   => (int) $validated['starting_cash'],
                'status'          => 'open',
                'opened_at'       => now(),
                'supervisor_name' => $validated['supervisor_name'] ?? 'Station Duty Supervisor',
                'closing_notes'   => $validated['notes'] ?? null,
            ]);

            // Record initial float movement in ledger
            if ((int) $validated['starting_cash'] > 0) {
                ShiftTransaction::create([
                    'shift_id'      => $s->id,
                    'user_id'       => $user->id,
                    'type'          => 'cash_in',
                    'amount'        => (int) $validated['starting_cash'],
                    'category'      => 'Opening Float',
                    'reason'        => $validated['notes'] ?? 'Shift opening till float change',
                    'authorized_by' => $validated['supervisor_name'] ?? 'Station Duty Supervisor',
                ]);
            }

            return $s;
        });

        return response()->json([
            'message' => 'Shift opened successfully. Counter desk unlocked.',
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

        $shift = Shift::with(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels'])
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (!$shift) {
            return response()->json([
                'message' => 'No active open shift found for your account.',
            ], 404);
        }

        $expectedCash = $shift->calculateExpectedCash();
        $actualCash = (int) $validated['actual_cash'];
        $difference = $actualCash - $expectedCash;

        if ($difference !== 0 && empty($validated['variance_reason'])) {
            return response()->json([
                'message' => 'A variance reason is required when counted cash does not match system expected cash.',
                'errors'  => ['variance_reason' => ['Please provide an explanation for the cash variance.']],
            ], 422);
        }

        $shift->update([
            'expected_cash'   => $expectedCash,
            'actual_cash'     => $actualCash,
            'difference'      => $difference,
            'denominations'   => $validated['denominations'] ?? null,
            'status'          => 'closed',
            'closed_at'       => now(),
            'variance_reason' => $validated['variance_reason'] ?? null,
            'closing_notes'   => $validated['closing_notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Shift closed and reconciled successfully. Official Z-Report generated.',
            'shift'   => $shift->fresh(['terminal', 'user', 'transactions'])->getLiveMetrics(),
        ]);
    }

    /**
     * Record a mid-shift drawer movement (Petty Expense, Safe Drop, Cash-In Float Top-up).
     */
    public function addTransaction(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'type'          => ['required', 'in:cash_in,petty_expense,safe_drop,refund'],
            'amount'        => ['required', 'numeric', 'min:100'],
            'category'      => ['required', 'string', 'max:100'],
            'reason'        => ['required', 'string', 'max:500'],
            'authorized_by' => ['nullable', 'string', 'max:255'],
        ]);

        $shift = Shift::where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json([
                'message' => 'Forbidden: You must have an active open shift to record drawer transactions or expenses.',
            ], 403);
        }

        $amount = (int) $validated['amount'];

        // Overdraft Guardrail: Ensure expenses and safe drops don't exceed cash in till
        if (in_array($validated['type'], ['petty_expense', 'safe_drop', 'refund'])) {
            $availableInTill = $shift->calculateExpectedCash();
            if ($amount > $availableInTill) {
                return response()->json([
                    'message' => "Insufficient cash in active drawer! Current till balance is UGX " . number_format($availableInTill) . ", cannot withdraw UGX " . number_format($amount) . ".",
                ], 422);
            }
        }

        $tx = ShiftTransaction::create([
            'shift_id'      => $shift->id,
            'user_id'       => $user->id,
            'type'          => $validated['type'],
            'amount'        => $amount,
            'category'      => $validated['category'],
            'reason'        => $validated['reason'],
            'authorized_by' => $validated['authorized_by'] ?? $shift->supervisor_name,
        ]);

        return response()->json([
            'message'     => 'Drawer transaction recorded successfully.',
            'transaction' => $tx,
            'shift'       => $shift->fresh(['terminal', 'user', 'transactions'])->getLiveMetrics(),
        ], 201);
    }

    /**
     * Paginated Shift Audit Ledger for management and cashiers.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $isManager = in_array($user->role?->name ?? '', ['admin', 'super_admin', 'station_manager', 'auditor', 'supervisor']);

        $query = Shift::with(['terminal', 'user', 'transactions'])
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
        $shift->load(['terminal', 'user', 'transactions', 'bookings', 'luggage', 'parcels']);
        return response()->json([
            'report' => $shift->getLiveMetrics(),
        ]);
    }
}
