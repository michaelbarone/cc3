import { logoutUser } from "@/app/lib/auth/auth-service";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  try {
    logoutUser();
    const response = NextResponse.json({ success: true });
    response.cookies.delete("auth_token");
    return response;
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json({ success: true });
  }
}
