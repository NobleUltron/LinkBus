<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('originTerminal', function ($sub) use ($term) {
                    $sub->where('name', 'like', $term)->orWhere('city', 'like', $term);
                })->orWhereHas('destinationTerminal', function ($sub) use ($term) {
                    $sub->where('name', 'like', $term)->orWhere('city', 'like', $term);
                });
            });
        }

        $routes = $query->get();

        return response()->json([
            'routes' => $routes->map(fn($r) => $this->formatRoute($r)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'origin_terminal_id'         => 'required|exists:terminals,id',
            'destination_terminal_id'    => [
                'required',
                'exists:terminals,id',
                'different:origin_terminal_id',
                \Illuminate\Validation\Rule::unique('bus_routes')
                    ->where('origin_terminal_id', $request->origin_terminal_id),
            ],
            'distance_km'                => 'required|integer|min:1',
            'estimated_duration_minutes' => 'required|integer|min:1',
            'status'                     => 'sometimes|in:active,inactive',
        ], [
            'destination_terminal_id.unique' => 'A route between these two terminals already exists.',
            'destination_terminal_id.different' => 'Origin and destination terminals must be different.',
        ]);

        $route = BusRoute::create([
            'origin_terminal_id'         => $data['origin_terminal_id'],
            'destination_terminal_id'    => $data['destination_terminal_id'],
            'distance_km'                => $data['distance_km'],
            'estimated_duration_minutes' => $data['estimated_duration_minutes'],
            'status'                     => $data['status'] ?? 'active',
        ]);

        $route->load(['originTerminal', 'destinationTerminal']);
        return response()->json(['route' => $this->formatRoute($route)], 201);
    }

    public function show(BusRoute $route): JsonResponse
    {
        $route->load(['originTerminal', 'destinationTerminal']);
        return response()->json(['route' => $this->formatRoute($route)]);
    }

    public function update(Request $request, BusRoute $route): JsonResponse
    {
        $data = $request->validate([
            'origin_terminal_id'         => 'sometimes|exists:terminals,id',
            'destination_terminal_id'    => 'sometimes|exists:terminals,id',
            'distance_km'                => 'sometimes|integer|min:1',
            'estimated_duration_minutes' => 'sometimes|integer|min:1',
            'status'                     => 'sometimes|in:active,inactive',
        ]);

        $route->update($data);
        $route->load(['originTerminal', 'destinationTerminal']);
        return response()->json(['route' => $this->formatRoute($route)]);
    }

    public function destroy(BusRoute $route): JsonResponse
    {
        $route->delete();
        return response()->json(['message' => 'Route deleted successfully.']);
    }

    private function formatRoute(BusRoute $route): array
    {
        return [
            'id'                          => $route->id,
            'origin_terminal_id'          => $route->origin_terminal_id,
            'destination_terminal_id'     => $route->destination_terminal_id,
            'distance_km'                 => $route->distance_km,
            'estimated_duration_minutes'  => $route->estimated_duration_minutes,
            'status'                      => $route->status,
            'origin'                      => [
                'id'   => $route->originTerminal?->id,
                'name' => $route->originTerminal?->name,
                'city' => $route->originTerminal?->city,
            ],
            'destination'                 => [
                'id'   => $route->destinationTerminal?->id,
                'name' => $route->destinationTerminal?->name,
                'city' => $route->destinationTerminal?->city,
            ],
        ];
    }
}
