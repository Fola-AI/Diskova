import * as Sentry from "@sentry/nextjs";

import { sentrySharedOptions } from "./sentry.shared";

// zod v4 probes `new Function("")` to decide on JIT-compiled parsers. Under an enforced CSP (no
// 'unsafe-eval') that probe is reported as a violation on every page that validates. zod reads its
// config from this global, so set jitless before any schema runs (no zod import → no bundle cost).
const zodGlobal = globalThis as typeof globalThis & { __zod_globalConfig?: Record<string, unknown> };
zodGlobal.__zod_globalConfig = { ...(zodGlobal.__zod_globalConfig ?? {}), jitless: true };

// Client: no Replay integration, no profiling, no logs (CLAUDE.md).
Sentry.init({ ...sentrySharedOptions });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
