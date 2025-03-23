import { logoutUser } from "@/app/lib/auth/auth-service";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  try {
    // Call the logout service
    logoutUser();

    // Create response with success and remove cookie
    const response = NextResponse.json({ success: true });

    // Set the auth cookie to expire immediately
    response.cookies.set({
      name: "auth_token",
      value: "",
      expires: new Date(0),
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
