<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusController extends Controller
{
    public function index(): JsonResponse
    {
        $buses = Bus::with(['assignedDriver.user'])->orderBy('plate_number')->get();
        return response()->json([
            'buses' => $buses->map(fn($b) => $this->formatBus($b)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plate_number' => 'required|string|unique:buses',
            'model'        => 'required|string',
            'bus_type'     => 'required|in:standard,vip,sleeper',
            'capacity'     => 'required|integer|min:1|max:100',
            'status'       => 'in:active,maintenance,retired',
            'notes'        => 'nullable|string',
        ]);

        $bus = Bus::create($data);
        return response()->json(['bus' => $this->formatBus($bus->load(['assignedDriver.user']))], 201);
    }

    public function update(Request $request, Bus $bus): JsonResponse
    {
        $data = $request->validate([
            'plate_number' => "sometimes|string|unique:buses,plate_number,{$bus->id}",
            'model'        => 'sometimes|string',
            'bus_type'     => 'sometimes|in:standard,vip,sleeper',
            'capacity'     => 'sometimes|integer|min:1|max:100',
            'status'       => 'sometimes|in:active,maintenance,retired',
            'notes'        => 'nullable|string',
        ]);

        $bus->update($data);
        return response()->json(['bus' => $this->formatBus($bus->load(['assignedDriver.user']))]);
    }

    public function destroy(Bus $bus): JsonResponse
    {
        $bus->update(['status' => 'retired']);
        return response()->json(['message' => 'Bus retired.']);
    }

    private function formatBus(Bus $bus): array
    {
        return [
            'id'              => $bus->id,
            'plate_number'    => $bus->plate_number,
            'model'           => $bus->model,
            'bus_type'        => $bus->bus_type,
            'capacity'        => $bus->capacity,
            'status'          => $bus->status,
            'notes'           => $bus->notes,
            'assigned_driver' => $bus->assignedDriver ? [
                'id'             => $bus->assignedDriver->id,
                'name'           => $bus->assignedDriver->user?->name,
                'license_number' => $bus->assignedDriver->license_number,
                'status'         => $bus->assignedDriver->status,
            ] : null,
            'created_at'      => $bus->created_at?->toISOString(),
            'updated_at'      => $bus->updated_at?->toISOString(),
        ];
    }
}
