<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use App\Models\PromoCode;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    // ── Settings ─────────────────────────────────────────────────────

    public function getSettings(): JsonResponse
    {
        $settings = Setting::all()->groupBy('group');
        return response()->json(['settings' => $settings]);
    }

    public function getPublicSettings(): JsonResponse
    {
        $settings = Setting::whereIn('group', ['company', 'booking', 'luggage', 'branding'])->get()->groupBy('group');
        if ($settings->isEmpty()) {
            $settings = Setting::all()->groupBy('group');
        }
        return response()->json(['settings' => $settings]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key'   => 'required|string',
            'settings.*.value' => 'nullable|string',
        ]);

        foreach ($data['settings'] as $item) {
            Setting::updateOrCreate(
                ['key' => $item['key']],
                ['value' => $item['value'] ?? '']
            );
        }

        return response()->json(['message' => 'Settings updated.']);
    }

    // ── Users ─────────────────────────────────────────────────────────

    public function users(Request $request): JsonResponse
    {
        $query = User::with('role')->where('email', 'not like', 'deleted_%@linkbus.local');

        if ($request->filled('role')) {
            $query->whereHas('role', fn($q) => $q->where('slug', $request->role));
        }
        if ($request->filled('search')) {
            $query->where(fn($q) => $q->where('name', 'like', '%' . $request->search . '%')
                ->orWhere('email', 'like', '%' . $request->search . '%')
                ->orWhere('phone', 'like', '%' . $request->search . '%'));
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

        $users = $query->orderBy('name')->paginate(20);

        return response()->json([
            'users' => $users->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'avatar'     => $u->avatar,
                'role_id'    => $u->role_id,
                'is_active'  => (bool) ($u->is_active ?? true),
                'role'       => $u->role?->slug,
                'role_name'  => $u->role?->name,
                'is_driver'  => (bool) $u->is_driver || $u->role?->slug === 'driver',
                'created_at' => $u->created_at?->toISOString(),
            ]),
            'meta' => ['total' => $users->total(), 'current_page' => $users->currentPage(), 'last_page' => $users->lastPage()],
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:100',
            'email'     => 'required|email|max:150|unique:users,email',
            'phone'     => 'nullable|string|max:30',
            'role_id'   => 'required|exists:roles,id',
            'password'  => 'nullable|string|min:6',
            'is_active' => 'nullable|boolean',
            'is_driver' => 'nullable|boolean',
        ], [
            'email.unique' => 'A user with this email address already exists.',
            'role_id.required' => 'Please select a role for the user.',
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'] ?? null,
            'role_id'   => $data['role_id'],
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
            'password'  => \Illuminate\Support\Facades\Hash::make($data['password'] ?? 'password'),
        ]);

        // If role is driver, ensure driver record exists
        $role = Role::find($data['role_id']);
        if ($role?->slug === 'driver' && !$user->driver) {
            \App\Models\Driver::create([
                'user_id'          => $user->id,
                'license_number'   => 'DL-' . strtoupper(substr(md5($user->id . time()), 0, 8)),
                'license_expiry'   => now()->addYears(3)->format('Y-m-d'),
                'experience_years' => 1,
                'status'           => 'active',
                'notes'            => 'Created via Admin Portal',
            ]);
        }

        $user->load('role', 'driver');

        return response()->json([
            'message' => 'User created successfully.',
            'user'    => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'phone'      => $user->phone,
                'avatar'     => $user->avatar,
                'role_id'    => $user->role_id,
                'is_active'  => (bool) ($user->is_active ?? true),
                'role'       => $user->role?->slug,
                'role_name'  => $user->role?->name,
                'is_driver'  => (bool) $user->driver || $user->role?->slug === 'driver',
                'created_at' => $user->created_at?->toISOString(),
            ],
            'data'    => $user,
        ], 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'email'     => "sometimes|email|max:150|unique:users,email,{$user->id}",
            'phone'     => 'nullable|string|max:30',
            'avatar'    => 'nullable',
            'role_id'   => 'sometimes|exists:roles,id',
            'password'  => 'nullable|string|min:6',
            'is_active' => 'nullable|boolean',
            'is_driver' => 'nullable|boolean',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

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
                \Illuminate\Support\Facades\Log::error("Avatar save error in AdminController: " . $e->getMessage());
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

        // Strict driver profile lifecycle management based on role
        if (!empty($data['role_id'])) {
            $role = Role::find($data['role_id']);
            if ($role?->slug === 'driver') {
                if (!$user->driver) {
                    \App\Models\Driver::create([
                        'user_id'          => $user->id,
                        'license_number'   => 'DL-' . strtoupper(substr(md5($user->id . time()), 0, 8)),
                        'license_expiry'   => now()->addYears(3)->format('Y-m-d'),
                        'experience_years' => 1,
                        'status'           => 'active',
                        'notes'            => 'Auto-created via Driver Role assignment',
                    ]);
                } else {
                    $user->driver->update(['status' => 'active']);
                }
            } else {
                // If role changed away from driver, unlink/deactivate
                if ($user->driver) {
                    if ($user->driver->trips()->count() > 0) {
                        $user->driver->update(['status' => 'inactive']);
                    } else {
                        $user->driver->delete();
                    }
                }
            }
        }

        $user->load('role', 'driver');
        return response()->json(['user' => $user]);
    }

    public function deleteUser(Request $request, User $user): JsonResponse
    {
        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 422);
        }

        try {
            // Revoke active sessions and tokens
            $user->tokens()->delete();

            // Clean up temporary seat locks
            \App\Models\SeatLock::where('user_id', $user->id)->delete();

            // If user has historical financial or ticket records, safely deactivate & remove from active directory
            if ($user->bookings()->exists() || ($user->driver && $user->driver->trips()->exists())) {
                if ($user->driver) {
                    $user->driver->update(['status' => 'inactive']);
                }

                $user->update([
                    'is_active' => false,
                    'email'     => 'deleted_' . $user->id . '_' . time() . '@linkbus.local',
                    'name'      => $user->name . ' (Deactivated)',
                    'password'  => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
                ]);

                return response()->json(['message' => 'User has historical bookings/trips. Account has been safely deactivated.']);
            }

            // If user has a driver record with no assigned trips, remove driver profile first
            if ($user->driver) {
                $user->driver->delete();
            }

            // Hard delete user account
            $user->delete();

            return response()->json(['message' => 'User deleted successfully.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Could not delete user: ' . $e->getMessage()], 422);
        }
    }

    // ── Promo Codes ──────────────────────────────────────────────────

    public function promoCodes(): JsonResponse
    {
        return response()->json(['promo_codes' => PromoCode::orderBy('created_at', 'desc')->get()]);
    }

    public function storePromoCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'               => 'required|string|unique:promo_codes,code',
            'description'        => 'nullable|string',
            'discount_type'      => 'required|in:percentage,fixed',
            'discount_value'     => 'required|integer|min:1',
            'min_booking_amount' => 'nullable|integer|min:0',
            'max_uses'           => 'nullable|integer|min:1',
            'max_uses_per_user'  => 'nullable|integer|min:0',
            'first_booking_only' => 'nullable|boolean',
            'is_active'          => 'nullable|boolean',
            'expires_at'         => 'nullable|date',
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        $data['max_uses_per_user'] = $data['max_uses_per_user'] ?? 1;
        $data['first_booking_only'] = $data['first_booking_only'] ?? false;

        $promo = PromoCode::create($data);
        return response()->json(['promo_code' => $promo], 201);
    }

    public function updatePromoCode(Request $request, PromoCode $promoCode): JsonResponse
    {
        $data = $request->validate([
            'description'        => 'sometimes|nullable|string',
            'discount_type'      => 'sometimes|in:percentage,fixed',
            'discount_value'     => 'sometimes|integer|min:1',
            'min_booking_amount' => 'sometimes|nullable|integer|min:0',
            'is_active'          => 'sometimes|boolean',
            'expires_at'         => 'nullable|date',
            'max_uses'           => 'sometimes|integer|min:1',
            'max_uses_per_user'  => 'sometimes|nullable|integer|min:0',
            'first_booking_only' => 'sometimes|boolean',
        ]);

        $promoCode->update($data);
        return response()->json(['promo_code' => $promoCode]);
    }

    // ── Advertisements ───────────────────────────────────────────────

    public function getPublicAdvertisements(Request $request): JsonResponse
    {
        $now = now();
        $query = Advertisement::where('status', 'active')
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->orderBy('priority', 'asc');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json(['advertisements' => $query->get()]);
    }

    public function advertisements(): JsonResponse
    {
        $ads = Advertisement::orderBy('priority')->get();
        return response()->json(['advertisements' => $ads]);
    }

    public function storeAdvertisement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string',
            'description' => 'nullable|string',
            'image_url'   => 'nullable|string',
            'link_url'    => 'nullable|string',
            'type'        => 'required|in:banner,popup,sidebar',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'priority'    => 'nullable|integer|min:1',
            'status'      => 'in:active,inactive',
        ]);

        $ad = Advertisement::create($data);
        return response()->json(['advertisement' => $ad], 201);
    }

    public function updateAdvertisement(Request $request, Advertisement $advertisement): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'sometimes|required|string',
            'description' => 'nullable|string',
            'image_url'   => 'nullable|string',
            'link_url'    => 'nullable|string',
            'type'        => 'sometimes|required|in:banner,popup,sidebar',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'sometimes|required|date|after_or_equal:start_date',
            'priority'    => 'nullable|integer|min:1',
            'status'      => 'sometimes|in:active,inactive',
        ]);

        $advertisement->update($data);
        return response()->json(['advertisement' => $advertisement]);
    }

    public function destroyAdvertisement(Advertisement $advertisement): JsonResponse
    {
        $advertisement->delete();
        return response()->json(['message' => 'Campaign deleted successfully']);
    }

    // ── Audit Logs ───────────────────────────────────────────────────

    public function auditLogs(Request $request): JsonResponse
    {
        $query = \App\Models\AuditLog::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('model_type', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $logs = $query->paginate(20);

        return response()->json([
            'logs' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    // ── Payments & Financial Settlements ─────────────────────────────

    public function payments(Request $request): JsonResponse
    {
        $category = $request->input('category');
        $status = $request->input('status');
        $method = $request->input('method');
        $search = $request->input('search');
        $date = $request->input('date');
        $from = $request->input('from', $request->input('date_from'));
        $to = $request->input('to', $request->input('date_to'));
        $perPage = (int) $request->input('per_page', 15);

        // ── 1. Excess Luggage Specific Stream ──────────────────────────
        if ($category === 'excess_luggage') {
            $luggageQuery = \App\Models\Luggage::with([
                'booking.trip.route.originTerminal',
                'booking.trip.route.destinationTerminal',
                'booking.user',
            ])->orderBy('created_at', 'desc');

            if ($search) {
                $luggageQuery->where(function ($q) use ($search) {
                    $q->where('tag_number', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('booking', function ($bq) use ($search) {
                          $bq->where('booking_number', 'like', "%{$search}%")
                             ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
                      });
                });
            }

            if ($date) $luggageQuery->whereDate('created_at', $date);
            if ($from) $luggageQuery->whereDate('created_at', '>=', $from);
            if ($to) $luggageQuery->whereDate('created_at', '<=', $to);

            $paginated = $luggageQuery->paginate($perPage);

            $items = collect($paginated->items())->map(function ($lug) {
                $weight = (float) ($lug->weight_kg ?? 25);
                $excessKg = max(0, $weight - 20);
                $excessFee = $excessKg > 0 ? (int) ($excessKg * 2000) : 10000;
                $origin = $lug->booking?->trip?->route?->originTerminal?->city ?? 'Kampala';
                $dest = $lug->booking?->trip?->route?->destinationTerminal?->city ?? 'Regional Terminal';
                $customer = $lug->booking?->user?->name ?? 'Luggage Passenger';

                return [
                    'id'               => 100000 + $lug->id,
                    'booking_id'       => $lug->booking_id,
                    'category'         => 'excess_luggage',
                    'reference_number' => $lug->tag_number ?? "LUG-{$lug->id}",
                    'customer_name'    => $customer,
                    'transaction_id'   => 'LUG-' . strtoupper(substr(md5('luggage_' . $lug->id), 0, 8)),
                    'method'           => 'cash',
                    'amount'           => $excessFee,
                    'status'           => $lug->status === 'lost' ? 'failed' : 'completed',
                    'booking_number'   => $lug->booking?->booking_number ?? "LB-{$lug->booking_id}",
                    'passenger_name'   => $customer,
                    'route'            => "{$origin} → {$dest}",
                    'created_at'       => $lug->created_at?->toISOString() ?? now()->toISOString(),
                    'updated_at'       => $lug->updated_at?->toISOString() ?? now()->toISOString(),
                ];
            });

            if ($status) {
                $items = $items->filter(fn($i) => $i['status'] === $status)->values();
            }
            if ($method) {
                $items = $items->filter(fn($i) => $i['method'] === $method)->values();
            }

            return response()->json([
                'data' => $items,
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ]);
        }

        // ── 2. Parcel Freight Specific Stream ──────────────────────────
        if ($category === 'parcel_freight') {
            $parcelQuery = \App\Models\Parcel::with([
                'originTerminal',
                'destinationTerminal',
            ])->orderBy('created_at', 'desc');

            if ($search) {
                $parcelQuery->where(function ($q) use ($search) {
                    $q->where('tracking_number', 'like', "%{$search}%")
                      ->orWhere('sender_name', 'like', "%{$search}%")
                      ->orWhere('recipient_name', 'like', "%{$search}%")
                      ->orWhere('sender_phone', 'like', "%{$search}%");
                });
            }

            if ($date) $parcelQuery->whereDate('created_at', $date);
            if ($from) $parcelQuery->whereDate('created_at', '>=', $from);
            if ($to) $parcelQuery->whereDate('created_at', '<=', $to);

            $paginated = $parcelQuery->paginate($perPage);

            $items = collect($paginated->items())->map(function ($pcl) {
                $origin = $pcl->originTerminal?->city ?? 'Origin Station';
                $dest = $pcl->destinationTerminal?->city ?? 'Destination Station';
                $fee = (int) ($pcl->price ?: 15000);

                return [
                    'id'               => 200000 + $pcl->id,
                    'booking_id'       => null,
                    'category'         => 'parcel_freight',
                    'reference_number' => $pcl->tracking_number ?? "PCL-{$pcl->id}",
                    'customer_name'    => $pcl->sender_name ?? 'Parcel Sender',
                    'transaction_id'   => 'PCL-' . strtoupper(substr(md5('parcel_' . $pcl->id), 0, 8)),
                    'method'           => 'cash',
                    'amount'           => $fee,
                    'status'           => $pcl->status === 'lost' ? 'failed' : 'completed',
                    'booking_number'   => $pcl->tracking_number ?? "PCL-{$pcl->id}",
                    'passenger_name'   => $pcl->sender_name ?? 'Parcel Sender',
                    'route'            => "{$origin} → {$dest}",
                    'created_at'       => $pcl->created_at?->toISOString() ?? now()->toISOString(),
                    'updated_at'       => $pcl->updated_at?->toISOString() ?? now()->toISOString(),
                ];
            });

            if ($status) {
                $items = $items->filter(fn($i) => $i['status'] === $status)->values();
            }
            if ($method) {
                $items = $items->filter(fn($i) => $i['method'] === $method)->values();
            }

            return response()->json([
                'data' => $items,
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ]);
        }

        // ── 3. Unified Multi-Stream Aggregator (When All Categories or No Category is Selected) ──
        // A. Ticket Payments
        $ticketQuery = \App\Models\Payment::with([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.user',
            'booking.tickets',
        ]);
        if ($date) $ticketQuery->whereDate('created_at', $date);
        if ($from) $ticketQuery->whereDate('created_at', '>=', $from);
        if ($to) $ticketQuery->whereDate('created_at', '<=', $to);

        $ticketItems = $ticketQuery->get()->map(function ($payment) {
            $booking = $payment->booking;
            $firstTicket = $booking?->tickets?->first();
            $passengerName = $firstTicket?->passenger_name ?? $booking?->user?->name ?? 'Customer';
            $origin = $booking?->trip?->route?->originTerminal?->city ?? 'Kampala';
            $dest = $booking?->trip?->route?->destinationTerminal?->city ?? 'Destination';
            $refNumber = $booking?->booking_number ?? "LB-{$payment->booking_id}";

            $rawAmount = (float) $payment->amount;
            if ($rawAmount <= 0 && $booking) {
                $rawAmount = (float) ($booking->total_fare ?: ($booking->trip?->fare ?: 30000));
            }

            return [
                'id'               => $payment->id,
                'booking_id'       => $payment->booking_id,
                'category'         => 'bus_ticket',
                'reference_number' => $refNumber,
                'customer_name'    => $passengerName,
                'transaction_id'   => $payment->transaction_id,
                'method'           => $payment->method,
                'amount'           => $rawAmount,
                'status'           => $payment->status,
                'booking_number'   => $refNumber,
                'passenger_name'   => $passengerName,
                'route'            => "{$origin} → {$dest}",
                'created_at'       => $payment->created_at?->toISOString() ?? now()->toISOString(),
                'updated_at'       => $payment->updated_at?->toISOString() ?? now()->toISOString(),
            ];
        });

        // B. Luggage Payments
        $luggageQuery = \App\Models\Luggage::with([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.user',
        ]);
        if ($date) $luggageQuery->whereDate('created_at', $date);
        if ($from) $luggageQuery->whereDate('created_at', '>=', $from);
        if ($to) $luggageQuery->whereDate('created_at', '<=', $to);

        $luggageItems = $luggageQuery->get()->map(function ($lug) {
            $weight = (float) ($lug->weight_kg ?? 25);
            $excessKg = max(0, $weight - 20);
            $excessFee = $excessKg > 0 ? (int) ($excessKg * 2000) : 10000;
            $origin = $lug->booking?->trip?->route?->originTerminal?->city ?? 'Kampala';
            $dest = $lug->booking?->trip?->route?->destinationTerminal?->city ?? 'Regional Terminal';
            $customer = $lug->booking?->user?->name ?? 'Luggage Passenger';

            return [
                'id'               => 100000 + $lug->id,
                'booking_id'       => $lug->booking_id,
                'category'         => 'excess_luggage',
                'reference_number' => $lug->tag_number ?? "LUG-{$lug->id}",
                'customer_name'    => $customer,
                'transaction_id'   => 'LUG-' . strtoupper(substr(md5('luggage_' . $lug->id), 0, 8)),
                'method'           => 'cash',
                'amount'           => $excessFee,
                'status'           => $lug->status === 'lost' ? 'failed' : 'completed',
                'booking_number'   => $lug->booking?->booking_number ?? "LB-{$lug->booking_id}",
                'passenger_name'   => $customer,
                'route'            => "{$origin} → {$dest}",
                'created_at'       => $lug->created_at?->toISOString() ?? now()->toISOString(),
                'updated_at'       => $lug->updated_at?->toISOString() ?? now()->toISOString(),
            ];
        });

        // C. Parcel Payments
        $parcelQuery = \App\Models\Parcel::with([
            'originTerminal',
            'destinationTerminal',
        ]);
        if ($date) $parcelQuery->whereDate('created_at', $date);
        if ($from) $parcelQuery->whereDate('created_at', '>=', $from);
        if ($to) $parcelQuery->whereDate('created_at', '<=', $to);

        $parcelItems = $parcelQuery->get()->map(function ($pcl) {
            $origin = $pcl->originTerminal?->city ?? 'Origin Station';
            $dest = $pcl->destinationTerminal?->city ?? 'Destination Station';
            $fee = (int) ($pcl->price ?: 15000);

            return [
                'id'               => 200000 + $pcl->id,
                'booking_id'       => null,
                'category'         => 'parcel_freight',
                'reference_number' => $pcl->tracking_number ?? "PCL-{$pcl->id}",
                'customer_name'    => $pcl->sender_name ?? 'Parcel Sender',
                'transaction_id'   => 'PCL-' . strtoupper(substr(md5('parcel_' . $pcl->id), 0, 8)),
                'method'           => 'cash',
                'amount'           => $fee,
                'status'           => $pcl->status === 'lost' ? 'failed' : 'completed',
                'booking_number'   => $pcl->tracking_number ?? "PCL-{$pcl->id}",
                'passenger_name'   => $pcl->sender_name ?? 'Parcel Sender',
                'route'            => "{$origin} → {$dest}",
                'created_at'       => $pcl->created_at?->toISOString() ?? now()->toISOString(),
                'updated_at'       => $pcl->updated_at?->toISOString() ?? now()->toISOString(),
            ];
        });

        // Merge all 3 streams
        $all = $ticketItems->concat($luggageItems)->concat($parcelItems);

        // Apply search filter
        if ($search) {
            $q = strtolower($search);
            $all = $all->filter(function ($item) use ($q) {
                return str_contains(strtolower($item['transaction_id']), $q)
                    || str_contains(strtolower($item['reference_number'] ?? ''), $q)
                    || str_contains(strtolower($item['booking_number'] ?? ''), $q)
                    || str_contains(strtolower($item['customer_name'] ?? ''), $q)
                    || str_contains(strtolower($item['passenger_name'] ?? ''), $q)
                    || str_contains(strtolower($item['route'] ?? ''), $q);
            });
        }

        // Apply status filter
        if ($status) {
            $all = $all->filter(fn($item) => $item['status'] === $status);
        }

        // Apply method filter
        if ($method) {
            $all = $all->filter(fn($item) => $item['method'] === $method);
        }

        // Sort chronologically descending
        $all = $all->sortByDesc('created_at')->values();

        $page = (int) $request->input('page', 1);
        $total = $all->count();
        $slice = $all->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $slice,
            'meta' => [
                'current_page' => $page,
                'last_page'    => max(1, (int) ceil($total / $perPage)),
                'per_page'     => $perPage,
                'total'        => $total,
            ],
        ]);
    }

    public function updatePaymentStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:completed,pending,failed,refunded',
        ]);

        $payment = \App\Models\Payment::findOrFail($id);
        $payment->status = $request->status;
        $payment->save();

        return response()->json([
            'success' => true,
            'message' => "Payment #{$payment->transaction_id} updated to {$payment->status}.",
            'payment' => $payment,
        ]);
    }
}
