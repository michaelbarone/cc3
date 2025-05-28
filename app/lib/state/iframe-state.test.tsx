import { UrlGroup } from "@/app/types/iframe";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIframeLifecycle, useLongPress, useUrlManager } from "../hooks/useIframe";
import { IframeProvider, useIframeState } from "./iframe-state";

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IframeProvider>{children}</IframeProvider>
);

// Mock URL groups for testing
const mockUrlGroups: UrlGroup[] = [
  {
    id: "group1",
    name: "Test Group",
    urls: [
      {
        id: "url1",
        url: "https://test1.com",
        urlMobile: null,
      },
      {
        id: "url2",
        url: "https://test2.com",
        urlMobile: null,
      },
    ],
  },
];

describe("IframeState", () => {
  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    expect(result.current.state.activeUrlId).toBeNull();
    expect(result.current.state.urls).toEqual({});
    expect(result.current.state.initialUrlId).toBeNull();
  });

  it("should initialize URLs with INIT_URLS action", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
    });

    expect(result.current.state.urls).toHaveProperty("url1");
    expect(result.current.state.urls.url1).toEqual({
      id: "url1",
      url: "https://test1.com",
      urlMobile: null,
      isLoaded: false,
      isVisible: true,
      error: null,
      retryCount: 0,
    });
    expect(result.current.state.initialUrlId).toBe("url1");
  });

  it("should select URL and update visibility", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "SELECT_URL",
        payload: { urlId: "url1" },
      });
    });

    expect(result.current.state.activeUrlId).toBe("url1");
    expect(result.current.state.urls.url1.isVisible).toBe(true);
  });

  it("should load URL and clear errors", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "SET_ERROR",
        payload: { urlId: "url1", error: "Previous error" },
      });
      result.current.dispatch({
        type: "LOAD_URL",
        payload: { urlId: "url1" },
      });
    });

    expect(result.current.state.urls.url1.error).toBeNull();
    expect(result.current.state.urls.url1.isLoaded).toBe(true);
  });

  it("should unload URL and reset state", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "LOAD_URL",
        payload: { urlId: "url1" },
      });
      result.current.dispatch({
        type: "UNLOAD_URL",
        payload: { urlId: "url1" },
      });
    });

    expect(result.current.state.urls.url1.isLoaded).toBe(false);
    expect(result.current.state.urls.url1.isVisible).toBe(false);
    expect(result.current.state.urls.url1.error).toBeNull();
    expect(result.current.state.urls.url1.retryCount).toBe(0);
  });

  it("should track error retry counts", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "SET_ERROR",
        payload: { urlId: "url1", error: "Test error" },
      });
    });

    expect(result.current.state.urls.url1.error).toBe("Test error");
    expect(result.current.state.urls.url1.retryCount).toBe(1);
  });

  it("should handle multiple URL selections", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "SELECT_URL",
        payload: { urlId: "url1" },
      });
      result.current.dispatch({
        type: "SELECT_URL",
        payload: { urlId: "url2" },
      });
    });

    expect(result.current.state.activeUrlId).toBe("url2");
    expect(result.current.state.urls.url1.isVisible).toBe(false);
    expect(result.current.state.urls.url2.isVisible).toBe(true);
  });

  it("should maintain loaded state when switching URLs", () => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
      result.current.dispatch({
        type: "LOAD_URL",
        payload: { urlId: "url1" },
      });
      result.current.dispatch({
        type: "SELECT_URL",
        payload: { urlId: "url2" },
      });
    });

    expect(result.current.state.urls.url1.isLoaded).toBe(true);
    expect(result.current.state.urls.url1.isVisible).toBe(false);
    expect(result.current.state.urls.url2.isVisible).toBe(true);
    expect(result.current.state.urls.url2.isLoaded).toBe(false);
  });
});

