"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-NG" className="dark">
      <body
        style={{ background: "#0B0F0D", color: "#F7F5F0", fontFamily: "system-ui, sans-serif" }}
      >
        <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p>We&apos;ve been notified. Please refresh the page or try again in a moment.</p>
        </main>
      </body>
    </html>
  );
}
