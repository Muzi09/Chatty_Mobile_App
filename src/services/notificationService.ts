// ============================================================================
// notificationService — Expo push tokens, foreground handler, response routing.
// ----------------------------------------------------------------------------
// We use expo-notifications for the *client* side: getting the push token,
// showing foreground banners, and routing taps to the right screen.
//
// For *delivery*, the recommended path is:
//   1. Client gets an Expo push token (ExponentPushToken[xxx]) or a
//      device push token (FCM/APNs) from expo-notifications.
//   2. Client writes the token to /fcmTokens/{uid} (or a sub-field on
//      /users/{uid}.pushToken).
//   3. A Cloud Function (see notifications/functions/) listens for
//      /chats/{id}/messages write events and calls Expo's Push API
//      (https://exp.host/--/api/v2/push/send) for each recipient.
//
// Why not the legacy FCM HTTP v1 directly? Expo abstracts away the
// iOS/Android/Push Service differences, and Expo's Push Service does
// fan-out for us so we don't need to track per-recipient tokens
// ourselves. If you need pure FCM (e.g. you're not using Expo's push
// service), swap the call in sendViaExpoPush for an FCM HTTP v1 call.
// ============================================================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { authService } from './authService';
import { userService } from './userService';

// Configure how foreground notifications are presented. Must be set
// before any notification arrives. Default: banner + list + sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationRouteContext {
  /** Map a chatId or groupId + scope → a deep link. */
  resolve: (input: { scope: 'direct' | 'group'; id: string }) => string;
}

export const notificationService = {
  /**
   * Ask the OS for permission and get a push token. Writes the token to
   * the user's profile so a Cloud Function can target them.
   *
   * Returns the token (Expo push token) on success, or null on failure
   * (e.g. simulator without push entitlement). Safe to call repeatedly;
   * the OS dedupes the permission prompt.
   */
  async registerForPush(): Promise<string | null> {
    // Push only works on real devices.
    if (!Device.isDevice) {
      // eslint-disable-next-line no-console
      console.log('[notificationService] Skipping push registration on simulator');
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // eslint-disable-next-line no-console
      console.log('[notificationService] Permission not granted');
      return null;
    }

    // Android needs a notification channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Project ID is required on Android. Read it from app config.
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;

    let token: string;
    try {
      const t = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      token = t.data;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[notificationService] getExpoPushTokenAsync failed', e);
      return null;
    }

    // Persist the token on the profile.
    try {
      const uid = authService.requireUid();
      await userService.setPushToken(uid, token);
    } catch (e) {
      // Not signed in yet — try again on next launch.
      // eslint-disable-next-line no-console
      console.warn('[notificationService] Could not save token', e);
    }
    return token;
  },

  /**
   * Subscribe to incoming foreground notifications. The handler in
   * setNotificationHandler decides *if* they show; this is a hook for
   * analytics or in-app banners.
   */
  onReceived(cb: (n: Notifications.Notification) => void): () => void {
    const sub = Notifications.addNotificationReceivedListener(cb);
    return () => sub.remove();
  },

  /**
   * Subscribe to taps. The notification data payload is expected to
   * include `{ scope: 'direct'|'group', id: chatId|groupId }`.
   */
  onResponseTapped(
    route: NotificationRouteContext,
    cb?: (response: Notifications.NotificationResponse) => void,
  ): () => void {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      cb?.(response);
      const data = response.notification.request.content.data as
        | { scope?: 'direct' | 'group'; id?: string }
        | undefined;
      if (data?.scope && data?.id) {
        const path = route.resolve({ scope: data.scope, id: data.id });
        // Use a small delay so the navigation is mounted.
        setTimeout(() => router.push(path as never), 50);
      }
    });
    return () => sub.remove();
  },

  /**
   * Token rotation. expo-notifications emits this when the token
   * changes (rare, but happens on app reinstall or OS-level change).
   * Wire it up after registerForPush().
   */
  onTokenRefresh(cb: (token: string) => void): () => void {
    const sub = Notifications.addPushTokenListener(({ data }) => cb(data));
    return () => sub.remove();
  },

  /**
   * Clear the badge count. Call when the user opens the app.
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  },

  /**
   * Mark all notifications as seen. Useful when the inbox is opened.
   */
  async dismissAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  },
};

// Default route resolver. Override via setRouteResolver if your app
// structure needs a different path scheme.
let _resolver: NotificationRouteContext['resolve'] = ({ scope, id }) =>
  scope === 'group' ? `/chat/${id}?scope=group` : `/chat/${id}`;

export function setRouteResolver(fn: NotificationRouteContext['resolve']): void {
  _resolver = fn;
}

export function getRouteResolver(): NotificationRouteContext['resolve'] {
  return _resolver;
}
