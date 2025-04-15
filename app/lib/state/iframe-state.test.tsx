import { UrlGroup } from "@/app/types/iframe";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
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
    expect(result.current.state.urls.url1.retryCount).toBe(0);
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
