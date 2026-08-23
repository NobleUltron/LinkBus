<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parcel;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $request->validate(['tracking_number' => 'required|string']);
        $parcel = Parcel::with(['originTerminal', 'destinationTerminal'])
            ->where('tracking_number', $request->tracking_number)
            ->first();

        if (!$parcel) {
            return response()->json(['message' => 'Parcel not found.'], 404);
        }

        return response()->json(['parcel' => $this->formatParcel($parcel)]);
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
            'notes'                 => 'nullable|string',
        ]);

        $parcel = Parcel::create([
            ...$data,
            'tracking_number' => Parcel::generateTrackingNumber(),
            'status'          => 'received',
        ]);

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
