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
        $buses = Bus::orderBy('plate_number')->get();
        return response()->json(['buses' => $buses]);
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
        return response()->json(['bus' => $bus], 201);
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
        return response()->json(['bus' => $bus]);
    }

    public function destroy(Bus $bus): JsonResponse
    {
        $bus->update(['status' => 'retired']);
        return response()->json(['message' => 'Bus retired.']);
    }
}
