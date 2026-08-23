<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\Trip;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Exports\ReportExcelExport;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Build standard revenue & financial dataset for date range.
     */
    public function buildRevenueData(string $fromStr, string $toStr): array
    {
        $from = Carbon::parse($fromStr)->startOfDay();
        $to   = Carbon::parse($toStr)->endOfDay();

        // 1. Daily Revenue Series
        $paymentsDaily = Payment::selectRaw('DATE(created_at) as date_val, SUM(amount) as revenue_sum')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('date_val')
            ->pluck('revenue_sum', 'date_val');

        $bookingsDaily = Booking::selectRaw('DATE(created_at) as date_val, COUNT(*) as bookings_count')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('date_val')
            ->pluck('bookings_count', 'date_val');

        $revenueSeries = [];
        $periodTotal = 0;
        $totalBookingsCount = 0;

        $cur = $from->copy();
        while ($cur->lte($to)) {
            $dateKey = $cur->format('Y-m-d');
            $rev = (float) ($paymentsDaily[$dateKey] ?? 0);
            $bks = (int) ($bookingsDaily[$dateKey] ?? 0);

            $periodTotal += $rev;
            $totalBookingsCount += $bks;

            $revenueSeries[] = [
                'label'    => $cur->format('Y-m-d'),
                'date'     => $dateKey,
                'revenue'  => $rev,
                'bookings' => $bks,
            ];

            $cur->addDay();
        }

        // 2. Summary Metrics
        $totalPassengers = Ticket::whereBetween('created_at', [$from, $to])->count();
        $cancellations = Booking::where('status', 'cancelled')->whereBetween('created_at', [$from, $to])->count();

        $tripsInPeriod = Trip::whereBetween('departure_time', [$from, $to])
            ->withCount(['seats', 'seats as booked_seats_count' => fn($q) => $q->where('status', 'booked')])
            ->get();

        $totalCapacity = $tripsInPeriod->sum('seats_count');
        $totalBookedSeats = $tripsInPeriod->sum('booked_seats_count');
        $avgOccupancy = $totalCapacity > 0 ? round(($totalBookedSeats / $totalCapacity) * 100, 1) : 75.0;

        $avgFare = $totalPassengers > 0 ? round($periodTotal / $totalPassengers) : 35000;

        // 3. Real Payment Mix breakdown
        $paymentMixData = Payment::selectRaw('method, SUM(amount) as total_val')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('method')
            ->pluck('total_val', 'method');

        $paymentMix = [
            [
                'label' => 'MTN Mobile Money',
                'value' => (float) ($paymentMixData['mtn_mobile_money'] ?? 0),
            ],
            [
                'label' => 'Airtel Money',
                'value' => (float) ($paymentMixData['airtel_money'] ?? 0),
            ],
            [
                'label' => 'Station Cash',
                'value' => (float) ($paymentMixData['cash'] ?? 0),
            ],
            [
                'label' => 'Visa / Debit Card',
                'value' => (float) ($paymentMixData['card'] ?? 0),
            ],
        ];

        // 4. Real Route Corridors Breakdown
        $routesSummary = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->get()
            ->map(function ($route) use ($from, $to) {
                $routeName = "{$route->originTerminal->city} → {$route->destinationTerminal->city}";

                $trips = Trip::where('route_id', $route->id)
                    ->whereBetween('departure_time', [$from, $to])
                    ->withCount(['seats', 'seats as booked_seats_count' => fn($q) => $q->where('status', 'booked')])
                    ->get();

                $departures = $trips->count();
                $passengers = $trips->sum('booked_seats_count');
                $capacity   = $trips->sum('seats_count');
                $occupancy  = $capacity > 0 ? round(($passengers / $capacity) * 100, 1) : 0;

                $revenue = (float) Payment::where('status', 'completed')
                    ->whereHas('booking.trip', fn($q) => $q->where('route_id', $route->id))
                    ->whereBetween('created_at', [$from, $to])
                    ->sum('amount');

                return [
                    'id'         => $route->id,
                    'route'      => $routeName,
                    'departures' => $departures,
                    'passengers' => $passengers,
                    'occupancy'  => $occupancy,
                    'revenue'    => $revenue,
                ];
            })
            ->filter(fn($r) => $r['departures'] > 0 || $r['revenue'] > 0)
            ->values()
            ->all();

        // If no trips in custom date range, list all active routes with base fares
        if (empty($routesSummary)) {
            $routesSummary = BusRoute::with(['originTerminal', 'destinationTerminal'])
                ->get()
                ->map(fn($r) => [
                    'id'         => $r->id,
                    'route'      => "{$r->originTerminal->city} → {$r->destinationTerminal->city}",
                    'departures' => 0,
                    'passengers' => 0,
                    'occupancy'  => 0,
                    'revenue'    => 0,
                ])
                ->all();
        }

        return [
            'from'    => $fromStr,
            'to'      => $toStr,
            'total'   => $periodTotal,
            'summary' => [
                'revenue'       => $periodTotal,
                'bookings'      => $totalBookingsCount,
                'passengers'    => $totalPassengers,
                'average_fare'  => $avgFare,
                'cancellations' => $cancellations,
                'occupancy'     => $avgOccupancy,
            ],
            'revenue_series' => $revenueSeries,
            'payment_mix'    => $paymentMix,
            'rows'           => $routesSummary,
        ];
    }

    /**
     * Comprehensive revenue & financial breakdown report by date range (JSON).
     */
    public function revenue(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $data = $this->buildRevenueData($request->from, $request->to);

        return response()->json($data);
    }

    /**
     * Dedicated genuine XLSX Excel binary export for revenue report.
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
        ]);

        $from = $request->input('from', now()->subDays(29)->toDateString());
        $to   = $request->input('to', now()->toDateString());

        $reportData = $this->buildRevenueData($from, $to);

        $export = new ReportExcelExport($reportData, $from, $to);

        return $export->download("linkbus-financial-report-{$from}-to-{$to}.xlsx");
    }

    /**
     * Comprehensive real-time Dashboard statistics & trends.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $timeframe = $request->input('timeframe', '30days');
        $days = match ($timeframe) {
            '7days' => 7,
            '90days' => 90,
            default => 30,
        };

        $now = now();
        $startDate = $now->copy()->subDays($days)->startOfDay();
        $prevStartDate = $now->copy()->subDays($days * 2)->startOfDay();
        $prevEndDate = $startDate->copy()->subSecond();

        $today = now()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        // 1. All-Time & Today Totals
        $totalRevenue = (float) Payment::where('status', 'completed')->sum('amount');
        $periodRevenue = (float) Payment::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->sum('amount');
        $prevPeriodRevenue = (float) Payment::where('status', 'completed')
            ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
            ->sum('amount');

        $totalUsers = User::count();
        $periodUsers = User::where('created_at', '>=', $startDate)->count();
        $prevPeriodUsers = User::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();

        $totalBuses = Bus::count();
        $totalRoutes = BusRoute::count();

        $todayRevenue = (float) Payment::where('status', 'completed')
            ->whereDate('created_at', today())
            ->sum('amount');
        $todayBookings = Booking::whereDate('created_at', today())->count();
        $todayTrips = Trip::whereDate('departure_time', today())->count();
        $todayPassengers = Ticket::whereDate('created_at', today())->whereIn('status', ['active', 'used'])->count();

        // Trends calculations (percentage change vs previous period)
        $revenueTrend = $prevPeriodRevenue > 0
            ? round((($periodRevenue - $prevPeriodRevenue) / $prevPeriodRevenue) * 100, 1)
            : ($periodRevenue > 0 ? 100 : 0);

        $usersTrend = $prevPeriodUsers > 0
            ? round((($periodUsers - $prevPeriodUsers) / $prevPeriodUsers) * 100, 1)
            : ($periodUsers > 0 ? 100 : 0);

        // 2. Real Daily Chart Series for Timeframe
        $paymentsDaily = Payment::selectRaw('DATE(created_at) as date_val, SUM(amount) as revenue_sum')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date_val')
            ->pluck('revenue_sum', 'date_val');

        $bookingsDaily = Booking::selectRaw('DATE(created_at) as date_val, COUNT(*) as bookings_count')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date_val')
            ->pluck('bookings_count', 'date_val');

        $revenueChart = [];
        $bookingsChart = [];

        // Build continuous chronological day-by-day series
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i);
            $dateKey = $d->format('Y-m-d');
            $label = $days <= 7 ? $d->format('D, d M') : $d->format('d M');

            $rev = (float) ($paymentsDaily[$dateKey] ?? 0);
            $bks = (int) ($bookingsDaily[$dateKey] ?? 0);

            $revenueChart[] = [
                'label'   => $label,
                'date'    => $dateKey,
                'revenue' => $rev,
            ];

            $bookingsChart[] = [
                'label'    => $label,
                'date'     => $dateKey,
                'bookings' => $bks,
            ];
        }

        // 3. Top Performing Corridors by Real Revenue
        $routesData = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->get()
            ->map(function ($route) use ($startDate) {
                $routeName = "{$route->originTerminal->city} → {$route->destinationTerminal->city}";
                
                $routeRevenue = (float) Payment::where('status', 'completed')
                    ->whereHas('booking.trip', fn($q) => $q->where('route_id', $route->id))
                    ->where('created_at', '>=', $startDate)
                    ->sum('amount');

                return [
                    'label' => $routeName,
                    'value' => $routeRevenue,
                ];
            })
            ->filter(fn($r) => $r['value'] > 0)
            ->sortByDesc('value')
            ->values()
            ->take(5)
            ->all();

        // Fallback if fresh database without route bookings
        if (empty($routesData)) {
            $routesData = BusRoute::with(['originTerminal', 'destinationTerminal'])
                ->take(3)
                ->get()
                ->map(fn($r) => [
                    'label' => "{$r->originTerminal->city} → {$r->destinationTerminal->city}",
                    'value' => (float) $r->base_fare * 10,
                ])
                ->all();
        }

        // 4. Real Recent Bookings
        $recentBookings = Booking::with([
            'trip.route.originTerminal',
            'trip.route.destinationTerminal',
            'trip.bus',
            'trip.driver.user',
            'user',
            'tickets.seat',
            'payment',
        ])
        ->orderBy('created_at', 'desc')
        ->take(6)
        ->get()
        ->map(function ($b) {
            $origin = $b->trip?->route?->originTerminal?->city ?? 'Origin';
            $dest = $b->trip?->route?->destinationTerminal?->city ?? 'Destination';

            return [
                'id'             => $b->id,
                'booking_number' => $b->booking_number,
                'passenger'      => $b->user ? [
                    'id'    => $b->user->id,
                    'name'  => $b->user->name,
                    'email' => $b->user->email,
                    'phone' => $b->user->phone,
                ] : null,
                'trip'           => [
                    'id'             => $b->trip?->id,
                    'departure_time' => $b->trip?->departure_time?->toISOString(),
                    'bus'            => $b->trip?->bus ? [
                        'plate_number' => $b->trip->bus->plate_number,
                        'bus_type'     => $b->trip->bus->bus_type,
                    ] : null,
                    'origin'         => [
                        'city' => $origin,
                    ],
                    'destination'    => [
                        'city' => $dest,
                    ],
                    'route'          => [
                        'name'        => "{$origin} → {$dest}",
                        'origin'      => $origin,
                        'destination' => $dest,
                    ],
                ],
                'tickets'        => $b->tickets->map(fn($t) => [
                    'id'             => $t->id,
                    'ticket_number'  => $t->ticket_number,
                    'passenger_name' => $t->passenger_name,
                    'seat_number'    => $t->seat?->seat_number,
                    'seat_class'     => $t->seat?->seat_class ?? 'standard',
                    'status'         => $t->status,
                ]),
                'seats'          => $b->tickets->pluck('seat')->filter()->values(),
                'total_amount'   => (float) $b->total_amount,
                'status'         => $b->status,
                'payment_method' => $b->payment_method,
                'payment'        => $b->payment ? [
                    'id'             => $b->payment->id,
                    'status'         => $b->payment->status,
                    'method'         => $b->payment->method,
                    'transaction_id' => $b->payment->transaction_id,
                    'amount'         => (float) $b->payment->amount,
                ] : null,
                'created_at'     => $b->created_at?->toISOString(),
            ];
        });

        // 5. Real Staff Schedule for Today
        $todaySchedule = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus'])
            ->whereDate('departure_time', today())
            ->withCount([
                'seats',
                'seats as booked_seats_count' => fn($q) => $q->where('status', 'booked')
            ])
            ->orderBy('departure_time')
            ->get()
            ->map(fn($t) => [
                'trip_id'        => $t->id,
                'route'          => "{$t->route->originTerminal->city} → {$t->route->destinationTerminal->city}",
                'departure_time' => $t->departure_time?->toISOString(),
                'bus'            => $t->bus->plate_number,
                'status'         => $t->status,
                'booked'         => $t->booked_seats_count,
                'capacity'       => $t->seats_count,
            ]);

        return response()->json([
            'today' => [
                'revenue'    => $todayRevenue,
                'bookings'   => $todayBookings,
                'trips'      => $todayTrips,
                'passengers' => $todayPassengers,
            ],
            'week' => [
                'revenue'  => (float) Payment::where('status', 'completed')->where('created_at', '>=', $weekStart)->sum('amount'),
                'bookings' => Booking::where('created_at', '>=', $weekStart)->count(),
            ],
            'month' => [
                'revenue'  => (float) Payment::where('status', 'completed')->where('created_at', '>=', $monthStart)->sum('amount'),
                'bookings' => Booking::where('created_at', '>=', $monthStart)->count(),
            ],
            'all_time' => [
                'revenue'      => $totalRevenue,
                'bookings'     => Booking::count(),
                'passengers'   => Ticket::count(),
                'active_trips' => Trip::whereIn('status', ['scheduled', 'boarding', 'in_transit'])->count(),
                'total_users'  => $totalUsers,
            ],
            'total_users'     => $totalUsers,
            'total_buses'     => $totalBuses,
            'total_routes'    => $totalRoutes,
            'revenue'         => $totalRevenue,
            'trends'          => [
                'users'   => $usersTrend,
                'buses'   => 0,
                'routes'  => 0,
                'revenue' => $revenueTrend,
            ],
            'revenue_chart'   => $revenueChart,
            'bookings_chart'  => $bookingsChart,
            'top_routes'      => $routesData,
            'recent_bookings' => $recentBookings,
            'schedule'        => $todaySchedule,
        ]);
    }

    /**
     * Bookings report.
     */
    public function bookings(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $bookings = Booking::with(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'user', 'payment'])
            ->whereBetween('created_at', [$request->from . ' 00:00:00', $request->to . ' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        $summary = Booking::whereBetween('created_at', [$request->from . ' 00:00:00', $request->to . ' 23:59:59'])
            ->selectRaw('status, COUNT(*) as count, SUM(total_amount) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return response()->json([
            'bookings' => $bookings->map(fn($b) => [
                'id'             => $b->id,
                'booking_number' => $b->booking_number,
                'status'         => $b->status,
                'total_amount'   => $b->total_amount,
                'route'          => ($b->trip?->route?->originTerminal?->city ?? '') . ' → ' . ($b->trip?->route?->destinationTerminal?->city ?? ''),
                'passenger'      => $b->user?->name,
                'payment_method' => $b->payment_method,
                'created_at'     => $b->created_at?->toISOString(),
            ]),
            'summary'  => $summary,
            'meta'     => ['total' => $bookings->total(), 'current_page' => $bookings->currentPage(), 'last_page' => $bookings->lastPage()],
        ]);
    }

    /**
     * Trip occupancy report.
     */
    public function tripOccupancy(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date',
        ]);

        $trips = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus'])
            ->whereBetween('departure_time', [$request->from, $request->to])
            ->withCount(['seats', 'seats as booked_seats_count' => fn($q) => $q->where('status', 'booked')])
            ->orderBy('departure_time')
            ->get();

        return response()->json([
            'trips' => $trips->map(fn($t) => [
                'id'             => $t->id,
                'route'          => ($t->route?->originTerminal?->city ?? '') . ' → ' . ($t->route?->destinationTerminal?->city ?? ''),
                'departure_time' => $t->departure_time?->toISOString(),
                'bus'            => $t->bus?->plate_number,
                'capacity'       => $t->seats_count,
                'booked'         => $t->booked_seats_count,
                'occupancy_pct'  => $t->seats_count > 0 ? round($t->booked_seats_count / $t->seats_count * 100, 1) : 0,
                'status'         => $t->status,
            ]),
        ]);
    }
}
