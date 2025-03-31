import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userData = await verifyToken();

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get counts from database
    const [totalUsers, totalUrlGroups, totalUrls] = await Promise.all([
      prisma.user.count(),
      prisma.urlGroup.count(),
      prisma.url.count(),
    ]);

    return NextResponse.json({
      totalUsers,
      totalUrlGroups,
      totalUrls,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
