import { vi } from "vitest";

interface TokenPayload {
  isAdmin: boolean;
  [key: string]: any;
}

export const mockVerifyToken = vi.fn<Promise<TokenPayload | null>>();
