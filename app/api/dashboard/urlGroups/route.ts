import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's accessible groups through UserGroupAccess
    // Include all URLs in each group with proper sorting
    const userGroups = await prisma.userGroupAccess.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            urlsInGroup: {
              orderBy: { displayOrderInGroup: "asc" },
              include: {
                url: true,
              },
            },
          },
        },
      },
    });

    // Transform data to return a cleaner structure with effective titles
    const formattedGroups = userGroups.map((access) => {
      const group = access.group;

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        displayOrder: group.displayOrder,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        urls: group.urlsInGroup.map((urlInGroup) => {
          const url = urlInGroup.url;

          return {
            id: urlInGroup.id,
            urlId: url.id,
            // Use group-specific title if available, otherwise use global title
            title: urlInGroup.groupSpecificTitle || url.title,
            url: url.url,
            faviconUrl: url.faviconUrl,
            mobileSpecificUrl: url.mobileSpecificUrl,
            displayOrderInGroup: urlInGroup.displayOrderInGroup,
            createdAt: urlInGroup.createdAt.toISOString(),
            updatedAt: urlInGroup.updatedAt.toISOString(),
          };
        }),
      };
    });

    // Sort groups by displayOrder then name
    formattedGroups.sort((a, b) => {
      // Sort by displayOrder (null values last)
      if (a.displayOrder !== null && b.displayOrder !== null) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== null) return -1;
      if (b.displayOrder !== null) return 1;

      // If displayOrder is same or both null, sort by name
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(formattedGroups);
  } catch (error) {
    console.error("Error fetching user's accessible groups and URLs:", error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
