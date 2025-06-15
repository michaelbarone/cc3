/**
 * File path constants for the application
 *
 * These constants define the physical storage locations and API access paths
 * for uploaded files. Using these constants ensures consistency across the app.
 */

// Base paths
export const STORAGE_PATHS = {
  // Physical storage locations (where files are actually saved)
  PHYSICAL: {
    ICONS: "public/icons",
    AVATARS: "public/avatars",
    LOGOS: "public/logos",
    UPLOADS: "public/uploads",
    FAVICONS: "public/favicons",
  },

  // API paths for accessing the files (what's stored in the database)
  API: {
    ICONS: "/api/public/icons",
    AVATARS: "/api/public/avatars",
    LOGOS: "/api/public/logos",
    UPLOADS: "/api/public/uploads",
    FAVICONS: "/api/public/favicons",
  },

  // Legacy paths (for backward compatibility)
  LEGACY: {
    ICONS: "/icons",
    AVATARS: "/avatars",
    LOGOS: "/logos",
    UPLOADS: "/uploads",
    FAVICONS: "/favicons",
  },
};

/**
 * Converts a legacy path to an API path
 * @param path The legacy path (e.g., "/icons/icon-123.webp")
 * @returns The API path (e.g., "/api/public/icons/icon-123.webp")
 */
export function convertToApiPath(path: string): string {
  if (!path) return path;

  // Already an API path
  if (path.startsWith("/api/public/")) return path;

  // Convert legacy paths
  if (path.startsWith("/icons/")) {
    return path.replace("/icons/", "/api/public/icons/");
  } else if (path.startsWith("/avatars/")) {
    return path.replace("/avatars/", "/api/public/avatars/");
  } else if (path.startsWith("/logos/")) {
    return path.replace("/logos/", "/api/public/logos/");
  } else if (path.startsWith("/uploads/")) {
    return path.replace("/uploads/", "/api/public/uploads/");
  } else if (path.startsWith("/favicons/")) {
    return path.replace("/favicons/", "/api/public/favicons/");
  }

  return path;
}

/**
 * Gets the physical storage path for a file
 * @param apiPath The API path (e.g., "/api/public/icons/icon-123.webp")
 * @returns The physical path (e.g., "public/icons/icon-123.webp")
 */
export function getPhysicalPath(apiPath: string): string {
  if (!apiPath) return apiPath;

  // Extract the path after "/api/public/"
  const match = apiPath.match(/\/api\/public\/(.+)/);
  if (match && match[1]) {
    return `public/${match[1]}`;
  }

  // Handle legacy paths
  if (apiPath.startsWith("/icons/")) {
    return `public${apiPath}`;
  } else if (apiPath.startsWith("/avatars/")) {
    return `public${apiPath}`;
  } else if (apiPath.startsWith("/logos/")) {
    return `public${apiPath}`;
  } else if (apiPath.startsWith("/uploads/")) {
    return `public${apiPath}`;
  } else if (apiPath.startsWith("/favicons/")) {
    return `public${apiPath}`;
  }

  return apiPath;
}
