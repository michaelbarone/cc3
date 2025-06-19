"use client";

import { useCallback, useEffect, useRef } from "react";

interface GlobalContainer {
  container: HTMLDivElement;
  iframes: Map<string, HTMLIFrameElement>;
  wrappers: Map<string, HTMLDivElement>;
}

interface UseGlobalIframeContainerReturn {
  createIframe: (urlId: string, url: string) => HTMLIFrameElement;
  removeIframe: (urlId: string) => void;
  updateIframeVisibility: (urlId: string, isVisible: boolean) => void;
  updateContainerPosition: (rect: DOMRect) => void;
}

// Singleton container instance
let globalContainer: GlobalContainer | null = null;

function getOrCreateGlobalContainer(): GlobalContainer {
  if (!globalContainer) {
    const container = document.createElement("div");
    container.id = "global-iframe-container";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "1000";
    document.body.appendChild(container);

    globalContainer = {
      container,
      iframes: new Map(),
      wrappers: new Map(),
    };
  }
  return globalContainer;
}

export function useGlobalIframeContainer(): UseGlobalIframeContainerReturn {
  const containerRef = useRef<GlobalContainer | null>(null);

  // Initialize the global container
  useEffect(() => {
    containerRef.current = getOrCreateGlobalContainer();

    return () => {
      // Don't remove the container on unmount as it's shared
      // But do clean up any event listeners if needed
    };
  }, []);

  const createIframe = useCallback((urlId: string, url: string) => {
    if (!containerRef.current) return null as unknown as HTMLIFrameElement;

    // Create wrapper div
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-iframe-container", urlId);
    wrapper.style.position = "absolute";
    wrapper.style.top = "0";
    wrapper.style.left = "0";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.overflow = "hidden";
    wrapper.style.pointerEvents = "auto";
    wrapper.style.display = "none"; // Start hidden
    wrapper.style.zIndex = "0";

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-iframe-id", urlId);
    iframe.setAttribute("data-url", url);
    iframe.title = `iframe-${urlId}`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.background = "#fff";
    iframe.style.overflow = "hidden";
    iframe.setAttribute(
      "sandbox",
      "allow-same-origin allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation allow-top-navigation-by-user-activation",
    );
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
    );

    // Store refs
    containerRef.current.iframes.set(urlId, iframe);
    containerRef.current.wrappers.set(urlId, wrapper);

    // Add to DOM
    wrapper.appendChild(iframe);
    containerRef.current.container.appendChild(wrapper);

    return iframe;
  }, []);

  const removeIframe = useCallback((urlId: string) => {
    if (!containerRef.current) return;

    const wrapper = containerRef.current.wrappers.get(urlId);
    if (wrapper) {
      wrapper.remove();
      containerRef.current.wrappers.delete(urlId);
      containerRef.current.iframes.delete(urlId);
    }
  }, []);

  const updateIframeVisibility = useCallback((urlId: string, isVisible: boolean) => {
    if (!containerRef.current) return;

    const wrapper = containerRef.current.wrappers.get(urlId);
    if (wrapper) {
      wrapper.style.display = isVisible ? "block" : "none";
      wrapper.style.zIndex = isVisible ? "1" : "0";
    }
  }, []);

  const updateContainerPosition = useCallback((rect: DOMRect) => {
    if (!containerRef.current) return;

    containerRef.current.wrappers.forEach((wrapper) => {
      wrapper.style.position = "fixed";
      wrapper.style.top = `${rect.top}px`;
      wrapper.style.left = `${rect.left}px`;
      wrapper.style.width = `${rect.width}px`;
      wrapper.style.height = `${rect.height}px`;
    });
  }, []);

  return {
    createIframe,
    removeIframe,
    updateIframeVisibility,
    updateContainerPosition,
  };
}
