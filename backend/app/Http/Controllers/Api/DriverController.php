<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DriverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Driver::with(['user', 'assignedBus']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('license_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhereHas('user', function($uq) use ($s) {
                      $uq->where('name', 'like', "%{$s}%")
                         ->orWhere('phone', 'like', "%{$s}%")
                         ->orWhere('email', 'like', "%{$s}%");
                  })
                  ->orWhereHas('assignedBus', function($bq) use ($s) {
                      $bq->where('plate_number', 'like', "%{$s}%");
                  });
            });
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

        $drivers = $query->orderBy('created_at', 'desc')->get();
        return response()->json([
            'drivers' => $drivers->map(fn($d) => $this->formatDriver($d)),
        ]);
    }

    public function show(Driver $driver): JsonResponse
    {
        $driver->load(['user', 'assignedBus', 'trips.route.originTerminal', 'trips.route.destinationTerminal']);
        return response()->json(['driver' => $this->formatDriver($driver)]);
    }

    public function store(Request $request): JsonResponse
    {
        $assignedBusId = $request->input('assigned_bus_id');
        if ($assignedBusId) {
            $this->validateBusAssignment((int) $assignedBusId);
        }

        // Support linking an existing staff account via user_id, OR creating a brand new driver account
        $userId = (int) $request->input('user_id');
        if ($userId > 0) {
            $data = $request->validate([
                'user_id'          => 'required|integer|exists:users,id|unique:drivers,user_id',
                'assigned_bus_id'  => 'nullable|integer|exists:buses,id',
                'license_number'   => 'required|string|unique:drivers,license_number',
                'license_expiry'   => 'required|date',
                'experience_years' => 'nullable|integer|min:0',
                'status'           => 'in:active,suspended,on_leave',
                'notes'            => 'nullable|string',
            ]);

            $driverRole = Role::where('slug', 'driver')->first();
            $user = User::findOrFail($data['user_id']);
            if ($driverRole && $user->role_id !== $driverRole->id) {
                $user->update(['role_id' => $driverRole->id]);
            }

            $driver = Driver::create([
                'user_id'          => $user->id,
                'assigned_bus_id'  => $data['assigned_bus_id'] ?? null,
                'license_number'   => $data['license_number'],
                'license_expiry'   => $data['license_expiry'],
                'experience_years' => $data['experience_years'] ?? 0,
                'status'           => $data['status'] ?? 'active',
                'notes'            => $data['notes'] ?? null,
            ]);

            return response()->json(['driver' => $this->formatDriver($driver->load(['user', 'assignedBus']))], 201);
        }

        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|unique:users,email',
            'phone'            => 'nullable|string|max:30',
            'password'         => 'nullable|string|min:8',
            'assigned_bus_id'  => 'nullable|integer|exists:buses,id',
            'license_number'   => 'required|string|unique:drivers,license_number',
            'license_expiry'   => 'required|date',
            'experience_years' => 'nullable|integer|min:0',
            'status'           => 'in:active,suspended,on_leave',
            'notes'            => 'nullable|string',
        ]);

        $driverRole = Role::where('slug', 'driver')->firstOrFail();
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'] ?? null,
            'role_id'  => $driverRole->id,
            'password' => Hash::make($data['password'] ?? 'linkbus@driver'),
        ]);

        $driver = Driver::create([
            'user_id'          => $user->id,
            'assigned_bus_id'  => $data['assigned_bus_id'] ?? null,
            'license_number'   => $data['license_number'],
            'license_expiry'   => $data['license_expiry'],
            'experience_years' => $data['experience_years'] ?? 0,
            'status'           => $data['status'] ?? 'active',
            'notes'            => $data['notes'] ?? null,
        ]);

        return response()->json(['driver' => $this->formatDriver($driver->load(['user', 'assignedBus']))], 201);
    }

    public function update(Request $request, Driver $driver): JsonResponse
    {
        $data = $request->validate([
            'assigned_bus_id'  => 'nullable|integer|exists:buses,id',
            'license_number'   => "sometimes|string|unique:drivers,license_number,{$driver->id}",
            'license_expiry'   => 'sometimes|date',
            'experience_years' => 'sometimes|integer|min:0',
            'status'           => 'sometimes|in:active,suspended,on_leave',
            'notes'            => 'nullable|string',
            'name'             => 'sometimes|string',
            'phone'            => 'nullable|string',
        ]);

        if (array_key_exists('assigned_bus_id', $data) && $data['assigned_bus_id']) {
            $this->validateBusAssignment((int) $data['assigned_bus_id'], $driver->id);
        }

        if (isset($data['name']) || isset($data['phone'])) {
            $driver->user->update(array_filter([
                'name'  => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
            ], fn($v) => !is_null($v)));
        }

        $driver->update(array_intersect_key($data, array_flip(['assigned_bus_id', 'license_number', 'license_expiry', 'experience_years', 'status', 'notes'])));

        return response()->json(['driver' => $this->formatDriver($driver->load(['user', 'assignedBus']))]);
    }

    private function validateBusAssignment(int $busId, ?int $excludeDriverId = null): void
    {
        $existing = Driver::with('user')
            ->where('assigned_bus_id', $busId)
            ->where('status', 'active')
            ->when($excludeDriverId, fn($q) => $q->where('id', '!=', $excludeDriverId))
            ->first();

        if ($existing) {
            $bus = Bus::find($busId);
            $plate = $bus?->plate_number ?? "Coach #{$busId}";
            $driverName = $existing->user?->name ?? "Driver #{$existing->id}";
            throw ValidationException::withMessages([
                'assigned_bus_id' => ["Bus Assignment Conflict: Coach {$plate} is already assigned to {$driverName}. A coach cannot have multiple active drivers."],
            ]);
        }
    }

    private function formatDriver(Driver $driver): array
    {
        return [
            'id'               => $driver->id,
            'user_id'          => $driver->user_id,
            'assigned_bus_id'  => $driver->assigned_bus_id,
            'assigned_bus'     => $driver->assignedBus ? [
                'id'           => $driver->assignedBus->id,
                'plate_number' => $driver->assignedBus->plate_number,
                'model'        => $driver->assignedBus->model,
                'bus_type'     => $driver->assignedBus->bus_type,
                'capacity'     => $driver->assignedBus->capacity,
            ] : null,
            'name'             => $driver->user?->name,
            'email'            => $driver->user?->email,
            'phone'            => $driver->user?->phone,
            'license_number'   => $driver->license_number,
            'license_expiry'   => $driver->license_expiry?->toDateString(),
            'status'           => $driver->status,
            'experience_years' => $driver->experience_years,
            'notes'            => $driver->notes,
        ];
    }
}
