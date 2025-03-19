import { loginUser, registerUser } from "@/app/lib/auth/auth-service";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password, isAdmin = false } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Only allow admin creation if the request is from an admin user
    if (isAdmin) {
      const user = await verifyToken();
      if (!user?.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      // For non-admin registration, check if registration is enabled in app config
      const appConfig = await prisma.appConfig.findUnique({
        where: { id: "app-config" },
      });

      if (!appConfig?.registrationEnabled) {
        return NextResponse.json(
          { error: "User registration is currently disabled" },
          { status: 403 },
        );
      }
    }

    const result = await registerUser(username, password, isAdmin);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Automatically log in the user after registration (if not an admin creating another user)
    if (!isAdmin) {
      await loginUser(username, password);
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Registration route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
