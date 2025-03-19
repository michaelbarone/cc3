import { loginUser } from "@/app/lib/auth/auth-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const result = await loginUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, requiresPassword: result.requiresPassword },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
