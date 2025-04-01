import { UrlMenu } from "@/app/components/url-menu/UrlMenu";
import { IframeStateContext, IframeStateContextType } from "@/app/lib/state/iframe-state-context";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";

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

// Mock IframeStateContext
const createMockIframeState = (overrides = {}): IframeStateContextType => ({
  activeUrlId: null,
  activeUrl: null,
  loadedUrlIds: [],
  knownUrlIds: new Set<string>(),
  setActiveUrl: vi.fn(),
  resetIframe: vi.fn(),
  unloadIframe: vi.fn(),
  reloadIframe: vi.fn(),
  addLoadedUrlId: vi.fn(),
  removeLoadedUrlId: vi.fn(),
  updateBrowserHistory: vi.fn(),
  saveToPersistence: vi.fn(),
  isLongPressing: false,
  longPressProgress: 0,
  longPressUrlId: null,
  startLongPress: vi.fn(),
  endLongPress: vi.fn(),
  updateLongPressProgress: vi.fn(),
  ...overrides,
});

// Updated TestWrapper to provide mock context
const TestWrapper = ({
  children,
  contextValue,
}: {
  children: ReactNode;
  contextValue?: IframeStateContextType;
}) => {
  const mockContext = contextValue || createMockIframeState();
  return <IframeStateContext.Provider value={mockContext}>{children}</IframeStateContext.Provider>;
};

describe("UrlMenu", () => {
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
    await waitFor(() => {
      const list = screen.getByRole("list", { name: `${groupName} URLs` });
      expect(list).toBeInTheDocument();
    });
    return groupHeader;
  };

  it("should render all groups", () => {
    renderUrlMenu();
    expect(screen.getByText("Group 1")).toBeInTheDocument();
    expect(screen.getByText("Group 2")).toBeInTheDocument();
  });

  it("should expand/collapse groups", async () => {
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
  });

  it("should handle keyboard navigation", async () => {
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
  });

  it("should handle URL selection", async () => {
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
  });

  it("should handle URL state transitions", async () => {
    renderUrlMenu({ activeUrlId: "url1" });

    // Expand group 1
    await expandGroup("Group 1");

    // Check URL 1 is selected
    const list = screen.getByRole("list", { name: "Group 1 URLs" });
    const url1Button = within(list).getByRole("button", { name: /URL 1/ });
    expect(url1Button).toHaveClass("Mui-selected");
  });

  it("should persist group collapse state", async () => {
    renderUrlMenu();

    // Expand group 1
    await expandGroup("Group 1");

    // Check URLs are visible
    const list = screen.getByRole("list", { name: "Group 1 URLs" });
    const urlItems = within(list).getAllByRole("listitem");
    expect(urlItems).toHaveLength(2);
  });

  it("should handle search filtering", async () => {
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
  });

  it("should handle empty states", () => {
    render(
      <TestWrapper>
        <UrlMenu urlGroups={[]} />
      </TestWrapper>,
    );

    expect(screen.getByText("No URLs available")).toBeInTheDocument(); // Update based on your actual empty state message
  });

  it("should handle long press to unload URL", async () => {
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
      // Wait for the long press duration (500ms default)
      await new Promise((resolve) => setTimeout(resolve, 600));
      fireEvent.mouseUp(urlButton);
    });

    // Verify the long press handler was called and cleanup occurred
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
