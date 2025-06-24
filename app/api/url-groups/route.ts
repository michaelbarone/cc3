import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

// Define a type for a URL
interface Url {
  id: string;
  title: string;
  url: string;
  urlMobile: string | null;
  iconPath: string | null;
  idleTimeoutMinutes: number | null;
  displayOrder: number;
  isLocalhost: boolean;
  openInNewTab: boolean;
  port: string | null;
  path: string | null;
  localhostMobilePath: string | null;
  localhostMobilePort: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define a type for a URL group
interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  urls: Url[];
}

// Define the actual shape of data coming from Prisma
interface UserUrlGroupItem {
  urlGroup: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    urls: {
      url: {
        id: string;
        title: string;
        url: string;
        urlMobile: string | null;
        iconPath: string | null;
        idleTimeoutMinutes: number | null;
        // These fields might be missing in the Prisma output but we handle them in the map function
        isLocalhost?: boolean;
        openInNewTab?: boolean;
        port?: string | null;
        path?: string | null;
        localhostMobilePath?: string | null;
        localhostMobilePort?: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      displayOrder: number;
      // Additional fields from the join table that might be present
      urlId?: string;
      groupId?: string;
    }[];
  };
}

export async function GET() {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all URL groups assigned to the user with their URLs
    const userUrlGroups = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        userUrlGroups: {
          select: {
            urlGroup: {
              include: {
                urls: {
                  include: {
                    url: true,
                  },
                  orderBy: {
                    displayOrder: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userUrlGroups) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Transform the data to match the expected format
    const urlGroups = userUrlGroups.userUrlGroups.map((item: UserUrlGroupItem) => {
      const { urlGroup } = item;
      return {
        id: urlGroup.id,
        name: urlGroup.name,
        description: urlGroup.description,
        createdAt: urlGroup.createdAt,
        updatedAt: urlGroup.updatedAt,
        urls: urlGroup.urls.map((urlInGroup: UserUrlGroupItem["urlGroup"]["urls"][number]) => ({
          id: urlInGroup.url.id,
          title: urlInGroup.url.title,
          url: urlInGroup.url.url,
          urlMobile: urlInGroup.url.urlMobile,
          iconPath: urlInGroup.url.iconPath,
          idleTimeoutMinutes: urlInGroup.url.idleTimeoutMinutes,
          displayOrder: urlInGroup.displayOrder,
          isLocalhost: urlInGroup.url.isLocalhost || false,
          openInNewTab: urlInGroup.url.openInNewTab || false,
          port: urlInGroup.url.port || null,
          path: urlInGroup.url.path || null,
          localhostMobilePath: urlInGroup.url.localhostMobilePath || null,
          localhostMobilePort: urlInGroup.url.localhostMobilePort || null,
          createdAt: urlInGroup.url.createdAt,
          updatedAt: urlInGroup.url.updatedAt,
        })),
      };
    });

    return NextResponse.json({ urlGroups });
  } catch (error) {
    console.error("Error fetching URL groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
