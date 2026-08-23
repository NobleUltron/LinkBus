<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Terminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerminalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Terminal::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('city')) {
            $query->where('city', $request->city);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('city', 'like', '%' . $request->search . '%')
                  ->orWhere('address', 'like', '%' . $request->search . '%');
            });
        }

        $terminals = $query->orderBy('city')->orderBy('name')->get();

        return response()->json([
            'terminals' => $terminals->map(fn($t) => [
                'id'        => $t->id,
                'name'      => $t->name,
                'city'      => $t->city,
                'address'   => $t->address,
                'latitude'  => $t->latitude,
                'longitude' => $t->longitude,
                'status'    => $t->status,
                'photo'     => $t->photo ?? null,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'city'      => 'required|string|max:100',
            'address'   => 'required|string',
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status'    => 'in:active,inactive',
            'photo'     => 'nullable|string',
        ]);

        if (isset($data['photo']) && str_starts_with($data['photo'], 'data:image')) {
            $data['photo'] = $this->savePhotoFromBase64($data['photo']);
        }

        $terminal = Terminal::create($data);
        return response()->json(['terminal' => $terminal], 201);
    }

    public function update(Request $request, Terminal $terminal): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'city'      => 'sometimes|string|max:100',
            'address'   => 'sometimes|string',
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status'    => 'sometimes|in:active,inactive',
            'photo'     => 'nullable|string',
        ]);

        if (isset($data['photo']) && str_starts_with($data['photo'], 'data:image')) {
            $data['photo'] = $this->savePhotoFromBase64($data['photo']);
        }

        $terminal->update($data);
        return response()->json(['terminal' => $terminal]);
    }

    private function savePhotoFromBase64(string $base64): ?string
    {
        try {
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $imageContent = substr($base64, strpos($base64, ',') + 1);
                $imageContent = base64_decode($imageContent);
                $extension = strtolower($type[1]);
                if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                    $extension = 'jpg';
                }
                $filename = 'terminals/terminal_' . time() . '_' . \Illuminate\Support\Str::random(8) . '.' . $extension;
                \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $imageContent);
                return '/storage/' . $filename;
            }
        } catch (\Throwable $e) {
            // Return null or keep as-is if fail
        }
        return $base64;
    }

    public function destroy(Terminal $terminal): JsonResponse
    {
        // If terminal has associated routes, safely mark inactive
        $hasRoutes = \App\Models\BusRoute::where('origin_terminal_id', $terminal->id)
            ->orWhere('destination_terminal_id', $terminal->id)
            ->exists();

        if ($hasRoutes) {
            $terminal->update(['status' => 'inactive']);
            return response()->json(['message' => 'Terminal has active route corridors. Status set to Inactive.']);
        }

        $terminal->delete();
        return response()->json(['message' => 'Terminal deleted.']);
    }
}
