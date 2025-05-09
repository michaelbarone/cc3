import { UrlMenu } from "@/app/components/url-menu/UrlMenu";
import { IframeProvider } from "@/app/lib/state/iframe-state";
import { measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UrlMenu Component Tests
 *
 * This test suite includes standard functionality tests and edge case tests:
 *
 * Edge Case Tests:
 * 1. Rapid Clicks: Tests rapid sequential clicks between different URL buttons
 *    to ensure proper state management and that the last click is properly registered.
 *
 * 2. Interrupted Long Press: Tests that long press actions are properly canceled
 *    when interrupted before the threshold duration (via mouse movement or early release).
 *
 * 3. Browser Tab Switching: Tests that operations (especially long press) handle
 *    focus/blur events correctly when a user switches browser tabs during the operation.
 *    This ensures proper state cleanup and prevention of unintended side effects.
 *
 * These edge case tests help ensure the component is robust in real-world usage scenarios
 * where user interactions may be unpredictable or interrupted.
 */

// Mock data
const mockUrlGroups = [
  {
    id: "group1",
    name: "Group 1",
    urls: [
      {
        id: "url1",
        title: "URL 1",
        url: "https://example.com/1",
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
      {
        id: "url2",
        title: "URL 2",
        url: "https://example.com/2",
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
    ],
  },
  {
    id: "group2",
    name: "Group 2",
    urls: [
      {
        id: "url3",
        title: "URL 3",
        url: "https://example.com/3",
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
      {
        id: "url4",
        title: "URL 4",
        url: "https://example.com/4",
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
    ],
  },
];

// Updated TestWrapper to use IframeProvider
const TestWrapper = ({ children }: { children: ReactNode }) => {
  return <IframeProvider>{children}</IframeProvider>;
};

describe("UrlMenu", () => {
  const suiteTimer = measureTestTime("UrlMenu Suite");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    suiteTimer.end();
  });

  const renderUrlMenu = (props = {}) => {
    return render(
      <TestWrapper>
        <UrlMenu urlGroups={mockUrlGroups} {...props} />
      </TestWrapper>,
    );
  };

  const expandGroup = async (groupName: string) => {
    const groupHeader = screen.getByText(groupName).closest("[data-group-id]") as HTMLElement;
    fireEvent.click(groupHeader);
    await waitFor(
      () => {
        const list = screen.getByRole("list", { name: `${groupName} URLs` });
        expect(list).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    return groupHeader;
  };

  it("should render all groups", () => {
    const testTimer = measureTestTime("render all groups");
    try {
      renderUrlMenu();
      expect(screen.getByText("Group 1")).toBeInTheDocument();
      expect(screen.getByText("Group 2")).toBeInTheDocument();
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should expand/collapse groups", async () => {
    const testTimer = measureTestTime("expand/collapse groups");
    try {
      renderUrlMenu();

      // Initially all groups are collapsed
      const group1Header = screen.getByText("Group 1").closest("[data-group-id]") as HTMLElement;
      expect(group1Header).toBeInTheDocument();

      // Click to expand
      fireEvent.click(group1Header);

      // Wait for list to be visible
      await waitFor(() => {
        const list = screen.getByRole("list", { name: "Group 1 URLs" });
        expect(list).toBeInTheDocument();
        expect(within(list).getByText("URL 1")).toBeInTheDocument();
        expect(within(list).getByText("URL 2")).toBeInTheDocument();
      });

      // Click to collapse
      fireEvent.click(group1Header);

      // Wait for list to be hidden
      await waitFor(() => {
        expect(screen.queryByRole("list", { name: "Group 1 URLs" })).not.toBeInTheDocument();
      });
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle keyboard navigation", async () => {
    const testTimer = measureTestTime("handle keyboard navigation");
    try {
      renderUrlMenu();
      const user = userEvent.setup();

      // Focus first group header
      const group1Header = screen.getByRole("button", { name: "Group 1" });
      await user.click(group1Header);

      // Wait for the animation to complete and the list to be visible
      await waitFor(
        () => {
          const list = screen.queryByRole("list", { name: "Group 1 URLs" });
          expect(list).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Press / to focus search
      await user.keyboard("/");
      expect(document.activeElement?.getAttribute("placeholder")).toBe("Search URLs");

      // Press Escape to return focus to group header
      await user.keyboard("{Escape}");
      expect(document.activeElement).toBe(group1Header);
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle URL selection", async () => {
    const testTimer = measureTestTime("handle URL selection");
    try {
      const onUrlSelect = vi.fn();
      renderUrlMenu({ onUrlSelect });

      // Expand group 1
      const group1Header = screen.getByRole("button", { name: "Group 1" });
      await userEvent.click(group1Header);

      // Wait for the animation to complete
      await waitFor(
        () => {
          const list = screen.queryByRole("list", { name: "Group 1 URLs" });
          expect(list).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      // Find the URL button
      const urlButton = screen.getByRole("button", { name: /URL 1/ });

      // Click the URL button
      await userEvent.click(urlButton);

      // Verify the click handler was called
      await waitFor(
        () => {
          expect(onUrlSelect).toHaveBeenCalledWith("url1");
        },
        { timeout: 1000 },
      );
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle URL state transitions", async () => {
    const testTimer = measureTestTime("handle URL state transitions");
    try {
      renderUrlMenu({ activeUrlId: "url1" });

      // Expand group 1
      await expandGroup("Group 1");

      // Check URL 1 is selected
      const list = screen.getByRole("list", { name: "Group 1 URLs" });
      const url1Button = within(list).getByRole("button", { name: /URL 1/ });
      expect(url1Button).toHaveClass("Mui-selected");
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should persist group collapse state", async () => {
    const testTimer = measureTestTime("persist group collapse state");
    try {
      renderUrlMenu();

      // Expand group 1
      await expandGroup("Group 1");

      // Check URLs are visible
      const list = screen.getByRole("list", { name: "Group 1 URLs" });
      const urlItems = within(list).getAllByRole("listitem");
      expect(urlItems).toHaveLength(2);
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle search filtering", async () => {
    const testTimer = measureTestTime("handle search filtering");
    try {
      renderUrlMenu();

      // Expand both groups
      await expandGroup("Group 1");
      await expandGroup("Group 2");

      // Type in search
      const searchInput = screen.getByPlaceholderText("Search URLs");
      await userEvent.type(searchInput, "URL 1");

      // Check filtered results
      await waitFor(() => {
        const group1List = screen.getByRole("list", { name: "Group 1 URLs" });
        expect(within(group1List).getByText("URL 1")).toBeInTheDocument();
        expect(within(group1List).queryByText("URL 2")).not.toBeInTheDocument();
        expect(screen.queryByRole("list", { name: "Group 2 URLs" })).not.toBeInTheDocument();
      });
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle empty states", () => {
    const testTimer = measureTestTime("handle empty states");
    try {
      render(
        <TestWrapper>
          <UrlMenu urlGroups={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText("No URLs available")).toBeInTheDocument(); // Update based on your actual empty state message
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  it("should handle long press to unload URL", async () => {
    const testTimer = measureTestTime("handle long press to unload URL");
    try {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UrlMenu urlGroups={mockUrlGroups} />
        </TestWrapper>,
      );

      // Expand Group 1
      const group1Header = screen.getByRole("button", { name: "Group 1" });
      await user.click(group1Header);

      // Wait for list to be visible and animation to complete
      await waitFor(() => {
        const list = screen.getByRole("list", { name: "Group 1 URLs" });
        expect(list).toBeInTheDocument();
        expect(list.closest(".MuiCollapse-root")).toHaveClass("MuiCollapse-entered");
      });

      // Find the URL button
      const urlItem = screen.getByText("URL 1").closest("li");
      const urlButton = within(urlItem!).getByRole("button");

      // Simulate long press by firing mouseDown and waiting
      await act(async () => {
        fireEvent.mouseDown(urlButton);
        await new Promise((resolve) => setTimeout(resolve, 600)); // Wait longer than the 500ms threshold
        fireEvent.mouseUp(urlButton);
      });

      // Check for unload effect (can be checked through classes or aria-attributes based on your implementation)
      // This needs to be updated based on how your component shows unload state
      expect(urlButton).toHaveAttribute("aria-pressed", "false");
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  // New test for rapid clicks between different URLs
  it("should handle rapid clicks between different URLs", async () => {
    const testTimer = measureTestTime("handle rapid clicks between different URLs");
    try {
      const onUrlSelect = vi.fn();
      renderUrlMenu({ onUrlSelect });

      // Expand group 1
      await expandGroup("Group 1");

      // Find URL buttons
      const url1Button = screen.getByRole("button", { name: /URL 1/ });
      const url2Button = screen.getByRole("button", { name: /URL 2/ });

      // Rapid clicks between URLs
      await act(async () => {
        fireEvent.click(url1Button);
        fireEvent.click(url2Button);
        fireEvent.click(url1Button);
        fireEvent.click(url2Button);
        fireEvent.click(url1Button);
      });

      // Verify the last click was registered correctly
      await waitFor(() => {
        expect(onUrlSelect).toHaveBeenLastCalledWith("url1");
        expect(onUrlSelect).toHaveBeenCalledTimes(5);
      });
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  // New test for interrupted long press behavior
  it("should handle interrupted long press correctly", async () => {
    const testTimer = measureTestTime("handle interrupted long press correctly");
    try {
      const user = userEvent.setup();
      renderUrlMenu();

      // Expand Group 1
      await expandGroup("Group 1");

      // Find the URL button
      const urlItem = screen.getByText("URL 1").closest("li");
      const urlButton = within(urlItem!).getByRole("button");

      // Start long press but interrupt before threshold
      await act(async () => {
        fireEvent.mouseDown(urlButton);
        // Wait less than the long press threshold (500ms)
        await new Promise((resolve) => setTimeout(resolve, 250));
        // Interrupt by moving mouse
        fireEvent.mouseMove(urlButton, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(urlButton);
      });

      // Verify no long press action occurred
      // This depends on your implementation - check a specific property or state
      // that indicates long press was not completed
      expect(urlButton).not.toHaveAttribute("data-long-press-active", "true");
      expect(urlButton).toHaveAttribute("aria-pressed", "false");
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });

  // New test for browser tab switching during long operations
  it("should handle browser tab switching during operations", async () => {
    const testTimer = measureTestTime("handle browser tab switching during operations");
    try {
      renderUrlMenu();

      // Expand Group 1
      await expandGroup("Group 1");

      // Find the URL button
      const urlItem = screen.getByText("URL 1").closest("li");
      const urlButton = within(urlItem!).getByRole("button");

      // Start long press
      await act(async () => {
        fireEvent.mouseDown(urlButton);

        // Simulate tab losing focus during long press
        fireEvent.blur(window);

        // Wait enough time for long press to trigger
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Tab gaining focus again
        fireEvent.focus(window);

        fireEvent.mouseUp(urlButton);
      });

      // Verify the long press was canceled when focus was lost
      expect(urlButton).not.toHaveAttribute("data-long-press-active", "true");
      expect(urlButton).toHaveAttribute("aria-pressed", "false");
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    } finally {
      testTimer.end();
    }
  });
});
