# Chatty — Firebase backend setup

## 1. Install dependencies

```bash
npx expo install firebase @react-native-async-storage/async-storage \
  expo-notifications expo-device expo-constants
```

Already in your project: `expo-router` (for deep-link routing from
notifications).

## 2. Configure Firebase

In `app.config.js` (create one if you don't have it):

```js
export default {
  expo: {
    // ... your existing config
    extra: {
      firebase: {
        apiKey: '...',
        authDomain: '...',
        projectId: '...',
        storageBucket: '...',
        messagingSenderId: '...',
        appId: '...',
      },
      eas: { projectId: 'your-expo-project-id' },
    },
  },
};
```

`src/firebase/config.ts` reads from `Constants.expoConfig.extra.firebase`,
or falls back to `EXPO_PUBLIC_FIREBASE_*` env vars.

## 3. Deploy security rules

Install the Firebase CLI if you don't have it:
```bash
npm i -g firebase-tools
firebase login
```

Init (skip the "what features" — just point to existing):
```bash
firebase init firestore
firebase init storage
```

Copy `src/firebase/rules/firestore.rules` to the deployed location
or use a `firebase.json` ruleFile pointer. Same for storage.

## 4. Add Firestore indexes

In the Firebase Console → Firestore → Indexes, add (or use
`firestore.indexes.json`):

```json
{
  "indexes": [
    { "collectionGroup": "messages", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    { "collectionGroup": "chats", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
      ]
    },
    { "collectionGroup": "users", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "displayNameLower", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## 5. Enable Email/Password auth

Firebase Console → Authentication → Sign-in method → Email/Password.

## 6. Wire the provider

`src/app/_layout.tsx` already wraps `<Slot />` in `<AuthProvider>`.
That handles presence + push registration + notification taps.

## 7. Cloud Function for push fan-out

The notification client side stores an Expo push token on each user.
You need a function to actually deliver pushes. Recommended approach:
listen for new message writes and call Expo's Push API.

```ts
// functions/src/onMessage.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
// Or use the fetch() to https://exp.host/--/api/v2/push/send

export const onMessage = onDocumentCreated(
  { region: 'us-central1', cpu: 1 },
  '/chats/{chatId}/messages/{messageId}',
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;
    const chatId = event.params.chatId;
    const chatSnap = await getFirestore().doc(`/chats/${chatId}`).get();
    const participants = (chatSnap.data()?.participants as string[]) ?? [];
    const recipients = participants.filter((uid) => uid !== msg.senderId);
    const tokens: string[] = [];
    for (const uid of recipients) {
      const userSnap = await getFirestore().doc(`/users/${uid}`).get();
      const token = userSnap.data()?.pushToken;
      if (token) tokens.push(token);
    }
    if (tokens.length === 0) return;

    // Use Expo's Push API:
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          title: msg.senderName ?? 'New message',
          body: msg.text ?? '(media)',
          data: { scope: 'direct', id: chatId, messageId: event.params.messageId },
        })),
      ),
    });
  },
);
```

Same idea for `/groups/{groupId}/messages/{messageId}` — except the
recipients are derived from the group members subcollection, not the
chat participants field.

## 8. Things that need server-side help at scale

Documented in detail in `src/firebase/SCALING.md`.
