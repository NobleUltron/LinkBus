<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userRole = $user->role?->slug ?? (is_string($user->role) ? $user->role : null);

        // Super Admin automatically inherits permissions across all operational roles
        if ($userRole === 'admin' || in_array($userRole, $roles)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'You do not have permission to access this resource.',
            'required_roles' => $roles,
            'current_role' => $userRole,
        ], 403);
    }
}
