// AuthGate wraps <Slot /> in the root layout, so the gate itself
// decides where to send the user. This file is just a placeholder for
// the root route — its render is never actually seen by the user
// because the gate either shows a spinner, redirects, or renders
// <Slot /> (which then resolves to whichever child route is current).
export default function Index() {
  return null;
}
