"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { IframeProvider } from "./lib/state/iframe-state";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <IframeProvider>{children}</IframeProvider>
    </SessionProvider>
  );
}
