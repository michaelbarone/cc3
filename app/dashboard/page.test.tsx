import { useMediaQuery } from "@mui/material";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Dashboard from "./page";

// Mock the dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: vi.fn(),
    useTheme: vi.fn(() => ({
      palette: {
        primary: { main: "#1976d2" },
        warning: { main: "#ed6c02" },
        action: { selected: "rgba(0, 0, 0, 0.08)" },
        grey: { 300: "#e0e0e0" },
        background: { default: "#ffffff" },
      },
      breakpoints: {
        down: () => "",
        up: () => "",
      },
    })),
  };
});

// Mock fetch
global.fetch = vi.fn();

// Mock the window.localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock session data
    (useSession as any).mockReturnValue({
      data: {
        user: {
          menuPosition: "TOP",
        },
      },
      status: "authenticated",
    });

    // Mock useMediaQuery for mobile
    (useMediaQuery as any).mockReturnValue(true);

    // Mock successful fetch response
    const mockGroups = [
      {
        id: "group1",
        name: "Group 1",
        urls: [
          {
            id: "url1",
            urlId: "url1",
            url: "https://example.com",
            title: "Example 1",
            faviconUrl: "/favicon1.ico",
            mobileSpecificUrl: null,
            notes: null,
          },
          {
            id: "url2",
            urlId: "url2",
            url: "https://example2.com",
            title: "Example 2",
            faviconUrl: "/favicon2.ico",
            mobileSpecificUrl: null,
            notes: null,
          },
        ],
      },
      {
        id: "group2",
        name: "Group 2",
        urls: [
          {
            id: "url3",
            urlId: "url3",
            url: "https://example3.com",
            title: "Example 3",
            faviconUrl: "/favicon3.ico",
            mobileSpecificUrl: null,
            notes: null,
          },
        ],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockGroups,
    });
  });

  test("loads and displays mobile drawer correctly", async () => {
    render(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Should have a hamburger menu button
    const drawerToggleButton = screen.getByRole("button", { name: /menu/i });
    expect(drawerToggleButton).toBeInTheDocument();

    // Drawer should be closed initially
    expect(screen.queryByText("Group 1")).not.toBeInTheDocument();

    // Open the drawer
    fireEvent.click(drawerToggleButton);

    // Drawer should now be open and display group names
    expect(screen.getByText("Group 1")).toBeInTheDocument();
    expect(screen.getByText("Group 2")).toBeInTheDocument();

    // Group contents should be collapsed initially
    expect(screen.queryByText("Example 1")).not.toBeInTheDocument();

    // Expand a group
    fireEvent.click(screen.getByText("Group 1"));

    // Should display URLs for that group
    expect(screen.getByText("Example 1")).toBeInTheDocument();
    expect(screen.getByText("Example 2")).toBeInTheDocument();

    // Other groups should remain collapsed
    expect(screen.queryByText("Example 3")).not.toBeInTheDocument();
  });

  test("persists expanded group state in localStorage", async () => {
    // Set mock localStorage value for expanded group
    localStorageMock.setItem("mobileExpandedGroupId", "group1");

    render(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Open the drawer
    const drawerToggleButton = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(drawerToggleButton);

    // Group 1 should be auto-expanded from localStorage value
    expect(screen.getByText("Example 1")).toBeInTheDocument();
    expect(screen.getByText("Example 2")).toBeInTheDocument();

    // Change expanded group
    fireEvent.click(screen.getByText("Group 2"));

    // Should update localStorage with new expanded group
    expect(localStorageMock.setItem).toHaveBeenCalledWith("mobileExpandedGroupId", "group2");

    // Group 2 should now be expanded
    expect(screen.getByText("Example 3")).toBeInTheDocument();

    // Group 1 should be collapsed
    expect(screen.queryByText("Example 1")).not.toBeInTheDocument();
  });

  test("mobile drawer closes when URL is clicked", async () => {
    render(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Open the drawer
    const drawerToggleButton = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(drawerToggleButton);

    // Expand a group
    fireEvent.click(screen.getByText("Group 1"));

    // Verify URL is visible
    expect(screen.getByText("Example 1")).toBeInTheDocument();

    // Click a URL
    fireEvent.click(screen.getByText("Example 1"));

    // Drawer should close - URL text should no longer be visible
    expect(screen.queryByText("Example 1")).not.toBeInTheDocument();
  });
});
