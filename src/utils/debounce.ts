// ============================================================================
// Debounce — used for typing indicators so we don't write to Firestore on
// every keystroke. After the user stops typing for `wait` ms, the call
// fires. We also expose a `flush` to fire immediately (e.g. on send).
// ============================================================================

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): ((...args: Args) => void) & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  const debounced = (...args: Args) => {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (pendingArgs) {
        const a = pendingArgs;
        pendingArgs = null;
        fn(...a);
      }
    }, wait);
  };

  debounced.flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pendingArgs) {
      const a = pendingArgs;
      pendingArgs = null;
      fn(...a);
    }
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  return debounced;
}
