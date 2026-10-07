import * as Sentry from "@sentry/nextjs";

import { sentrySharedOptions } from "./sentry.shared";

// Client: no Replay integration, no profiling, no logs (CLAUDE.md).
Sentry.init({ ...sentrySharedOptions });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
