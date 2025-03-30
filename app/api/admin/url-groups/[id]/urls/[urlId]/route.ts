import { verifyToken } from "@/app/lib/auth/jwt";
import { db } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: {
    id: string;
    urlId: string;
  };
}

interface UrlInGroup {
  urlId: string;
  groupId: string;
  displayOrder: number;
}

// PATCH - Update a URL in a group
export async function PATCH(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const isAdmin = await verifyToken(request);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, urlId } = props.params;
    const { displayOrder } = await request.json();

    // Check if the URL exists in the group
    const existingUrl = await db.urlsInGroups.findUnique({
      where: {
        urlId_groupId: {
          urlId,
          groupId,
        },
      },
    });

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found in group" }, { status: 404 });
    }

    // Validate input
    if (typeof displayOrder !== "number" || displayOrder < 0) {
      return NextResponse.json({ error: "Invalid display order" }, { status: 400 });
    }

    // Update URL position in a transaction
    await db.$transaction(async (tx) => {
      // Get all URLs in the group
      const urls = await tx.urlsInGroups.findMany({
        where: { groupId },
        orderBy: { displayOrder: "asc" },
      });

      // Remove the URL being updated from the list
      const otherUrls = urls.filter((url: { urlId: string }) => url.urlId !== urlId);

      // Insert the URL at the new position
      const updatedUrls: UrlInGroup[] = [];
      let currentOrder = 0;

      for (const url of otherUrls) {
        if (currentOrder === displayOrder) {
          currentOrder++;
        }
        updatedUrls.push({
          urlId: url.urlId,
          groupId,
          displayOrder: currentOrder,
        });
        currentOrder++;
      }

      // Add the updated URL at its new position
      updatedUrls.splice(displayOrder, 0, {
        urlId,
        groupId,
        displayOrder,
      });

      // Update all URLs with their new positions
      for (const url of updatedUrls) {
        await tx.urlsInGroups.update({
          where: {
            urlId_groupId: {
              urlId: url.urlId,
              groupId,
            },
          },
          data: {
            displayOrder: url.displayOrder,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URL position:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove a URL from a group
export async function DELETE(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const isAdmin = await verifyToken(request);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, urlId } = props.params;

    // Check if the URL exists in the group
    const existingUrl = await db.urlsInGroups.findUnique({
      where: {
        urlId_groupId: {
          urlId,
          groupId,
        },
      },
    });

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found in group" }, { status: 404 });
    }

    // Delete URL and reorder remaining URLs in a transaction
    await db.$transaction(async (tx) => {
      // Delete the URL from the group
      await tx.urlsInGroups.delete({
        where: {
          urlId_groupId: {
            urlId,
            groupId,
          },
        },
      });

      // Get remaining URLs in the group
      const remainingUrls = await tx.urlsInGroups.findMany({
        where: { groupId },
        orderBy: { displayOrder: "asc" },
      });

      // Update display order for remaining URLs
      for (let i = 0; i < remainingUrls.length; i++) {
        await tx.urlsInGroups.update({
          where: {
            urlId_groupId: {
              urlId: remainingUrls[i].urlId,
              groupId,
            },
          },
          data: {
            displayOrder: i,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing URL from group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update URL properties within a group
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const isAdmin = await verifyToken(request);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, urlId } = props.params;
    const { title, url, urlMobile, iconPath, idleTimeoutMinutes } = await request.json();

    // Check if the URL exists in the group
    const existingUrlInGroup = await db.urlsInGroups.findUnique({
      where: {
        urlId_groupId: {
          urlId,
          groupId,
        },
      },
      include: {
        url: true,
      },
    });

    if (!existingUrlInGroup) {
      return NextResponse.json({ error: "URL not found in group" }, { status: 404 });
    }

    // Validate required fields
    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    // Update URL properties in a transaction
    const updatedUrl = await db.$transaction(async (tx) => {
      // Update the URL properties
      const result = await tx.url.update({
        where: { id: urlId },
        data: {
          title,
          url,
          urlMobile: urlMobile || null,
          iconPath: iconPath || null,
          idleTimeoutMinutes: idleTimeoutMinutes || null,
        },
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      url: updatedUrl,
    });
  } catch (error) {
    console.error("Error updating URL properties:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
