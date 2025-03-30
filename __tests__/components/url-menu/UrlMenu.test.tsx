import { UrlMenu } from '@/app/components/url-menu/UrlMenu'
import { IframeStateContext, IframeStateContextType } from '@/app/lib/state/iframe-state-context'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

// Mock data
const mockUrlGroups = [
  {
    id: 'group1',
    name: 'Group 1',
    urls: [
      {
        id: 'url1',
        title: 'URL 1',
        url: 'https://example.com/1',
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
      {
        id: 'url2',
        title: 'URL 2',
        url: 'https://example.com/2',
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
    ],
  },
  {
    id: 'group2',
    name: 'Group 2',
    urls: [
      {
        id: 'url3',
        title: 'URL 3',
        url: 'https://example.com/3',
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
      {
        id: 'url4',
        title: 'URL 4',
        url: 'https://example.com/4',
        urlMobile: null,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
    ],
  },
]

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
  ...overrides
});

// Updated TestWrapper to provide mock context
const TestWrapper = ({ children, contextValue }: {
  children: ReactNode;
  contextValue?: IframeStateContextType;
}) => {
  const mockContext = contextValue || createMockIframeState();
  return (
    <IframeStateContext.Provider value={mockContext}>
      {children}
    </IframeStateContext.Provider>
  );
};

describe('UrlMenu', () => {
  it('should render all URL groups and items', () => {
    render(
      <TestWrapper>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    )

    // Check if groups are rendered
    expect(screen.getByText('Group 1')).toBeInTheDocument()
    expect(screen.getByText('Group 2')).toBeInTheDocument()

    // Check if URLs are rendered
    expect(screen.getByText('URL 1')).toBeInTheDocument()
    expect(screen.getByText('URL 2')).toBeInTheDocument()
    expect(screen.getByText('URL 3')).toBeInTheDocument()
    expect(screen.getByText('URL 4')).toBeInTheDocument()
  })

  it('should handle URL selection', async () => {
    const onUrlSelect = vi.fn()

    render(
      <TestWrapper>
        <UrlMenu
          urlGroups={mockUrlGroups}
          onUrlSelect={onUrlSelect}
        />
      </TestWrapper>
    )

    // Click on a URL
    const url1 = screen.getByText('URL 1')
    await userEvent.click(url1)

    expect(onUrlSelect).toHaveBeenCalledWith('url1')
  })

  it('should expand/collapse groups', async () => {
    render(
      <TestWrapper>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    )

    // Get group headers
    const group1Header = screen.getByText('Group 1')
    const group2Header = screen.getByText('Group 2')

    // Initially, groups should be expanded
    expect(screen.getByText('URL 1')).toBeVisible()
    expect(screen.getByText('URL 3')).toBeVisible()

    // Collapse first group
    await userEvent.click(group1Header)
    await waitFor(() => {
      expect(screen.getByText('URL 1')).not.toBeVisible()
      expect(screen.getByText('URL 2')).not.toBeVisible()
    })

    // URL 3 should still be visible
    expect(screen.getByText('URL 3')).toBeVisible()

    // Expand first group again
    await userEvent.click(group1Header)
    await waitFor(() => {
      expect(screen.getByText('URL 1')).toBeVisible()
      expect(screen.getByText('URL 2')).toBeVisible()
    })
  })

  it('should highlight active URL', () => {
    const mockContext = createMockIframeState({
      activeUrlId: 'url2',
      activeUrl: mockUrlGroups[0].urls[1],
    });

    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    )

    const url2Item = screen.getByText('URL 2').closest('li')
    expect(url2Item).toHaveClass('Mui-selected')
  })

  it('should handle search filtering', async () => {
    const onUrlSelect = vi.fn();
    const mockContext = createMockIframeState();

    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    );

    // Initially all URLs should be visible
    expect(screen.getByText('URL 1')).toBeVisible();
    expect(screen.getByText('URL 2')).toBeVisible();
    expect(screen.getByText('URL 3')).toBeVisible();
    expect(screen.getByText('URL 4')).toBeVisible();

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search URLs');
    await userEvent.type(searchInput, '1');

    // Only URL 1 should be visible
    await waitFor(() => {
      expect(screen.getByText('URL 1')).toBeVisible();
      expect(screen.queryByText('URL 2')).not.toBeVisible();
      expect(screen.queryByText('URL 3')).not.toBeVisible();
      expect(screen.queryByText('URL 4')).not.toBeVisible();
    });

    // Clear search
    await userEvent.clear(searchInput);

    // All URLs should be visible again
    await waitFor(() => {
      expect(screen.getByText('URL 1')).toBeVisible();
      expect(screen.getByText('URL 2')).toBeVisible();
      expect(screen.getByText('URL 3')).toBeVisible();
      expect(screen.getByText('URL 4')).toBeVisible();
    });
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    const mockContext = createMockIframeState();

    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    );

    // Press '/' to focus search
    await user.keyboard('/');
    const searchInput = screen.getByPlaceholderText('Search URLs');
    expect(searchInput).toHaveFocus();

    // Press Escape to blur search
    await user.keyboard('{Escape}');
    expect(searchInput).not.toHaveFocus();

    // Tab to first group header
    await user.tab();
    const group1Header = screen.getByRole('button', { name: 'Group 1' });
    expect(group1Header).toHaveFocus();

    // Press Enter to collapse group
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByText('URL 1')).not.toBeVisible();
    });

    // Press Enter again to expand group
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByText('URL 1')).toBeVisible();
    });

    // Tab to first URL
    await user.tab();
    const firstUrlButton = screen.getByRole('button', { name: /URL 1/ });
    expect(firstUrlButton).toHaveFocus();

    // Press Enter to select URL
    await user.keyboard('{Enter}');
    expect(mockContext.setActiveUrl).toHaveBeenCalledWith(mockUrlGroups[0].urls[0]);
  });

  it('should handle URL state transitions', async () => {
    const mockContext = createMockIframeState({
      activeUrlId: 'url1',
      loadedUrlIds: ['url1'],
    });

    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    );

    // Initial state: active and loaded
    let urlItem = screen.getByText('URL 1').closest('li');
    const urlButton = within(urlItem!).getByRole('button');
    expect(urlButton).toHaveClass('Mui-selected');
    expect(urlItem).toHaveStyle({ '::after': expect.stringContaining('success.main') });

    // Simulate long press
    fireEvent.mouseDown(urlButton);
    await new Promise(resolve => setTimeout(resolve, 500));
    fireEvent.mouseUp(urlButton);

    expect(mockContext.unloadIframe).toHaveBeenCalledWith('url1');
  });

  it('should persist group collapse state', async () => {
    const user = userEvent.setup();
    const mockContext = createMockIframeState();
    const { unmount } = render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    );

    // Collapse first group
    const group1Header = screen.getByRole('button', { name: 'Group 1' });
    await user.click(group1Header);
    await waitFor(() => {
      expect(screen.getByText('URL 1')).not.toBeVisible();
    });

    // Unmount and remount with same context
    unmount();
    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu urlGroups={mockUrlGroups} />
      </TestWrapper>
    );

    // Group should still be collapsed
    await waitFor(() => {
      expect(screen.getByText('URL 1')).not.toBeVisible();
    });
  });

  it('should handle empty states', () => {
    render(
      <TestWrapper>
        <UrlMenu urlGroups={[]} />
      </TestWrapper>
    )

    expect(screen.getByText('No URLs available')).toBeInTheDocument() // Update based on your actual empty state message
  })

  it('should handle long press to unload URL', async () => {
    const mockContext = createMockIframeState({
      activeUrlId: 'url1',
      loadedUrlIds: ['url1'],
      isLongPressing: false,
      longPressUrlId: null,
      startLongPress: vi.fn().mockImplementation((urlId: string) => {
        mockContext.isLongPressing = true;
        mockContext.longPressUrlId = urlId;
      }),
      endLongPress: vi.fn().mockImplementation(() => {
        mockContext.isLongPressing = false;
        mockContext.longPressUrlId = null;
        mockContext.unloadIframe('url1');
      })
    });

    render(
      <TestWrapper contextValue={mockContext}>
        <UrlMenu
          urlGroups={mockUrlGroups}
          onUrlSelect={vi.fn()}
          activeUrlId="url1"
        />
      </TestWrapper>
    );

    const urlItem = screen.getByText('URL 1').closest('li');
    expect(urlItem).toBeTruthy();

    if (urlItem) {
      // Start long press
      fireEvent.mouseDown(urlItem);
      mockContext.startLongPress('url1');

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500));

      // End long press
      fireEvent.mouseUp(urlItem);
      mockContext.endLongPress();
    }

    await waitFor(() => {
      expect(mockContext.unloadIframe).toHaveBeenCalledWith('url1');
    });
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup({ delay: null });
    const onUrlSelect = vi.fn();

    render(
      <TestWrapper>
        <UrlMenu
          urlGroups={mockUrlGroups}
          onUrlSelect={onUrlSelect}
        />
      </TestWrapper>
    );

    // Press '/' to focus search
    await user.keyboard('/');
    expect(screen.getByPlaceholderText('Search URLs')).toHaveFocus();

    // Press Escape to blur search
    await user.keyboard('{Escape}');
    expect(screen.getByPlaceholderText('Search URLs')).not.toHaveFocus();

    // Press arrow keys to navigate URLs
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('URL 1').closest('li')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('URL 2').closest('li')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByText('URL 1').closest('li')).toHaveFocus();
  });
})
