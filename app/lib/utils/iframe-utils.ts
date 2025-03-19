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
