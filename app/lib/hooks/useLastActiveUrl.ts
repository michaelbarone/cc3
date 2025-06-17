import { useAuth } from "@/app/lib/auth/auth-context";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook for managing the user's last active URL
 *
 * Fetches the last active URL from the user's profile and provides
 * a function to update it when the user selects a new URL.
 */
export function useLastActiveUrl() {
  const { user } = useAuth();
  const [lastActiveUrl, setLastActiveUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's last active URL
  useEffect(() => {
    const fetchLastActiveUrl = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        // The API returns the user object inside a 'user' property
        const userData = data.user || {};
        setLastActiveUrl(userData.lastActiveUrl || null);
      } catch (err) {
        console.error("Error fetching last active URL:", err);
        setError("Failed to fetch last active URL");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastActiveUrl();
  }, [user]);

  // Update the user's last active URL
  const updateLastActiveUrl = useCallback(
    async (urlId: string) => {
      if (!user) return;

      try {
        const response = await fetch("/api/users/last-active-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ urlId }),
        });

        if (!response.ok) {
          throw new Error("Failed to update last active URL");
        }

        setLastActiveUrl(urlId);
      } catch (err) {
        console.error("Error updating last active URL:", err);
        setError("Failed to update last active URL");
      }
    },
    [user],
  );

  return {
    lastActiveUrl,
    updateLastActiveUrl,
    isLoading,
    error,
  };
}
