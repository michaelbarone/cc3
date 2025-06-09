import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { IframeProvider, useIframeManager } from "./IframeProvider";

// Test component that consumes the context
function TestConsumer() {
  const {
    activeUrlIdentifier,
    getIframeData,
    isUrlLoaded,
    setActiveUrl,
    markAsLoaded,
    markAsUnloaded,
    triggerReload,
    getAllManagedIframesForRender,
  } = useIframeManager();

  const iframesForRender = getAllManagedIframesForRender();

  return (
    <div>
      <div data-testid="active-url">{activeUrlIdentifier || "none"}</div>
      <button data-testid="set-url1" onClick={() => setActiveUrl("url1", "https://example.com")}>
        Set URL 1
      </button>
      <button data-testid="set-url2" onClick={() => setActiveUrl("url2", "https://example2.com")}>
        Set URL 2
      </button>
      <button data-testid="mark-loaded" onClick={() => markAsLoaded("url1")}>
        Mark URL 1 Loaded
      </button>
      <button data-testid="mark-unloaded" onClick={() => markAsUnloaded("url1")}>
        Mark URL 1 Unloaded
      </button>
      <button data-testid="trigger-reload" onClick={() => triggerReload("url1")}>
        Reload URL 1
      </button>
      <div data-testid="is-url1-loaded">{isUrlLoaded("url1") ? "loaded" : "not-loaded"}</div>
      <div data-testid="iframe-count">{iframesForRender.length}</div>
      <div data-testid="iframe-data">
        {JSON.stringify(iframesForRender.map((iframe) => iframe.identifier))}
      </div>
    </div>
  );
}

// Test component that wraps children in IframeProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <IframeProvider>{children}</IframeProvider>;
}

describe("IframeProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test("provides initial empty state", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Should have no active URL initially
    expect(screen.getByTestId("active-url").textContent).toBe("none");

    // Should have no iframes for render initially
    expect(screen.getByTestId("iframe-count").textContent).toBe("0");
  });

  test("sets active URL", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Set URL 1 as active
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // Should update active URL
    expect(screen.getByTestId("active-url").textContent).toBe("url1");

    // Should add URL to managed iframes
    expect(screen.getByTestId("iframe-count").textContent).toBe("1");
    expect(screen.getByTestId("iframe-data").textContent).toContain("url1");

    // New URL should not be loaded initially
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("not-loaded");
  });

  test("marks URL as loaded", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Set URL 1 as active
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // Mark URL 1 as loaded
    act(() => {
      screen.getByTestId("mark-loaded").click();
    });

    // URL should now be loaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("loaded");
  });

  test("marks URL as unloaded", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Set URL 1 as active and mark as loaded
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // We need to explicitly mark as loaded first
    act(() => {
      screen.getByTestId("mark-loaded").click();
    });

    // Verify URL is loaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("loaded");

    // Mark URL 1 as unloaded
    act(() => {
      screen.getByTestId("mark-unloaded").click();
    });

    // URL should now be unloaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("not-loaded");
  });

  test("triggers reload for a URL", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Set URL 1 as active
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // We need to explicitly mark as loaded first
    act(() => {
      screen.getByTestId("mark-loaded").click();
    });

    // Verify URL is loaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("loaded");

    // Trigger reload
    act(() => {
      screen.getByTestId("trigger-reload").click();
    });

    // URL should be unloaded initially after reload
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("not-loaded");

    // After timeout, it should attempt to reload (src changes back but still not loaded)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Still not loaded until iframe triggers onLoad
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("not-loaded");
  });

  test("manages multiple URLs", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Set URL 1 as active
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // Should have URL 1 active
    expect(screen.getByTestId("active-url").textContent).toBe("url1");
    expect(screen.getByTestId("iframe-count").textContent).toBe("1");

    // Set URL 2 as active
    act(() => {
      screen.getByTestId("set-url2").click();
    });

    // Should update active URL
    expect(screen.getByTestId("active-url").textContent).toBe("url2");

    // Should now have both URLs in managed iframes
    expect(screen.getByTestId("iframe-count").textContent).toBe("2");
    expect(screen.getByTestId("iframe-data").textContent).toContain("url1");
    expect(screen.getByTestId("iframe-data").textContent).toContain("url2");
  });

  test("preserves iframe data when switching between URLs", () => {
    render(
      <TestWrapper>
        <TestConsumer />
      </TestWrapper>,
    );

    // Add URL 1
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // We need to explicitly mark as loaded first
    act(() => {
      screen.getByTestId("mark-loaded").click();
    });

    // Verify URL is loaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("loaded");

    // Add URL 2
    act(() => {
      screen.getByTestId("set-url2").click();
    });

    // Active URL should be URL 2
    expect(screen.getByTestId("active-url").textContent).toBe("url2");

    // Switch back to URL 1
    act(() => {
      screen.getByTestId("set-url1").click();
    });

    // URL 1 should still be loaded
    expect(screen.getByTestId("is-url1-loaded").textContent).toBe("loaded");
    expect(screen.getByTestId("active-url").textContent).toBe("url1");
  });
});
