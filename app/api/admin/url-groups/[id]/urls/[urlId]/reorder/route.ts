import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface RouteContext {
  params: Promise<{
    id: string;
    urlId: string;
  }>;
}

interface UrlInGroup {
  urlId: string;
  groupId: string;
  displayOrder: number;
  url: {
    id: string;
    title: string;
    url: string;
  };
}

// POST - Reorder a URL within a group
export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken(token);

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId, urlId } = await params;
    const { direction } = await request.json();

    // Validate direction
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    const currentOrder = await prisma.$queryRaw<{ displayOrder: number }[]>`
      SELECT displayOrder
      FROM urls_in_groups
      WHERE urlId = ${urlId}
      AND groupId = ${groupId}
    `;

    // Get the URLs to swap with
    const swapOrder = await prisma.$queryRaw<{ urlId: string; displayOrder: number }[]>`
      SELECT urlId, displayOrder
      FROM urls_in_groups
      WHERE groupId = ${groupId}
      AND displayOrder ${direction === "up" ? "<" : ">"} ${currentOrder[0].displayOrder}
      ORDER BY displayOrder ${direction === "up" ? "DESC" : "ASC"}
      LIMIT 1
    `;

    if (swapOrder.length === 0) {
      return NextResponse.json({ message: "No URLs to swap with" });
    }

    // Perform the swap
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE urls_in_groups
        SET displayOrder = ${swapOrder[0].displayOrder}
        WHERE urlId = ${urlId}
        AND groupId = ${groupId}
      `,
      prisma.$executeRaw`
        UPDATE urls_in_groups
        SET displayOrder = ${currentOrder[0].displayOrder}
        WHERE urlId = ${swapOrder[0].urlId}
        AND groupId = ${groupId}
      `,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
