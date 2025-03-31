import { logoutUser } from "@/app/lib/auth/auth-service";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock the auth service
vi.mock("@/app/lib/auth/auth-service", () => ({
  logoutUser: vi.fn(),
}));

describe("API: /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should successfully log out a user", async () => {
      const response = await POST();
      const data = await response.json();

      // Verify the response
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);

      // Verify auth service was called
      expect(logoutUser).toHaveBeenCalledTimes(1);

      // Verify cookie deletion
      const cookies = response.headers.get("Set-Cookie");
      expect(cookies).toContain("auth_token=;");
      expect(cookies).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    it("should return success even if logout service throws an error", async () => {
      // Mock the logout service to throw an error
      vi.mocked(logoutUser).mockImplementationOnce(() => {
        throw new Error("Logout service error");
      });

      const response = await POST();
      const data = await response.json();

      // Verify the response is still successful
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);

      // Verify auth service was called
      expect(logoutUser).toHaveBeenCalledTimes(1);
    });
  });
});
