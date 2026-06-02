import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthGate } from '../components/auth/AuthGate';

// The AuthGate wraps the whole Slot so children (including the tabs
// layout) only mount after we know where to send the user. Without this
// wrapper, the tabs can briefly mount in parallel with index.tsx and
// throw `auth/not-authenticated` from useInbox.
export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <Slot />
      </AuthGate>
    </AuthProvider>
  );
}
