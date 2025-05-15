import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface UrlInGroup {
  url: {
    id: string;
    title: string;
    url: string;
    iconPath: string | null;
    idleTimeoutMinutes: number | null;
    urlMobile: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  displayOrder: number;
}

interface UrlGroupWithUrls {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  urlCount: number;
  urls: UrlInGroup[];
}

// Helper function to convert BigInt values to numbers
function convertBigIntToNumber(value: unknown): any {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(convertBigIntToNumber);
  }
  if (typeof value === "object" && value !== null) {
    const result: { [key: string]: any } = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertBigIntToNumber(val);
    }
    return result;
  }
  return value;
}

// Get all URL groups (admin only)
export async function GET() {
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

    // Get all URL groups with their URLs
    const groups = await prisma.urlGroup.findMany({
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
      orderBy: {
        name: "asc",
      },
    });

    // Transform the data to match the expected format
    const transformedGroups: UrlGroupWithUrls[] = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      urlCount: group.urls.length,
      urls: group.urls.map((uig) => ({
        url: {
          id: uig.url.id,
          title: uig.url.title,
          url: uig.url.url,
          urlMobile: uig.url.urlMobile,
          iconPath: uig.url.iconPath,
          idleTimeoutMinutes: uig.url.idleTimeoutMinutes,
          createdAt: uig.url.createdAt,
          updatedAt: uig.url.updatedAt,
        },
        displayOrder: uig.displayOrder,
      })),
    }));

    // Return the array directly for consistency with other endpoints
    return NextResponse.json(transformedGroups);
  } catch (error) {
    console.error("Error fetching URL groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create a new URL group (admin only)
export async function POST(request: Request) {
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

    // Parse request body
    const { name, description } = await request.json();

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Create new URL group
    const newUrlGroup = await prisma.urlGroup.create({
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(newUrlGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating URL group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
