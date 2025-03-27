import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { Url } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: {
    id: string;
    urlId: string;
  };
}

// POST - Reorder a URL within a group
export async function POST(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: urlGroupId, urlId } = props.params;
    const { direction } = await request.json();

    // Validate direction
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    // Get all URLs in the group ordered by displayOrder
    const urls = await prisma.url.findMany({
      where: { urlGroupId },
      orderBy: { displayOrder: "asc" },
    });

    // Find the current URL and its index
    const currentIndex = urls.findIndex((url: Url) => url.id === urlId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "URL not found in group" }, { status: 404 });
    }

    // Calculate target index
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    // Validate target index
    if (targetIndex < 0 || targetIndex >= urls.length) {
      return NextResponse.json({ error: "Cannot move URL further" }, { status: 400 });
    }

    // Swap display orders
    const currentUrl = urls[currentIndex];
    const targetUrl = urls[targetIndex];

    // Update both URLs in a transaction
    await prisma.$transaction([
      prisma.url.update({
        where: { id: currentUrl.id },
        data: { displayOrder: targetUrl.displayOrder },
      }),
      prisma.url.update({
        where: { id: targetUrl.id },
        data: { displayOrder: currentUrl.displayOrder },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
