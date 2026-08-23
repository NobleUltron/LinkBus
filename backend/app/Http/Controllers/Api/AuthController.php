<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TwoFactorCodeMail;
use App\Models\Role;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected SmsService $smsService
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'phone'    => 'nullable|string|max:30',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $passengerRole = Role::where('slug', 'passenger')->firstOrFail();

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'] ?? null,
            'role_id'  => $passengerRole->id,
            'password' => Hash::make($data['password']),
        ]);

        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user->load('role')),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // ── Check if Account is Active ────────────────────────────────
        if (isset($user->is_active) && !$user->is_active) {
            return response()->json([
                'message' => 'Your account is currently deactivated. Please contact LinkBus system administration.',
            ], 403);
        }

        // ── Check if Two-Factor Authentication is Enabled ─────────────
        if ($user->two_factor_enabled) {
            $code = sprintf('%06d', mt_rand(100000, 999999));

            $user->update([
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(10),
            ]);

            // Dispatch 2FA Security Email
            try {
                Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
            } catch (\Throwable $e) {
                Log::error("Failed to send 2FA email to {$user->email}: " . $e->getMessage());
            }

            // Dispatch SMS if user has phone number
            if (!empty($user->phone)) {
                try {
                    $this->smsService->send(
                        phone: $user->phone,
                        message: "Your LinkBus security verification code is: {$code}. Valid for 10 minutes.",
                        userId: $user->id,
                        metadata: ['title' => '2FA Security Code']
                    );
                } catch (\Throwable $e) {
                    Log::error("Failed to send 2FA SMS: " . $e->getMessage());
                }
            }

            // Generate secure encrypted challenge token (valid for 10 minutes)
            $challengePayload = json_encode([
                'user_id'    => $user->id,
                'expires_at' => now()->addMinutes(10)->timestamp,
            ]);

            $challengeToken = Crypt::encryptString($challengePayload);

            $emailParts = explode('@', $user->email);
            $emailMasked = substr($emailParts[0], 0, 2) . '***@' . ($emailParts[1] ?? '');

            return response()->json([
                'requires_2fa'    => true,
                'challenge_token' => $challengeToken,
                'email_masked'    => $emailMasked,
                'phone_masked'    => $user->phone ? (substr($user->phone, 0, 4) . '****' . substr($user->phone, -3)) : null,
                'message'         => 'Two-Factor verification code sent to your registered email and phone.',
            ]);
        }

        // ── Normal Login Flow (2FA disabled) ──────────────────────────
        $user->tokens()->delete();
        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    /**
     * Verify 2FA 6-digit challenge code.
     */
    public function verify2fa(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        try {
            $decrypted = Crypt::decryptString($request->challenge_token);
            $payload   = json_decode($decrypted, true);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid or expired 2FA session. Please log in again.'], 401);
        }

        if (empty($payload['user_id']) || empty($payload['expires_at']) || time() > $payload['expires_at']) {
            return response()->json(['message' => '2FA session expired. Please log in again.'], 401);
        }

        $user = User::with(['role', 'driver'])->findOrFail($payload['user_id']);

        if (!$user->two_factor_code || $user->two_factor_code !== trim($request->code)) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        if (!$user->two_factor_expires_at || $user->two_factor_expires_at->isPast()) {
            return response()->json(['message' => 'Verification code has expired. Please request a new one.'], 422);
        }

        // Successfully verified: clear code and issue token
        $user->update([
            'two_factor_code'       => null,
            'two_factor_expires_at' => null,
        ]);

        $user->tokens()->delete();
        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    /**
     * Resend 2FA verification code.
     */
    public function resend2fa(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
        ]);

        try {
            $decrypted = Crypt::decryptString($request->challenge_token);
            $payload   = json_decode($decrypted, true);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid or expired 2FA session.'], 401);
        }

        $user = User::findOrFail($payload['user_id']);
        $code = sprintf('%06d', mt_rand(100000, 999999));

        $user->update([
            'two_factor_code'       => $code,
            'two_factor_expires_at' => now()->addMinutes(10),
        ]);

        try {
            Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
        } catch (\Throwable $e) {
            Log::error("Failed to resend 2FA email: " . $e->getMessage());
        }

        if (!empty($user->phone)) {
            try {
                $this->smsService->send(
                    phone: $user->phone,
                    message: "Your LinkBus security verification code is: {$code}. Valid for 10 minutes.",
                    userId: $user->id,
                    metadata: ['title' => '2FA Security Code Resend']
                );
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'A new 6-digit security code has been sent to your email and phone.',
        ]);
    }

    /**
     * Toggle Two-Factor Authentication on/off from user profile settings.
     */
    public function toggle2fa(Request $request): JsonResponse
    {
        $request->validate([
            'enable' => 'required|boolean',
        ]);

        $user = $request->user();
        $enable = $request->boolean('enable');

        if ($enable) {
            $user->update([
                'two_factor_enabled'    => true,
                'two_factor_code'       => null,
                'two_factor_expires_at' => null,
            ]);

            return response()->json([
                'success'            => true,
                'two_factor_enabled' => true,
                'message'            => 'Two-Factor Authentication has been enabled for your account.',
                'user'               => $this->formatUser($user->fresh()->load('role')),
            ]);
        } else {
            $user->update([
                'two_factor_enabled'    => false,
                'two_factor_code'       => null,
                'two_factor_expires_at' => null,
            ]);

            return response()->json([
                'success'            => true,
                'two_factor_enabled' => false,
                'message'            => 'Two-Factor Authentication has been disabled.',
                'user'               => $this->formatUser($user->fresh()->load('role')),
            ]);
        }
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role', 'driver');
        return response()->json(['user' => $this->formatUser($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'phone'            => 'sometimes|nullable|string|max:30',
            'avatar'           => 'sometimes|nullable',
            'license_number'   => 'sometimes|nullable|string|max:50',
            'license_expiry'   => 'sometimes|nullable|date',
            'experience_years' => 'sometimes|nullable|integer|min:0|max:60',
            'driver_notes'     => 'sometimes|nullable|string|max:1000',
        ]);

        if ($user->role?->slug === 'driver' || $user->driver) {
            $driver = $user->driver;
            if (!$driver && !empty($data['license_number'])) {
                $driver = \App\Models\Driver::create([
                    'user_id'          => $user->id,
                    'license_number'   => $data['license_number'],
                    'license_expiry'   => $data['license_expiry'] ?? now()->addYears(3)->toDateString(),
                    'experience_years' => $data['experience_years'] ?? 0,
                    'status'           => 'active',
                    'notes'            => $data['driver_notes'] ?? null,
                ]);
            } elseif ($driver) {
                $updateFields = [];
                if (isset($data['license_number'])) $updateFields['license_number'] = $data['license_number'];
                if (isset($data['license_expiry'])) $updateFields['license_expiry'] = $data['license_expiry'];
                if (isset($data['experience_years'])) $updateFields['experience_years'] = (int) $data['experience_years'];
                if (isset($data['driver_notes'])) $updateFields['notes'] = $data['driver_notes'];
                if (!empty($updateFields)) {
                    $driver->update($updateFields);
                }
            }
        }

        unset($data['license_number'], $data['license_expiry'], $data['experience_years'], $data['driver_notes']);

        $deleteOldAvatar = function () use ($user) {
            if ($user->avatar && str_starts_with($user->avatar, '/storage/avatars/')) {
                $relative = str_replace('/storage/', '', $user->avatar);
                try {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($relative);
                } catch (\Throwable $e) {
                    // Ignore missing files
                }
            }
        };

        // 1. Direct file upload support (multipart/form-data)
        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])) {
                $deleteOldAvatar();
                $fileName = 'avatar_' . $user->id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $file->storeAs('avatars', $fileName, 'public');
                $data['avatar'] = '/storage/avatars/' . $fileName;
            }
        }
        // 2. Base64 Data-URI upload support
        elseif (!empty($data['avatar']) && is_string($data['avatar']) && str_starts_with($data['avatar'], 'data:image')) {
            try {
                $parts = explode(';base64,', $data['avatar'], 2);
                if (count($parts) === 2) {
                    $meta = $parts[0];
                    $base64Raw = str_replace(["\r", "\n", ' '], '', $parts[1]);

                    $extension = 'jpg';
                    if (preg_match('/data:image\/([a-zA-Z0-9\+\-]+)/i', $meta, $extMatch)) {
                        $rawExt = strtolower($extMatch[1]);
                        if (in_array($rawExt, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'])) {
                            $extension = ($rawExt === 'jpeg') ? 'jpg' : $rawExt;
                        }
                    }

                    $imageData = base64_decode($base64Raw, true);
                    if ($imageData !== false && strlen($imageData) > 0) {
                        $deleteOldAvatar();
                        $fileName = 'avatar_' . $user->id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
                        \Illuminate\Support\Facades\Storage::disk('public')->put('avatars/' . $fileName, $imageData);
                        $data['avatar'] = '/storage/avatars/' . $fileName;
                    } else {
                        unset($data['avatar']);
                    }
                } else {
                    unset($data['avatar']);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Avatar save error: " . $e->getMessage());
                unset($data['avatar']);
            }
        }
        // 3. Avatar explicitly cleared / removed
        elseif ($request->has('avatar') && (empty($data['avatar']) || $data['avatar'] === null)) {
            $deleteOldAvatar();
            $data['avatar'] = null;
        }

        // Safety fallback: Never persist raw un-parsed base64 string to DB
        if (isset($data['avatar']) && is_string($data['avatar']) && str_starts_with($data['avatar'], 'data:image')) {
            unset($data['avatar']);
        }

        $user->update($data);

        return response()->json(['user' => $this->formatUser($user->fresh()->load('role'))]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Request Password Reset OTP.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'No account found with this email address.',
        ]);

        $user = User::where('email', $request->email)->firstOrFail();
        $code = sprintf('%06d', mt_rand(100000, 999999));

        $user->update([
            'two_factor_code'       => $code,
            'two_factor_expires_at' => now()->addMinutes(15),
        ]);

        // Attempt Email notification
        try {
            Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
        } catch (\Throwable $e) {
            Log::info("Password reset OTP email delivery: {$code} for {$user->email}");
        }

        // Attempt SMS notification
        if (!empty($user->phone)) {
            try {
                $this->smsService->send(
                    phone: $user->phone,
                    message: "Your LinkBus password reset passcode is: {$code}. Valid for 15 minutes.",
                    userId: $user->id,
                    metadata: ['title' => 'Password Reset Code']
                );
            } catch (\Throwable $e) {}
        }

        $challengeToken = Crypt::encryptString(json_encode([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'expires_at' => now()->addMinutes(15)->timestamp,
            'type'       => 'password_reset',
        ]));

        return response()->json([
            'success'         => true,
            'message'         => 'A 6-digit password reset passcode has been sent to your registered contact.',
            'challenge_token' => $challengeToken,
            'email_masked'    => $this->maskEmail($user->email),
            'phone_masked'    => !empty($user->phone) ? $this->maskPhone($user->phone) : null,
        ]);
    }

    /**
     * Verify Reset OTP and set new password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'                 => 'required|email|exists:users,email',
            'code'                  => 'required|string|size:6',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = User::with(['role', 'driver'])->where('email', $request->email)->firstOrFail();

        if (!$user->two_factor_code || $user->two_factor_code !== trim($request->code)) {
            return response()->json(['message' => 'Invalid or incorrect verification passcode.'], 422);
        }

        if (!$user->two_factor_expires_at || $user->two_factor_expires_at->isPast()) {
            return response()->json(['message' => 'Passcode has expired. Please request a new one.'], 422);
        }

        $user->update([
            'password'              => Hash::make($request->password),
            'two_factor_code'       => null,
            'two_factor_expires_at' => null,
        ]);

        $user->tokens()->delete();
        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You are now logged in.',
            'user'    => $this->formatUser($user),
            'token'   => $token,
        ]);
    }

    /**
     * Social / Google SSO Fast Login.
     */
    public function socialLogin(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'name'     => 'required|string',
            'provider' => 'nullable|string',
        ]);

        $user = User::with(['role', 'driver'])->where('email', $request->email)->first();

        if (!$user) {
            $passengerRole = Role::where('slug', 'passenger')->first();
            $user = User::create([
                'name'      => $request->name,
                'email'     => $request->email,
                'phone'     => $request->phone ?? null,
                'role_id'   => $passengerRole ? $passengerRole->id : 3,
                'password'  => Hash::make(bin2hex(random_bytes(16))),
                'is_active' => true,
            ]);
            $user->load(['role', 'driver']);
        }

        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        $name = $parts[0];
        $domain = $parts[1] ?? '';
        $maskedName = strlen($name) > 2 ? substr($name, 0, 2) . '***' : $name . '***';
        return $maskedName . '@' . $domain;
    }

    private function maskPhone(?string $phone): ?string
    {
        if (empty($phone)) return null;
        $len = strlen($phone);
        if ($len <= 6) return substr($phone, 0, 2) . '***';
        return substr($phone, 0, 4) . '****' . substr($phone, -3);
    }

    private function formatUser(User $user): array
    {
        $user->loadMissing(['role', 'driver']);
        return [
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'phone'              => $user->phone,
            'avatar'             => $user->avatar,
            'is_active'          => (bool) ($user->is_active ?? true),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'role'               => $user->role?->slug ?? 'passenger',
            'role_name'          => $user->role?->name ?? 'Passenger',
            'driver_id'          => $user->driver?->id,
            'driver'             => $user->driver ? [
                'id'               => $user->driver->id,
                'user_id'          => $user->id,
                'license_number'   => $user->driver->license_number,
                'license_expiry'   => $user->driver->license_expiry?->toDateString(),
                'status'           => $user->driver->status,
                'experience_years' => $user->driver->experience_years,
                'notes'            => $user->driver->notes,
            ] : null,
        ];
    }
}
