import { useState, useEffect, useCallback } from 'react';

export type PushPermission = 'default' | 'granted' | 'denied';

export interface PushState {
  permission: PushPermission;
  subscribed: boolean;
  error: string | null;
}

/**
 * React hook for Web Push notifications in PAY.ID.
 * 
 * @example
 * ```tsx
 * const { subscribe, unsubscribe, state, sendTest } = usePushNotifications()
 * ```
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    permission: 'default',
    subscribed: false,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setState(prev => ({
      ...prev,
      permission: Notification.permission as PushPermission,
    }));
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, error: 'Service Worker not supported' }));
      return;
    }
    if (!('PushManager' in window)) {
      setState(prev => ({ ...prev, error: 'Push API not supported' }));
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState({ permission: 'denied', subscribed: false, error: 'Permission denied' });
        return;
      }

      await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // In production, subscribe to push server and get endpoint
      // const subscription = await registration.pushManager.subscribe({
      //   userVisibleOnly: true,
      //   applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      // })

      setState({ permission: 'granted', subscribed: true, error: null });
    } catch (err: any) {
      setState({ permission: 'default', subscribed: false, error: err.message });
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
    }
    setState({ permission: 'default', subscribed: false, error: null });
  }, []);

  const sendLocalNotification = useCallback((title: string, body: string, url: string = '/') => {
    if (typeof window === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url },
        tag: 'payid-local',
      });
    });
  }, []);

  return {
    subscribe,
    unsubscribe,
    state,
    sendLocalNotification,
  };
}
