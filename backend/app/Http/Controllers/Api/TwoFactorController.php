<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TwoFactorCodeMail;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TwoFactorController extends Controller
{
    public function __construct(
        protected SmsService $smsService
    ) {}

    /**
     * Toggle 2FA on or off for the authenticated user.
     */
    public function toggle(Request $request): JsonResponse
    {
        $request->validate(['enable' => 'required|boolean']);

        $user = $request->user();
        $enable = $request->boolean('enable');

        if ($enable) {
            $code = sprintf('%06d', mt_rand(100000, 999999));
            $user->update([
                'two_factor_enabled'    => true,
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(10),
            ]);

            try {
                Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
            } catch (\Throwable $e) {
                Log::error("Failed to send 2FA enable confirmation email: " . $e->getMessage());
            }

            return response()->json([
                'success'            => true,
                'two_factor_enabled' => true,
                'message'            => 'Two-Factor Authentication enabled. A verification code was sent to your email.',
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
                'message'            => 'Two-Factor Authentication disabled.',
            ]);
        }
    }

    /**
     * Verify the 6-digit challenge code.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        try {
            $decrypted = Crypt::decryptString($request->challenge_token);
            $payload   = json_decode($decrypted, true);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid or expired 2FA session.'], 401);
        }

        if (empty($payload['user_id']) || empty($payload['expires_at']) || time() > $payload['expires_at']) {
            return response()->json(['message' => '2FA session expired. Please log in again.'], 401);
        }

        $user = User::with('role')->findOrFail($payload['user_id']);

        if (!$user->two_factor_code || $user->two_factor_code !== trim($request->code)) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        if (!$user->two_factor_expires_at || $user->two_factor_expires_at->isPast()) {
            return response()->json(['message' => 'Verification code expired.'], 422);
        }

        $user->update([
            'two_factor_code'       => null,
            'two_factor_expires_at' => null,
        ]);

        $user->tokens()->delete();
        $token = $user->createToken('linkbus-token')->plainTextToken;

        return response()->json([
            'user'  => [
                'id'                 => $user->id,
                'name'               => $user->name,
                'email'              => $user->email,
                'phone'              => $user->phone,
                'avatar'             => $user->avatar,
                'two_factor_enabled' => (bool) $user->two_factor_enabled,
                'role'               => $user->role?->slug ?? 'passenger',
            ],
            'token' => $token,
        ]);
    }

    /**
     * Resend the 6-digit challenge code.
     */
    public function resend(Request $request): JsonResponse
    {
        $request->validate(['challenge_token' => 'required|string']);

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
        } catch (\Throwable $e) {}

        if (!empty($user->phone)) {
            try {
                $this->smsService->send(
                    phone: $user->phone,
                    message: "Your LinkBus security verification code is: {$code}. Valid for 10 minutes.",
                    userId: $user->id,
                    metadata: ['title' => '2FA Resend']
                );
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'A new 6-digit security code has been sent to your email and phone.',
        ]);
    }
}
