import { vi } from "vitest";

interface TokenPayload {
  isAdmin: boolean;
  [key: string]: any;
}

export const mockVerifyToken = vi.fn().mockImplementation(() => Promise.resolve<TokenPayload | null>(null));
