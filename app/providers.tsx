"use client";

import { ReactNode } from "react";
import { IframeStateProvider } from "./lib/state/iframe-state-context";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <IframeStateProvider>{children}</IframeStateProvider>;
}
