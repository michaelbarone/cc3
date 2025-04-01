import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{ id: string }>;
};

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// GET - Fetch URL groups for a specific user
export async function GET(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;

    // Get all URL groups assigned to the user
    const userUrlGroups = await prisma.userUrlGroup.findMany({
      where: { userId: id },
      include: {
        urlGroup: true,
      },
    });

    // Extract just the URL group information
    const urlGroups = userUrlGroups.map((ug: { urlGroup: UrlGroup }) => ug.urlGroup);

    return NextResponse.json(urlGroups);
  } catch (error) {
    console.error("Error fetching user URL groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update URL groups for a specific user
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;
    const { urlGroupIds } = await request.json();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update URL group assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove all existing assignments
      await tx.userUrlGroup.deleteMany({
        where: { userId: id },
      });

      // Create new assignments
      if (urlGroupIds && urlGroupIds.length > 0) {
        await tx.userUrlGroup.createMany({
          data: urlGroupIds.map((groupId: string) => ({
            userId: id,
            urlGroupId: groupId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user URL groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
