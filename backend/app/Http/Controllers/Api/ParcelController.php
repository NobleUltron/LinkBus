<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parcel;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParcelController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}
    public function index(Request $request): JsonResponse
    {
        $query = Parcel::with(['originTerminal', 'destinationTerminal'])->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('tracking_number')) {
            $query->where('tracking_number', $request->tracking_number);
        }
        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }
        if ($request->filled('from') || $request->filled('date_from')) {
            $from = $request->input('from', $request->input('date_from'));
            $query->whereDate('created_at', '>=', $from);
        }
        if ($request->filled('to') || $request->filled('date_to')) {
            $to = $request->input('to', $request->input('date_to'));
            $query->whereDate('created_at', '<=', $to);
        }

        $parcels = $query->paginate(20);

        return response()->json([
            'parcels' => $parcels->map(fn($p) => $this->formatParcel($p)),
            'meta'    => ['current_page' => $parcels->currentPage(), 'last_page' => $parcels->lastPage(), 'total' => $parcels->total()],
        ]);
    }

    public function track(Request $request): JsonResponse
    {
        $code = trim($request->get('code', $request->get('tracking_number', '')));
        if (empty($code)) {
            return response()->json(['message' => 'Please enter a valid tracking number or luggage tag.'], 422);
        }

        $cleanCode = ltrim($code, '#');

        // 1. Try finding by Parcel Tracking Number
        $parcel = Parcel::with(['originTerminal', 'destinationTerminal'])
            ->where('tracking_number', $cleanCode)
            ->orWhere('tracking_number', $code)
            ->first();

        if ($parcel) {
            return response()->json([
                'type'   => 'parcel',
                'parcel' => $this->formatParcel($parcel),
                'data'   => $this->formatParcel($parcel),
            ]);
        }

        // 2. Try finding by Luggage Tag Number or Booking Number
        $luggage = \App\Models\Luggage::with([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.tickets.seat',
            'booking.user',
        ])
            ->where('tag_number', $cleanCode)
            ->orWhere('tag_number', $code)
            ->orWhereHas('booking', fn($q) => $q->where('booking_number', $cleanCode)->orWhere('booking_number', $code))
            ->first();

        if ($luggage) {
            $origin = $luggage->booking?->trip?->route?->originTerminal?->name ?? 'Kampala';
            $destination = $luggage->booking?->trip?->route?->destinationTerminal?->name ?? 'Regional Terminal';
            $passengerName = $luggage->booking?->tickets?->first()?->passenger_name ?? $luggage->booking?->user?->name ?? 'Passenger';

            $mappedStatus = match ($luggage->status) {
                'loaded'   => 'in_transit',
                'unloaded' => 'arrived',
                'claimed'  => 'delivered',
                default    => 'received',
            };

            $formattedLuggage = [
                'id'              => $luggage->id,
                'tracking_number' => $luggage->tag_number,
                'booking_number'  => $luggage->booking?->booking_number,
                'passenger_name'  => $passengerName,
                'sender_name'     => $passengerName,
                'recipient_name'  => $passengerName,
                'origin'          => $origin,
                'destination'     => $destination,
                'weight_kg'       => $luggage->weight_kg,
                'description'     => $luggage->description ?? 'Passenger Checked Baggage',
                'status'          => $mappedStatus,
                'raw_status'      => $luggage->status,
                'departure_time'  => $luggage->booking?->trip?->departure_time?->toISOString(),
                'created_at'      => $luggage->created_at?->toISOString(),
            ];

            return response()->json([
                'type'   => 'luggage',
                'parcel' => $formattedLuggage,
                'data'   => $formattedLuggage,
            ]);
        }

        return response()->json(['message' => "No shipment or baggage found matching tracking code '{$code}'."], 404);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sender_name'           => 'required|string|max:255',
            'sender_phone'          => 'required|string|max:30',
            'recipient_name'        => 'required|string|max:255',
            'recipient_phone'       => 'required|string|max:30',
            'origin_terminal_id'    => 'required|exists:terminals,id',
            'destination_terminal_id' => 'required|exists:terminals,id|different:origin_terminal_id',
            'weight_kg'             => 'required|numeric|min:0.1',
            'description'           => 'required|string',
            'price'                 => 'required|integer|min:0',
            'payment_method'        => 'nullable|string|in:cash,mtn_mobile_money,airtel_money,card',
            'notes'                 => 'nullable|string',
        ]);

        $paymentMethod = $data['payment_method'] ?? 'cash';

        $shiftId = null;
        $activeShift = \App\Models\Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
        if ($paymentMethod === 'cash') {
            if (!$activeShift) {
                return response()->json([
                    'message' => 'Shift is Closed! You must open your cash drawer shift before collecting cash parcel fees, or choose MTN MoMo / Airtel Money / Card payment.'
                ], 403);
            }
            $shiftId = $activeShift->id;
        } elseif ($activeShift) {
            $shiftId = $activeShift->id;
        }

        $parcel = DB::transaction(function () use ($data, $paymentMethod, $shiftId, $request, $activeShift) {
            $p = Parcel::create([
                ...$data,
                'tracking_number' => Parcel::generateTrackingNumber(),
                'payment_method'  => $paymentMethod,
                'shift_id'        => $shiftId,
                'status'          => 'received',
            ]);

            if ($activeShift && ($p->price ?? 0) > 0) {
                \App\Models\ShiftTransaction::recordEvent($activeShift, [
                    'user_id'         => $request->user()->id,
                    'type'            => 'cash_fee_parcel',
                    'amount'          => (int) $p->price,
                    'direction'       => 'inflow',
                    'payment_method'  => $paymentMethod,
                    'category'        => 'Parcel Freight',
                    'reason'          => "Courier freight fee for Waybill #{$p->tracking_number} ({$p->weight_kg}kg)",
                    'authorized_by'   => $request->user()->name,
                    'source_type'     => \App\Models\Parcel::class,
                    'source_id'       => $p->id,
                    'idempotency_key' => "parcel-{$p->id}-fee",
                ]);
            }

            return $p;
        });

        $parcel->load(['originTerminal', 'destinationTerminal']);

        try {
            $this->notificationService->notifyParcelStatus($parcel, 'received');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Parcel creation notification error: " . $e->getMessage());
        }

        return response()->json(['parcel' => $this->formatParcel($parcel)], 201);
    }

    public function update(Request $request, Parcel $parcel): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:received,in_transit,arrived,delivered,lost',
            'notes'  => 'nullable|string',
        ]);

        $oldStatus = $parcel->status;
        $parcel->update($data);
        $parcel->load(['originTerminal', 'destinationTerminal']);

        if ($parcel->status !== $oldStatus) {
            try {
                $this->notificationService->notifyParcelStatus($parcel, $parcel->status);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Parcel update notification error: " . $e->getMessage());
            }
        }

        return response()->json(['parcel' => $this->formatParcel($parcel)]);
    }

    private function formatParcel(Parcel $p): array
    {
        return [
            'id'              => $p->id,
            'tracking_number' => $p->tracking_number,
            'sender_name'     => $p->sender_name,
            'sender_phone'    => $p->sender_phone,
            'recipient_name'  => $p->recipient_name,
            'recipient_phone' => $p->recipient_phone,
            'weight_kg'       => $p->weight_kg,
            'description'     => $p->description,
            'price'           => $p->price,
            'status'          => $p->status,
            'notes'           => $p->notes,
            'origin'          => $p->originTerminal?->name,
            'destination'     => $p->destinationTerminal?->name,
            'created_at'      => $p->created_at?->toISOString(),
        ];
    }
}
