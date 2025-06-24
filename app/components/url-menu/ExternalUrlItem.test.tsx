import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import { ThemeProvider, createTheme } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalUrlItem } from "./ExternalUrlItem";

// Mock the getEffectiveUrl function
vi.mock("@/app/lib/utils/iframe-utils", () => ({
  getEffectiveUrl: vi.fn().mockReturnValue("http://localhost:3000/test"),
}));

// Mock window.open
const windowOpenMock = vi.fn();
window.open = windowOpenMock;

describe("ExternalUrlItem", () => {
  const theme = createTheme();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use getEffectiveUrl for localhost URLs", () => {
    const url = {
      id: "localhost-url",
      title: "Localhost URL",
      url: "http://example-localhost.com",
      urlMobile: null,
      iconPath: null,
      displayOrder: 0,
      isLocalhost: true,
      port: "3000",
      path: "/test",
    };

    render(
      <ThemeProvider theme={theme}>
        <ExternalUrlItem
          url={url}
          tooltipText="Localhost URL - http://localhost:3000/test (opens in new tab)"
          menuPosition="top"
          theme={theme}
        />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: /Localhost URL \(opens in new tab\)/i });
    fireEvent.click(button);

    // Verify getEffectiveUrl was called
    expect(getEffectiveUrl).toHaveBeenCalled();

    // Verify window.open was called with the effective URL from our mock
    expect(windowOpenMock).toHaveBeenCalledWith(
      "http://localhost:3000/test",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should open regular URL in new tab", () => {
    const url = {
      id: "test-url",
      title: "Test URL",
      url: "https://example.com",
      urlMobile: null,
      iconPath: null,
      displayOrder: 0,
      isLocalhost: false,
    };

    render(
      <ThemeProvider theme={theme}>
        <ExternalUrlItem
          url={url}
          tooltipText="Test URL - https://example.com (opens in new tab)"
          menuPosition="top"
          theme={theme}
        />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: /Test URL \(opens in new tab\)/i });
    fireEvent.click(button);

    // For non-localhost URLs, getEffectiveUrl should not be called
    expect(windowOpenMock).toHaveBeenCalled();
  });
});
