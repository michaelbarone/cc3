import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: { id: string };
};

interface UrlInGroup {
  id: string;
  title: string;
  url: string;
  iconPath: string | null;
  idleTimeoutMinutes: number | null;
  displayOrder: number;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  urls: UrlInGroup[];
}

// GET - Fetch a specific URL group with its URLs
export async function GET(request: NextRequest, props: Props): Promise<NextResponse> {
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

    const { id } = props.params;

    // First get the URL group
    const urlGroup = await prisma.$queryRaw<UrlGroup[]>`
      SELECT
        g.id,
        g.name,
        g.description,
        g.createdAt,
        g.updatedAt,
        JSON_GROUP_ARRAY(
          JSON_OBJECT(
            'id', u.id,
            'title', u.title,
            'url', u.url,
            'iconPath', u.iconPath,
            'idleTimeoutMinutes', u.idleTimeoutMinutes,
            'displayOrder', uig.displayOrder
          )
        ) as urls
      FROM UrlGroup g
      LEFT JOIN urls_in_groups uig ON g.id = uig.groupId
      LEFT JOIN Url u ON uig.urlId = u.id
      WHERE g.id = ${id}
      GROUP BY g.id
    `;

    if (urlGroup.length === 0) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Combine the results
    const response: UrlGroup = {
      ...urlGroup[0],
      urls: urlGroup[0].urls,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching URL group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update a URL group
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
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

    const { id } = props.params;

    // Check if URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!existingUrlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Parse request body
    const { name, description } = await request.json();

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Update URL group
    const updatedUrlGroup = await prisma.urlGroup.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(updatedUrlGroup);
  } catch (error) {
    console.error("Error updating URL group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove a URL group and all associated URLs
export async function DELETE(request: NextRequest, props: Props): Promise<NextResponse> {
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

    const { id } = props.params;

    // Check if URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!existingUrlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Delete URL group (will cascade delete URLs and user mappings due to schema)
    await prisma.urlGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting URL group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
