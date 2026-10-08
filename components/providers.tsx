"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

/** Dark is the default theme (PRD §1.5). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster
        theme="dark"
        position="bottom-center"
        richColors
        visibleToasts={2}
        offset={24}
        mobileOffset={{ bottom: "calc(var(--tabbar-h) + 12px)", left: 12, right: 12 }}
        toastOptions={{ className: "!rounded-2xl !font-sans" }}
      />
    </ThemeProvider>
  );
}
