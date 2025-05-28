/**
 * Get user initials from username
 *
 * If the username contains a space, returns the first letter of the first two words.
 * Otherwise, returns the first letter of the username.
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name) return "?";

  const nameParts = name.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  const firstInitial = nameParts[0].charAt(0);
  const lastInitial = nameParts[nameParts.length - 1].charAt(0);

  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate a consistent color based on a username
 *
 * Uses a simple hash function to generate a color from a string,
 * ensuring the same username always gets the same color.
 */
export function generateAvatarColor(username: string): string {
  if (!username) return "#757575"; // Default gray color

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to RGB color
  const hue = Math.abs(hash % 360);

  // Use HSL color format with fixed saturation and lightness
  // Saturation at 75% and lightness at 60% to ensure good contrast with white text
  return `hsl(${hue}, 75%, 60%)`;
}
