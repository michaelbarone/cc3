import { logoutUser } from "@/app/lib/auth/auth-service";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  try {
    logoutUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
