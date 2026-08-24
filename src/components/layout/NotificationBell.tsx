import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, CheckCheckIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { EmptyState } from '../ui/States';

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition-colors duration-150 ease-smooth hover:bg-surface-2 hover:text-fg"
      >
        <BellIcon className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.625rem] font-bold text-white shadow-xs">
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
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] sm:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="modal-modern fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-[22rem] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            >
              {/* Header */}
              <header className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-fg">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors duration-150 hover:text-brand-700 dark:text-brand-400"
                      title="Mark all as read"
                    >
                      <CheckCheckIcon className="h-3.5 w-3.5" />
                      Mark read
                    </button>
                  )}

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="flex items-center gap-1 text-xs font-medium text-muted transition-colors duration-150 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Clear all notifications"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                      Clear all
                    </button>
                  )}
                </div>
              </header>

              {/* Notification List */}
              <div className="thin-scroll max-h-[60vh] sm:max-h-84 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <BellIcon className="h-5 w-5 opacity-40" />
                    </div>
                    <p className="text-xs font-bold text-fg">All caught up!</p>
                    <p className="text-[0.6875rem] text-muted mt-0.5">
                      Alerts about bookings, trips, and payments will appear here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className="group relative flex items-start justify-between gap-2 px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
                      >
                        <button
                          type="button"
                          onClick={() => markRead(notification.id)}
                          className="flex flex-1 items-start gap-3 text-left min-w-0"
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors ${
                              notification.read_at
                                ? 'bg-transparent ring-1 ring-line'
                                : 'bg-brand-600 shadow-xs'
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 pr-6">
                            <p className={`text-xs font-bold ${notification.read_at ? 'text-fg/80' : 'text-fg'}`}>
                              {notification.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="mt-1 block text-[0.625rem] text-faint">
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
                          className="absolute right-3 top-3.5 flex h-6 w-6 items-center justify-center rounded-md text-muted opacity-60 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 dark:hover:text-rose-400 group-hover:opacity-100"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}