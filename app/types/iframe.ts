/**
 * Types for iframe state management
 */

/**
 * Interface for an iframe data object in the managed iframes collection
 */
export interface IframeData {
  /** The original source URL */
  originalSrc: string;
  /** The current source URL (might be empty string if unloaded) */
  currentSrc: string;
  /** Whether the iframe content is loaded */
  isLoaded: boolean;
}

/**
 * Interface for rendering an iframe
 */
export interface IframeRenderData {
  /** Unique identifier for the iframe */
  identifier: string;
  /** Original URL for data-src attribute */
  dataSrc: string;
  /** Current URL for src attribute */
  srcToRender: string;
  /** Whether the iframe content is loaded */
  isLoaded: boolean;
  /** Whether this is the active iframe */
  isActive: boolean;
}
