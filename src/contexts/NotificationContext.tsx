import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppNotification } from '../types/models';
import {
  clearAllNotifications,
  deleteNotification as apiDeleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => void;
  markAllRead: () => void;
  deleteItem: (id: number) => void;
  clearAll: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const fetchList = useCallback(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    listNotifications(user.id)
      .then((rows) => setNotifications(rows || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchList();
  }, [fetchList, nonce]);

  const markRead = useCallback((id: number) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n))
    );
    markNotificationRead(id).catch(() => undefined);
  }, []);

  const markAllRead = useCallback(() => {
    if (!user) return;
    setNotifications((current) =>
      current.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    markAllNotificationsRead(user.id).catch(() => undefined);
  }, [user]);

  const deleteItem = useCallback((id: number) => {
    setNotifications((current) => current.filter((n) => n.id !== id));
    apiDeleteNotification(id).catch(() => undefined);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    clearAllNotifications().catch(() => undefined);
  }, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read_at).length,
      loading,
      markRead,
      markAllRead,
      deleteItem,
      clearAll,
      refresh,
    }),
    [notifications, loading, markRead, markAllRead, deleteItem, clearAll, refresh]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}