describe("useUrlManager", () => {
  it("should initialize URLs", () => {
    const { result } = renderHook(() => useUrlManager(mockUrlGroups, "url2"), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.initializeUrls();
    });

    expect(result.current.activeUrlId).toBe("url2");
    expect(result.current.urls).toHaveProperty("url1");
    expect(result.current.urls).toHaveProperty("url2");
    expect(result.current.urls).toHaveProperty("url3");
    expect(result.current.urls).toHaveProperty("url4");
  });

  it("should select URL", () => {
    const { result } = renderHook(() => useUrlManager(mockUrlGroups), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.initializeUrls("url1");
    });

    act(() => {
      result.current.selectUrl("url2");
    });

    expect(result.current.activeUrlId).toBe("url2");
  });

  it("should unload URL", () => {
    const { result } = renderHook(() => useUrlManager(mockUrlGroups), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.initializeUrls("url1");
    });

    // Load URL
    act(() => {
      result.current.selectUrl("url1");
    });

    // Unload URL
    act(() => {
      result.current.unloadUrl("url1");
    });

    expect(result.current.urls.url1.isLoaded).toBe(false);
  });

  it("should track loaded URLs", () => {
    const { result } = renderHook(() => useUrlManager(mockUrlGroups), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.initializeUrls("url1");
    });

    // No URLs loaded initially
    expect(result.current.loadedUrlIds).toHaveLength(0);

    // Mark URL as loaded using dispatch directly for testing
    act(() => {
      const { dispatch } = renderHook(() => useIframeState(), {
        wrapper: TestWrapper,
      }).result.current;

      dispatch({
        type: "LOAD_URL",
        payload: { urlId: "url1" },
      });
    });

    // Now we should have one loaded URL
    expect(result.current.loadedUrlIds).toContain("url1");
  });

  it("should find current group based on active URL", () => {
    const { result } = renderHook(() => useUrlManager(mockUrlGroups), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.initializeUrls("url3");
    });

    expect(result.current.currentGroup?.id).toBe("group2");

    act(() => {
      result.current.selectUrl("url1");
    });

    expect(result.current.currentGroup?.id).toBe("group1");
  });
});

describe("useIframeLifecycle", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.dispatch({
        type: "INIT_URLS",
        payload: { urlGroups: mockUrlGroups, initialUrlId: "url1" },
      });
    });
  });

  it("should handle load events", () => {
    const { result } = renderHook(() => useIframeLifecycle("url1"), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.handleLoad();
    });

    expect(result.current.isLoaded).toBe(true);
  });

  it("should handle error events", () => {
    const { result } = renderHook(() => useIframeLifecycle("url1"), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.handleError("Test error");
    });

    expect(result.current.error).toBe("Test error");
  });

  it("should clear errors", () => {
    const { result } = renderHook(() => useIframeLifecycle("url1"), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.handleError("Test error");
    });

    expect(result.current.error).toBe("Test error");

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it("should track if URL is active", () => {
    const { result: stateResult } = renderHook(() => useIframeState(), {
      wrapper: TestWrapper,
    });

    const { result: lifecycleResult } = renderHook(() => useIframeLifecycle("url1"), {
      wrapper: TestWrapper,
    });

    expect(lifecycleResult.current.isActive).toBe(true);

    act(() => {
      stateResult.current.dispatch({
        type: "SELECT_URL",
        payload: { urlId: "url2" },
      });
    });

    expect(lifecycleResult.current.isActive).toBe(false);
  });
});

describe("useLongPress", () => {
  it("should track progress during long press", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress,
        duration: 50, // Short duration for testing
        delayStart: 0,
      }),
    );

    // Simulate mouse down
    act(() => {
      result.current.handleMouseDown();
    });

    // Fast-forward time to complete long press
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onLongPress).toHaveBeenCalled();
  });

  it("should cancel on mouse up", async () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress,
        duration: 100,
        delayStart: 0,
      }),
    );

    // Simulate mouse down
    act(() => {
      result.current.handleMouseDown();
    });

    // Simulate mouse up before completion
    act(() => {
      result.current.handleMouseUp();
    });

    // Fast-forward time
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.progress).toBe(0);
  });
});
