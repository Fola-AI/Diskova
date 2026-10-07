/**
 * Lazy browser Sentry (L14 performance). The SDK (~350 KB raw, mostly tracing) used to ship in the
 * shared first-load chunk of every page. Now it loads after the `load` event when the browser is
 * idle. Errors that happen before then are buffered and sent once it's ready, so nothing is lost
 * unless the visitor leaves within those first seconds. Same options as before (sentry.shared).
 */
type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | null = null;
let loading: Promise<SentryModule | null> | null = null;
const buffered: unknown[] = [];

export function loadSentryClient(): Promise<SentryModule | null> {
  if (sentry) return Promise.resolve(sentry);
  loading ??= Promise.all([import("@sentry/nextjs"), import("../../sentry.shared")])
    .then(([S, { sentrySharedOptions }]) => {
      S.init({ ...sentrySharedOptions });
      sentry = S;
      for (const e of buffered.splice(0)) S.captureException(e);
      return S;
    })
    .catch(() => null);
  return loading;
}

export function captureClientException(error: unknown): void {
  if (sentry) sentry.captureException(error);
  else {
    if (buffered.length < 20) buffered.push(error);
    void loadSentryClient();
  }
}

/** Router transitions are only traced once the SDK is loaded (sampled at 10 % anyway). */
export function onRouterTransitionStart(...args: Parameters<SentryModule["captureRouterTransitionStart"]>): void {
  sentry?.captureRouterTransitionStart(...args);
}

export function scheduleSentryClient(): void {
  if (typeof window === "undefined") return;
  // Errors before the SDK is ready.
  window.addEventListener("error", (e) => {
    if (!sentry) captureClientException(e.error ?? e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (!sentry) captureClientException(e.reason);
  });
  const start = () => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => void loadSentryClient(), { timeout: 5000 });
    else setTimeout(() => void loadSentryClient(), 2500);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
