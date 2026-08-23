import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  MapPinIcon,
  MessageSquareIcon,
  PlaneTakeoffIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  SearchIcon,
  SparklesIcon,
  TicketIcon,
  WalletIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdvertisementBanner } from '../../components/AdvertisementBanner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { ReceiptModal } from '../../components/modals/ReceiptModal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, SkeletonCards } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { cancelBooking, listBookings } from '../../services/bookings';
import type { BookingDetail } from '../../types/api';
import { cancellationFee } from '../../utils/fare';
import { formatDate, formatDateTime, formatTime, money } from '../../utils/format';

export function PassengerDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [receipt, setReceipt] = useState<BookingDetail | null>(null);
  const [cancelling, setCancelling] = useState<BookingDetail | null>(null);
  const [cancelPending, setCancelPending] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () =>
      listBookings({
        userId: user?.id,
        perPage: 6,
      }),
    [user?.id]
  );

  const bookings = data?.data ?? [];
  const upcoming = bookings.filter(
    (booking) =>
      booking.status !== 'cancelled' &&
      new Date(booking.trip.departure_time).getTime() > Date.now()
  );
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const spend = bookings
    .filter((booking) => booking.status !== 'cancelled')
    .reduce((sum, booking) => sum + booking.total_amount, 0);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setCancelPending(true);
    try {
      const result = await cancelBooking(cancelling.id);
      toast.success(`Booking cancelled · ${money(result.refund)} refunded`);
      setCancelling(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelPending(false);
    }
  };

  const shareUpcomingToWhatsapp = (b: BookingDetail) => {
    const text =
      `🚌 *MY UPCOMING LINKBUS JOURNEY*\n\n` +
      `👤 *Passenger:* ${b.passenger?.name || user?.name}\n` +
      `🎫 *Booking Ref:* \`${b.booking_number}\`\n` +
      `📍 *Corridor:* ${b.trip.origin.city} ➔ ${b.trip.destination.city}\n` +
      `🕒 *Departure:* ${formatDate(b.trip.departure_time)} at ${formatTime(b.trip.departure_time)}\n` +
      `💺 *Seats:* ${b.seats?.map((s) => s.seat_number).join(', ') || 'Reserved'}\n` +
      `🚍 *Bus Plate:* ${b.trip.bus.plate_number}\n\n` +
      `🔗 *View Ticket Online:* ${window.location.origin}/my-tickets\n\n` +
      `_Safe travels with Link Bus Uganda!_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success('Sharing trip details via WhatsApp...');
  };

  const columns: Column<BookingDetail>[] = [
    {
      key: 'booking',
      header: 'Booking #',
      render: (booking) => (
        <div>
          <p className="font-bold text-fg">{booking.booking_number}</p>
          <p className="text-xs text-muted">
            {booking.tickets.length} {booking.tickets.length === 1 ? 'seat' : 'seats'}
            {booking.linked_booking_id ? ' · Round Trip' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor & Departure',
      render: (booking) => (
        <div>
          <p className="font-bold text-fg text-xs">
            {booking.trip.origin.city} ➔ {booking.trip.destination.city}
          </p>
          <p className="text-[0.6875rem] text-muted">{formatDateTime(booking.trip.departure_time)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'sm',
      render: (booking) => <StatusPill status={booking.status} />,
    },
    {
      key: 'total',
      header: 'Total Paid',
      align: 'right',
      render: (booking) => (
        <span className="font-bold tabular-nums text-fg">{money(booking.total_amount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (booking) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setReceipt(booking)}
            aria-label={`View receipt for ${booking.booking_number}`}
            title="View Receipt"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ReceiptTextIcon className="h-4 w-4" aria-hidden />
          </button>
          {booking.status !== 'cancelled' &&
            new Date(booking.trip.departure_time).getTime() > Date.now() && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 text-xs"
                onClick={() => setCancelling(booking)}
              >
                Cancel
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Passenger Welcome & Loyalty Bar ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Welcome back, {user?.name?.split(' ')[0] || 'Passenger'}!
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 border border-brand-500/30 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
              <SparklesIcon className="h-3 w-3" />
              Verified Passenger
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Manage your digital tickets, track departures in real-time, and view verified payment receipts.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 self-start md:self-auto"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          Book New Journey
        </Link>
      </div>

      {/* ── Key Metrics Cards ── */}
      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Upcoming Trips"
            value={upcoming.length}
            trendLabel="active departures"
            icon={<PlaneTakeoffIcon className="h-5 w-5" aria-hidden />}
            emphasis
          />
          <StatCard
            label="Lifetime Bookings"
            value={data?.meta.total ?? 0}
            trendLabel="tickets reserved"
            icon={<CalendarClockIcon className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label="Total Travel Spend"
            value={spend}
            format={money}
            trendLabel="with Link Bus"
            icon={<WalletIcon className="h-5 w-5" aria-hidden />}
          />
        </div>
      )}

      {/* ── Main Passenger Dashboard Grid ── */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Left Column: Recent Bookings Table */}
        <Panel
          title="Recent Journeys & Bookings"
          subtitle="Your latest 6 ticket reservations and payment history"
          bodyClassName=""
          action={
            <Link
              to="/my-tickets"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              All Boarding Passes <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <DataTable<BookingDetail>
            columns={columns}
            rows={bookings}
            rowKey={(booking) => booking.id}
            loading={loading}
            error={error}
            onRetry={reload}
            caption="Recent bookings"
            empty={
              <EmptyState
                icon={<TicketIcon className="h-5 w-5" aria-hidden />}
                title="No bookings yet"
                body="Search for an intercity departure and pick your favorite seat — it takes less than 60 seconds."
                action={
                  <Link
                    to="/search"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700"
                  >
                    <SearchIcon className="h-4 w-4" />
                    Find a Trip
                  </Link>
                }
              />
            }
          />
        </Panel>

        {/* Right Column: Next Departure Flight Card & Promotions */}
        <div className="space-y-6">
          {/* Next Departure Featured Card */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                Next Scheduled Departure
              </span>
              <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[0.625rem] px-2 py-0.5">
                On Schedule
              </span>
            </div>

            {loading ? (
              <div className="skeleton h-28 rounded-xl mt-4" />
            ) : upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <CompassIcon className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-fg">No upcoming departures</p>
                <p className="text-xs text-muted mt-0.5">Your next reserved journey will appear here.</p>
                <Link
                  to="/search"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                >
                  <SearchIcon className="h-3.5 w-3.5" />
                  Explore Routes
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-fg">
                      {upcoming[0].trip.origin.city}
                    </span>
                    <span className="text-brand-600 dark:text-brand-400 font-bold">➔</span>
                    <span className="text-xl font-extrabold text-fg">
                      {upcoming[0].trip.destination.city}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5 text-brand-600" />
                    {formatDateTime(upcoming[0].trip.departure_time)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-3 text-xs">
                  <div>
                    <span className="text-muted block text-[0.6875rem]">Seats Reserved</span>
                    <span className="font-bold text-fg">
                      {upcoming[0].seats?.map((s) => s.seat_number).join(', ') || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[0.6875rem]">Assigned Coach</span>
                    <span className="font-mono font-bold text-fg">
                      {upcoming[0].trip.bus.plate_number}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    to="/my-tickets"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
                  >
                    <QrCodeIcon className="h-3.5 w-3.5" />
                    View QR Pass
                  </Link>
                  <button
                    type="button"
                    onClick={() => shareUpcomingToWhatsapp(upcoming[0])}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-bold text-emerald-600 hover:bg-surface-2 transition-colors"
                    title="Share details via WhatsApp"
                  >
                    <MessageSquareIcon className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          <AdvertisementBanner />
        </div>
      </div>

      <ReceiptModal
        booking={receipt}
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        companyName={settings.company_name}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this booking?"
        consequence={
          cancelling
            ? `A cancellation fee of ${money(
                cancellationFee(cancelling.total_amount, settings.cancellation_fee_percentage)
              )} (${settings.cancellation_fee_percentage}% of ${money(
                cancelling.total_amount
              )}) will be deducted, and ${money(
                cancelling.total_amount -
                  cancellationFee(cancelling.total_amount, settings.cancellation_fee_percentage)
              )} will be refunded to your ${cancelling.payment_method.replace(/_/g, ' ')}.${
                cancelling.linked_booking_id
                  ? ' The linked return leg will be cancelled simultaneously.'
                  : ''
              }`
            : ''
        }
        confirmLabel="Confirm Cancellation"
        pending={cancelPending}
        onConfirm={confirmCancel}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}