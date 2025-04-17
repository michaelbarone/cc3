import { TextDecoder, TextEncoder } from "util";
import { vi } from "vitest";

// Polyfill TextEncoder/TextDecoder for happy-dom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: "test",
};

// Mock Next.js dynamic imports
vi.mock("next/dynamic", () => ({
  default: vi.fn(() => {
    const DynamicComponent = vi.fn(() => null) as {
      (): null;
      displayName?: string;
    };
    DynamicComponent.displayName = "LoadableComponent";
    return DynamicComponent;
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
