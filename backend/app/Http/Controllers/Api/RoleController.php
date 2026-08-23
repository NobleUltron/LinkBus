<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * Display a listing of roles.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Role::query()->withCount('users');

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('slug', 'like', $term)
                  ->orWhere('description', 'like', $term);
            });
        }

        $roles = $query->orderBy('id', 'asc')->get();

        return response()->json([
            'roles' => $roles,
            'data'  => $roles,
            'meta'  => [
                'total'        => $roles->count(),
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $roles->count(),
            ],
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'required|string|max:50|unique:roles,slug',
            'description' => 'nullable|string|max:500',
        ], [
            'slug.unique' => 'A role with this permission slug already exists.',
        ]);

        $role = Role::create($data);

        return response()->json([
            'message' => 'Role created successfully.',
            'role'    => $role,
            'data'    => $role,
        ], 201);
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'role' => $role->loadCount('users'),
            'data' => $role,
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:100',
            'slug'        => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'slug')->ignore($role->id),
            ],
            'description' => 'nullable|string|max:500',
        ]);

        $role->update($data);

        return response()->json([
            'message' => 'Role updated successfully.',
            'role'    => $role->fresh()->loadCount('users'),
            'data'    => $role,
        ]);
    }

    /**
     * Remove the specified role.
     */
    public function destroy(Role $role): JsonResponse
    {
        // Protect system built-in roles from being deleted
        if (in_array($role->slug, ['admin', 'staff', 'driver', 'passenger'])) {
            return response()->json([
                'message' => 'System default roles (Admin, Staff, Driver, Passenger) cannot be deleted.',
            ], 422);
        }

        if ($role->users()->count() > 0) {
            return response()->json([
                'message' => "Cannot delete '{$role->name}' because {$role->users()->count()} user(s) are currently assigned to it.",
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }
}
