import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { urlId } = await request.json();

    if (!urlId) {
      return NextResponse.json({ error: "URL ID is required" }, { status: 400 });
    }

    // Check if the URL exists
    const url = await prisma.url.findUnique({
      where: { id: urlId },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Update the user's last active URL
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveUrl: urlId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating last active URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
