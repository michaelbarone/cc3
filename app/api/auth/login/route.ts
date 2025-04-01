import { loginUser } from "@/app/lib/auth/auth-service";
import { checkRateLimit } from "@/app/lib/auth/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many login attempts",
          resetTime: rateLimit.resetTime,
          remainingAttempts: rateLimit.remainingAttempts,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": rateLimit.remainingAttempts.toString(),
            "X-RateLimit-Reset": rateLimit.resetTime.getTime().toString(),
          },
        },
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const result = await loginUser(username, password);

    if (!result.success) {
      // Handle different error cases with appropriate status codes
      if (result.message === "User not found") {
        return NextResponse.json({ error: result.message }, { status: 404 });
      }

      if (result.requiresPassword) {
        return NextResponse.json(
          {
            error: result.message,
            requiresPassword: true,
            remainingAttempts: rateLimit.remainingAttempts,
          },
          {
            status: 401,
            headers: {
              "X-RateLimit-Limit": "5",
              "X-RateLimit-Remaining": rateLimit.remainingAttempts.toString(),
              "X-RateLimit-Reset": rateLimit.resetTime.getTime().toString(),
            },
          },
        );
      }

      return NextResponse.json(
        {
          error: result.message,
          remainingAttempts: rateLimit.remainingAttempts,
        },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": rateLimit.remainingAttempts.toString(),
            "X-RateLimit-Reset": rateLimit.resetTime.getTime().toString(),
          },
        },
      );
    }

    // Create response with success and set cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Set the auth cookie
    if (result.token) {
      response.cookies.set({
        name: "auth_token",
        value: result.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
