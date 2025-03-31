import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface BatchOperation {
  type: "add" | "remove" | "reorder";
  urlId: string;
  displayOrder?: number;
}

export interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// POST - Batch operations for URLs in a group
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

    const { id } = await params;

    const { operation, urlIds } = await request.json();

    // Validate input
    if (!operation || !urlIds || !Array.isArray(urlIds) || urlIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid input. Operation and urlIds array required" },
        { status: 400 },
      );
    }

    // Validate operation type
    if (!["add", "remove", "reorder"].includes(operation)) {
      return NextResponse.json({ error: "Invalid operation type" }, { status: 400 });
    }

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: id },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Verify all URLs exist before proceeding
    const urls = await prisma.url.findMany({
      where: { id: { in: urlIds } },
    });

    if (urls.length !== urlIds.length) {
      return NextResponse.json({ error: "One or more URLs not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (operation === "add") {
        // Get current maximum display order
        const maxDisplayOrder = await tx.urlsInGroups.aggregate({
          where: { groupId: id },
          _max: { displayOrder: true },
        });

        let displayOrder = (maxDisplayOrder._max?.displayOrder || -1) + 1;

        // Add URLs to group
        await Promise.all(
          urlIds.map(async (urlId: string) => {
            // Check if URL is already in group
            const existingUrlInGroup = await tx.urlsInGroups.findUnique({
              where: {
                urlId_groupId: {
                  urlId,
                  groupId: id,
                },
              },
            });

            if (!existingUrlInGroup) {
              return tx.urlsInGroups.create({
                data: {
                  urlId,
                  groupId: id,
                  displayOrder: displayOrder++,
                },
              });
            }
            return null;
          }),
        );
      } else if (operation === "remove") {
        // Remove URLs from group
        await tx.urlsInGroups.deleteMany({
          where: {
            urlId: { in: urlIds },
            groupId: id,
          },
        });

        // Reorder remaining URLs
        const remainingUrls = await tx.urlsInGroups.findMany({
          where: { groupId: id },
          orderBy: { displayOrder: "asc" },
        });

        await Promise.all(
          remainingUrls.map((url, index) =>
            tx.urlsInGroups.update({
              where: {
                urlId_groupId: {
                  urlId: url.urlId,
                  groupId: id,
                },
              },
              data: { displayOrder: index },
            }),
          ),
        );
      } else if (operation === "reorder") {
        // Validate all URLs are in the group
        const existingUrls = await tx.urlsInGroups.findMany({
          where: {
            groupId: id,
            urlId: { in: urlIds },
          },
        });

        if (existingUrls.length !== urlIds.length) {
          throw new Error("One or more URLs are not in this group");
        }

        // Reorder URLs
        await Promise.all(
          urlIds.map((urlId, index) =>
            tx.urlsInGroups.update({
              where: {
                urlId_groupId: {
                  urlId,
                  groupId: id,
                },
              },
              data: { displayOrder: index },
            }),
          ),
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in batch operation:", error);
    if (error instanceof Error && error.message === "One or more URLs are not in this group") {
      return NextResponse.json(
        { error: "One or more URLs are not in this group" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
