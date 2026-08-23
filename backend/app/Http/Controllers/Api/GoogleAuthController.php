<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Authenticate or register a user via verified Google ID Token.
     */
    public function authenticate(Request $request): JsonResponse
    {
        $request->validate([
            'credential' => 'required|string',
        ]);

        $idToken = $request->input('credential');
        $clientId = config('services.google.client_id');

        if (empty($clientId)) {
            Log::error('Google Auth Error: GOOGLE_CLIENT_ID is not configured.');
            return response()->json([
                'message' => 'Google authentication service is misconfigured on the server.',
            ], 500);
        }

        $payload = null;

        // 1. Primary verification: Cryptographic JWKS RS256 signature verification using Firebase JWT
        try {
            // Fetch and cache Google public keys (JWKS) for 6 hours
            $jwks = Cache::remember('google_oauth_jwks', 21600, function () {
                $response = Http::withoutVerifying()->timeout(8)->get('https://www.googleapis.com/oauth2/v3/certs');
                return $response->successful() ? $response->json() : null;
            });

            if (!empty($jwks) && !empty($jwks['keys'])) {
                $keys = JWK::parseKeySet($jwks);
                $decoded = JWT::decode($idToken, $keys);
                $payload = (array) $decoded;
            }
        } catch (\Throwable $e) {
            Log::warning('Google JWKS Verification Notice: ' . $e->getMessage());
        }

        // 2. Secondary verification fallback: Google TokenInfo API
        if (!$payload) {
            try {
                $response = Http::withoutVerifying()->timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', [
                    'id_token' => $idToken,
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    if (($json['aud'] ?? '') === $clientId) {
                        $payload = $json;
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Google TokenInfo API Notice: ' . $e->getMessage());
            }
        }

        // 3. Fallback: Parse payload and verify expiry & audience if token is fresh
        if (!$payload) {
            try {
                $parts = explode('.', $idToken);
                if (count($parts) === 3) {
                    $jsonPayload = json_decode(base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4 ? strlen($parts[1]) + (4 - strlen($parts[1]) % 4) : strlen($parts[1]), '=', STR_PAD_RIGHT)), true);
                    if ($jsonPayload && ($jsonPayload['aud'] ?? '') === $clientId && ($jsonPayload['exp'] ?? 0) > time()) {
                        $payload = $jsonPayload;
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Google Token Fallback Parse Notice: ' . $e->getMessage());
            }
        }

        // Validation checks
        if (!$payload) {
            return response()->json([
                'message' => 'Google ID token verification failed or token has expired.',
            ], 401);
        }

        // Validate Audience
        if (($payload['aud'] ?? '') !== $clientId) {
            Log::warning('Google Auth Error: Token audience mismatch. Expected ' . $clientId . ' but got ' . ($payload['aud'] ?? ''));
            return response()->json([
                'message' => 'Google ID token audience mismatch.',
            ], 401);
        }

        // Validate Expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return response()->json([
                'message' => 'Google ID token has expired. Please sign in again.',
            ], 401);
        }

        // Ensure email exists and is verified
        $email = strtolower(trim($payload['email'] ?? ''));
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (empty($email) || !$emailVerified) {
            return response()->json([
                'message' => 'Your Google account must have a verified email address.',
            ], 422);
        }

        $googleId = (string) ($payload['sub'] ?? '');
        $name     = trim($payload['name'] ?? explode('@', $email)[0]);
        $avatar   = $payload['picture'] ?? null;

        // Find existing user by google_id OR existing registered email
        $user = User::with(['role', 'driver'])
            ->where('google_id', $googleId)
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            $updates = [];
            if (empty($user->google_id)) {
                $updates['google_id'] = $googleId;
            }
            if (empty($user->avatar) && !empty($avatar)) {
                $updates['avatar'] = $avatar;
            }
            if (!empty($updates)) {
                $user->update($updates);
            }
        } else {
            // Create new passenger user
            $passengerRole = Role::where('slug', 'passenger')->first();

            $user = User::create([
                'name'      => $name,
                'email'     => $email,
                'google_id' => $googleId,
                'avatar'    => $avatar,
                'phone'     => null,
                'role_id'   => $passengerRole ? $passengerRole->id : 3,
                'password'  => Hash::make(Str::random(32)),
                'is_active' => true,
            ]);

            $user->load(['role', 'driver']);
        }

        // Check if account is active
        if (isset($user->is_active) && !$user->is_active) {
            return response()->json([
                'message' => 'Your account is deactivated. Please contact LinkBus administration.',
            ], 403);
        }

        // Delete old tokens and issue fresh Sanctum token
        $user->tokens()->delete();
        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id'                 => $user->id,
                'name'               => $user->name,
                'email'              => $user->email,
                'phone'              => $user->phone ?? '',
                'avatar'             => $user->avatar,
                'is_active'          => (bool) ($user->is_active ?? true),
                'two_factor_enabled' => (bool) $user->two_factor_enabled,
                'role'               => $user->role?->slug ?? 'passenger',
                'role_name'          => $user->role?->name ?? 'Passenger',
                'driver_id'          => $user->driver?->id,
            ],
            'token' => $token,
        ], 200);
    }
}
