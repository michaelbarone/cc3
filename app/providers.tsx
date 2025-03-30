"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { IframeStateProvider } from "./lib/state/iframe-state-context";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <IframeStateProvider>{children}</IframeStateProvider>
    </SessionProvider>
  );
}
