// TODO [Idle Timeout] When URL's idle timeout expires:
// 1. Clear iframe content by setting src=""
// 2. Update button state to remove loaded indicator (green dot)
// 3. Update state management to reflect unloaded status
// 4. Reset timer when URL becomes active again

/**
 * Represents the possible states of a URL menu item:
 * - active-loaded: Currently visible iframe with content (active button + green dot)
 * - active-unloaded: Currently visible iframe without content (active button, no dot)
 * - inactive-loaded: Hidden iframe with cached content (normal button + green dot)
 * - inactive-unloaded: Hidden iframe without content (normal button, no dot)
 */
type UrlMenuItemState = 'active-loaded' | 'active-unloaded' | 'inactive-loaded' | 'inactive-unloaded';

interface UrlMenuItemProps {
  /** The current state of the URL menu item */
  state: UrlMenuItemState;
  /** Whether this item is in a top menu (vs side menu) */
  isTopMenu?: boolean;
  /** Callback when the URL is clicked */
  onClick: () => void;
  /** Callback for long press action */
  onLongPress?: () => void;
  /** The URL object containing title, icon, etc */
  url: {
    id: string;
    title: string;
    url: string;
    iconPath?: string | null;
  };
}
