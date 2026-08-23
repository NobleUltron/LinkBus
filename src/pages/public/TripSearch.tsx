import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpDownIcon,
  BusIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  FilterIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  ZapIcon,
} from 'lucide-react';
import { TripResultCard } from '../../components/booking/TripResultCard';
import { TripSearchForm } from '../../components/booking/TripSearchForm';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { searchTrips } from '../../services/trips';
import { minutesBetween, money } from '../../utils/format';

type SortOption = 'departure_asc' | 'fare_asc' | 'duration_asc' | 'seats_desc';
type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';
type CabinFilter = 'all' | 'vip' | 'standard';

export function TripSearch() {
  const [params, setParams] = useSearchParams();
  const origin = params.get('origin') ?? '';
  const destination = params.get('destination') ?? '';
  const date = params.get('date') ?? '';
  const passengers = Number(params.get('passengers') ?? '1');

  // Filter & Sort State
  const [sortBy, setSortBy] = useState<SortOption>('departure_asc');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [cabinFilter, setCabinFilter] = useState<CabinFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const query = useMemo(
    () => ({
      origin,
      destination,
      date,
      passengers,
    }),
    [origin, destination, date, passengers]
  );

  const { data, loading, error, reload } = useAsync(
    () => searchTrips(query),
    [origin, destination, date, passengers]
  );

  // ── Swap Origin and Destination ──
  const handleSwapRoute = () => {
    if (!origin && !destination) return;
    const newParams = new URLSearchParams(params);
    newParams.set('origin', destination);
    newParams.set('destination', origin);
    setParams(newParams);
  };

  // ── Date Strip (Next 7 Days) ──
  const dateStrip = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().slice(0, 10);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({
        iso: isoDate,
        dayName,
        monthDay,
      });
    }
    return days;
  }, []);

  const handleSelectDate = (isoDate: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set('date', isoDate);
    setParams(newParams);
  };

  // ── Filter & Sort Logic ──
  const filteredAndSortedTrips = useMemo(() => {
    if (!data) return [];

    let list = [...data];

    // Filter by Time of Day
    if (timeFilter !== 'all') {
      list = list.filter((trip) => {
        const hour = new Date(trip.departure_time).getHours();
        if (timeFilter === 'morning') return hour >= 5 && hour < 12;
        if (timeFilter === 'afternoon') return hour >= 12 && hour < 17;
        if (timeFilter === 'evening') return hour >= 17 || hour < 5;
        return true;
      });
    }

    // Filter by Cabin Type
    if (cabinFilter !== 'all') {
      list = list.filter((trip) => {
        if (cabinFilter === 'vip') return trip.bus.bus_type === 'vip' || trip.bus.bus_type === 'sleeper';
        if (cabinFilter === 'standard') return trip.bus.bus_type === 'standard';
        return true;
      });
    }

    // Sort Trips
    list.sort((a, b) => {
      if (sortBy === 'fare_asc') return a.fare - b.fare;
      if (sortBy === 'seats_desc') return b.available_seats - a.available_seats;
      if (sortBy === 'duration_asc') {
        const durA = minutesBetween(a.departure_time, a.arrival_time);
        const durB = minutesBetween(b.departure_time, b.arrival_time);
        return durA - durB;
      }
      // default: departure_asc
      return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
    });

    return list;
  }, [data, timeFilter, cabinFilter, sortBy]);

  // Route Names for header summary
  const routeSummary = useMemo(() => {
    if (data && data.length > 0) {
      const first = data[0];
      const lowestFare = Math.min(...data.map((t) => t.fare));
      return {
        originCity: first.origin.city,
        destinationCity: first.destination.city,
        distanceKm: first.route.distance_km,
        totalTrips: data.length,
        lowestFare,
      };
    }
    return null;
  }, [data]);

  const activeFiltersCount = (timeFilter !== 'all' ? 1 : 0) + (cabinFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setTimeFilter('all');
    setCabinFilter('all');
    setSortBy('departure_asc');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Find a Trip</h1>
          <p className="mt-1 text-sm text-muted">
            Live scheduled departures across all 8 terminals. Instant QR ticket confirmation.
          </p>
        </div>

        {/* ⇄ Swap Route Action Button */}
        {origin && destination && (
          <button
            type="button"
            onClick={handleSwapRoute}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-fg shadow-sm transition-all duration-150 hover:bg-surface-2 active:scale-95 self-start md:self-auto"
          >
            <ArrowUpDownIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Swap Route Direction
          </button>
        )}
      </div>

      {/* ── Primary Search Form ── */}
      <Panel className="mt-5">
        <TripSearchForm
          initial={{
            origin,
            destination,
            date,
            passengers: String(passengers),
          }}
        />
      </Panel>

      {/* ── 1-Tap 7-Day Date Carousel Strip ── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 bg-surface-2/50 text-xs font-semibold text-muted">
          <CalendarDaysIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <span>Quick Date Navigator</span>
        </div>
        <div className="flex overflow-x-auto p-2 scrollbar-none gap-2">
          {dateStrip.map((item) => {
            const isSelected = date === item.iso || (!date && item.dayName === 'Today');
            return (
              <button
                key={item.iso}
                type="button"
                onClick={() => handleSelectDate(item.iso)}
                className={`flex min-w-[110px] flex-1 flex-col items-center rounded-xl p-2.5 text-center transition-all duration-150 ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-950/20'
                    : 'bg-surface hover:bg-surface-2 text-fg border border-transparent hover:border-line'
                }`}
              >
                <span className={`text-[0.6875rem] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                  {item.dayName}
                </span>
                <span className="text-sm font-bold tracking-tight">{item.monthDay}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Route Overview Ribbon ── */}
      {routeSummary && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 px-5 py-3.5 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 font-bold text-fg">
            <span className="text-base sm:text-lg text-brand-600 dark:text-brand-400 font-extrabold">
              {routeSummary.originCity} ➔ {routeSummary.destinationCity}
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {routeSummary.distanceKm} km
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted">
            <span>🚌 <strong className="text-fg">{routeSummary.totalTrips}</strong> departures scheduled</span>
            <span>💰 Lowest fare from <strong className="text-brand-600 dark:text-brand-400 font-bold">{money(routeSummary.lowestFare)}</strong></span>
          </div>
        </div>
      )}

      {/* ── Smart Filter & Sorting Bar ── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        {/* Left: Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time of Day */}
          <div className="flex items-center rounded-xl border border-line bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                timeFilter === 'all' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              All Times
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('morning')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                timeFilter === 'morning' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              🌅 Morning
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('afternoon')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                timeFilter === 'afternoon' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              ☀️ Afternoon
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('evening')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                timeFilter === 'evening' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              🌙 Evening
            </button>
          </div>

          {/* Cabin Class Filter */}
          <div className="flex items-center rounded-xl border border-line bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setCabinFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                cabinFilter === 'all' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              All Cabins
            </button>
            <button
              type="button"
              onClick={() => setCabinFilter('vip')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                cabinFilter === 'vip' ? 'bg-amber-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              <SparklesIcon className="h-3 w-3" />
              VIP Cabins
            </button>
            <button
              type="button"
              onClick={() => setCabinFilter('standard')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                cabinFilter === 'standard' ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'
              }`}
            >
              Standard
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Right: Sort By Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-muted hidden sm:inline">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-fg focus:border-brand-500 focus:outline-none"
          >
            <option value="departure_asc">⚡ Earliest Departure</option>
            <option value="fare_asc">💰 Lowest Fare (UGX)</option>
            <option value="duration_asc">⏱️ Fastest Travel Time</option>
            <option value="seats_desc">💺 Most Seats Available</option>
          </select>
        </div>
      </div>

      {/* ── Results Container ── */}
      <div className="mt-6">
        {loading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton h-44 rounded-2xl sm:h-36" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Panel>
            <ErrorState message={error} onRetry={reload} />
          </Panel>
        )}

        {!loading && !error && data && (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-muted">
              <p aria-live="polite">
                Showing{' '}
                <strong className="text-fg font-bold">
                  {filteredAndSortedTrips.length}
                </strong>{' '}
                of {data.length} {data.length === 1 ? 'departure' : 'departures'}
              </p>
            </div>

            {filteredAndSortedTrips.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={<SearchXIcon className="h-6 w-6 text-muted" aria-hidden />}
                  title={data.length === 0 ? 'No departures found' : 'No trips match the selected filters'}
                  body={
                    data.length === 0
                      ? 'Try selecting a different date or swapping origin and destination.'
                      : 'Try resetting your time of day or cabin class filter to view all available trips.'
                  }
                  action={
                    activeFiltersCount > 0 ? (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        Reset Active Filters
                      </button>
                    ) : undefined
                  }
                />
              </Panel>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedTrips.map((trip) => (
                  <TripResultCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Passenger Assurance & Seat Hold Notice ── */}
      {!loading && !error && data && data.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <BusIcon className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" aria-hidden />
            <span>Seats are locked for ten minutes once you proceed to passenger details.</span>
          </div>
          <span className="font-semibold text-fg">
            🛡️ 100% Guaranteed Reserved Seating & Instant QR Pass
          </span>
        </div>
      )}
    </div>
  );
}