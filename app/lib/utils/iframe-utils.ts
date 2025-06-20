import { resetGlobalContainer } from "@/app/components/iframe/IframeContainer";

// Utility function to cleanup iframes and container
export function cleanupIframes() {
  const iframeContainer = document.getElementById("global-iframe-container");
  if (iframeContainer) {
    // Remove all iframes
    const iframes = iframeContainer.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      iframe.src = "";
      iframe.remove();
    });
    // Remove the container
    iframeContainer.remove();
    // Reset the global container reference
    resetGlobalContainer();
  }
}

// Check if we're in the process of logging out
export function isLoggingOut() {
  return document.body.classList.contains("logging-out");
}

/**
 * URL interface with optional localhost properties
 */
export interface UrlWithLocalhost {
  id: string;
  url: string;
  urlMobile?: string | null;
  isLocalhost: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePath?: string | null;
  localhostMobilePort?: string | null;
}

/**
 * Generates the effective URL based on device and localhost settings
 *
 * @param url - URL object with optional localhost properties
 * @param isMobile - Whether the current device is mobile
 * @returns The effective URL to use
 */
export function getEffectiveUrl(url: UrlWithLocalhost, isMobile: boolean): string {
  console.log(`[getEffectiveUrl] Processing URL - id: ${url.id}, isMobile: ${isMobile}`);

  if (url.isLocalhost) {
    // Get current protocol and hostname from browser
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

    // Determine if we should use mobile-specific values
    const useMobile = isMobile && (url.localhostMobilePort || url.localhostMobilePath);

    // Select port and path based on device
    const effectivePort =
      useMobile && url.localhostMobilePort ? url.localhostMobilePort : url.port || "";

    const effectivePath =
      useMobile && url.localhostMobilePath ? url.localhostMobilePath : url.path || "/";

    // Build URL with appropriate parts
    const result = effectivePort
      ? `${protocol}//${hostname}:${effectivePort}${effectivePath}`
      : `${protocol}//${hostname}${effectivePath}`;

    console.log(`[getEffectiveUrl] Localhost URL - result: ${result}, useMobile: ${useMobile}`);
    return result;
  } else {
    // Use standard URL selection logic for non-localhost URLs
    const selectedUrl = isMobile && url.urlMobile ? url.urlMobile : url.url;
    // Return empty string if the URL is null or empty
    console.log(
      `[getEffectiveUrl] Standard URL - selectedUrl: ${selectedUrl}, urlMobile: ${url.urlMobile}, url: ${url.url}`,
    );
    return selectedUrl || "";
  }
}
