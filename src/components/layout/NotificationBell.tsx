import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangleIcon,
  BellIcon,
  BusIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  SparklesIcon,
  TicketIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function getNotificationBadge(title: string = '', type: string = '') {
  const text = `${title} ${type}`.toLowerCase();
  if (text.includes('confirm') || text.includes('ticket') || text.includes('booking')) {
    return {
      icon: <TicketIcon className="h-4 w-4" />,
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (text.includes('board') || text.includes('trip') || text.includes('depart') || text.includes('bus')) {
    return {
      icon: <BusIcon className="h-4 w-4" />,
      bg: 'bg-brand-500/10 border-brand-500/20 text-brand-600 dark:text-brand-400',
      dot: 'bg-brand-500',
    };
  }
  if (text.includes('pay') || text.includes('momo') || text.includes('airtel') || text.includes('cash') || text.includes('refund')) {
    return {
      icon: <CreditCardIcon className="h-4 w-4" />,
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    };
  }
  if (text.includes('cancel') || text.includes('delay') || text.includes('alert') || text.includes('warn')) {
    return {
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    };
  }
  return {
    icon: <SparklesIcon className="h-4 w-4" />,
    bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
  };
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteItem,
    clearAll,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const displayedNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150 ease-smooth ${
          open
            ? 'border-brand-500/50 bg-brand-500/10 text-brand-600 shadow-sm'
            : 'border-line text-muted hover:bg-surface-2 hover:text-fg'
        }`}
      >
        <BellIcon className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.625rem] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] sm:hidden"
              aria-hidden="true"
            />

            {/* Popout Menu Container */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-line/90 bg-surface/95 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-auto sm:right-0 sm:mt-2.5 sm:w-[23.5rem]"
            >
              {/* Popout Caret Pointer (Desktop Only) */}
              <div className="hidden sm:block absolute -top-1.5 right-3.5 h-3 w-3 rotate-45 border-l border-t border-line/90 bg-surface z-20" />

              {/* ── Menu Header ── */}
              <header className="relative z-10 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black tracking-tight text-fg">Notifications</h2>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
                        Caught up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-400"
                        title="Mark all as read"
                      >
                        <CheckCheckIcon className="h-3.5 w-3.5" />
                        <span>Mark read</span>
                      </button>
                    )}

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                        title="Clear all notifications"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills Bar */}
                {notifications.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-line/60 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold transition-all ${
                        filter === 'all'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-surface-2 text-muted hover:text-fg'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('unread')}
                      className={`rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold transition-all ${
                        filter === 'unread'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-surface-2 text-muted hover:text-fg'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>
                )}
              </header>

              {/* ── Scrollable Notifications Feed ── */}
              <div className="thin-scroll max-h-[60vh] sm:max-h-88 overflow-y-auto divide-y divide-line/60 bg-surface">
                {displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted shadow-inner">
                      <BellIcon className="h-6 w-6 opacity-40" />
                    </div>
                    <p className="text-sm font-bold text-fg">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="mt-1 text-xs text-muted max-w-[220px] mx-auto">
                      {filter === 'unread'
                        ? 'You have reviewed all your journey updates.'
                        : 'Real-time alerts regarding departures, bookings, and receipts will appear here.'}
                    </p>
                  </div>
                ) : (
                  <ul>
                    {displayedNotifications.map((notification) => {
                      const badge = getNotificationBadge(notification.title, notification.type);
                      const isUnread = !notification.read_at;

                      return (
                        <li
                          key={notification.id}
                          className={`group relative flex items-start justify-between gap-3 p-3.5 transition-colors duration-150 hover:bg-surface-2/80 ${
                            isUnread
                              ? 'bg-brand-500/[0.04] dark:bg-brand-500/[0.07] border-l-[3px] border-l-brand-600'
                              : 'border-l-[3px] border-l-transparent opacity-85 hover:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="flex flex-1 items-start gap-3 text-left min-w-0"
                          >
                            {/* Contextual Icon Badge */}
                            <div
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-xs ${badge.bg}`}
                            >
                              {badge.icon}
                            </div>

                            {/* Message Body */}
                            <div className="min-w-0 flex-1 pr-6">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-xs leading-snug ${isUnread ? 'font-black text-fg' : 'font-semibold text-fg/80'}`}>
                                  {notification.title}
                                </p>
                                {isUnread && (
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dot}`} />
                                )}
                              </div>

                              <p className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">
                                {notification.message}
                              </p>

                              <span className="mt-1.5 block text-[0.625rem] font-medium text-faint">
                                {relative(notification.created_at)}
                              </span>
                            </div>
                          </button>

                          {/* Individual Dismiss Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(notification.id);
                            }}
                            aria-label="Dismiss notification"
                            title="Dismiss notification"
                            className="absolute right-2.5 top-3 flex h-6 w-6 items-center justify-center rounded-lg text-muted opacity-40 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 dark:hover:text-rose-400 group-hover:opacity-80"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* ── Menu Footer ── */}
              <footer className="flex items-center justify-between border-t border-line/80 bg-surface-2/70 px-4 py-2.5">
                <span className="text-[0.6875rem] font-medium text-muted">
                  LinkBus Live Alerts
                </span>
                <Link
                  to="/my-tickets"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
                >
                  <span>My Tickets</span>
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}