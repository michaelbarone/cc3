import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{ id: string; urlGroupId: string }>;
};

// GET - Check if a user has a specific URL group assigned
export async function GET(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, urlGroupId } = await props.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Check if the user is assigned to the URL group
    const userUrlGroup = await prisma.userUrlGroup.findUnique({
      where: {
        userId_urlGroupId: {
          userId: id,
          urlGroupId,
        },
      },
    });

    return NextResponse.json({
      assigned: !!userUrlGroup,
    });
  } catch (error) {
    console.error("Error checking user URL group assignment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Assign a URL group to a user
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, urlGroupId } = await props.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Create user-URL group mapping
    await prisma.userUrlGroup.create({
      data: {
        userId: id,
        urlGroupId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Check for unique constraint violation
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "User is already assigned to this URL group" },
        { status: 409 },
      );
    }
    console.error("Error assigning URL group to user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove a URL group from a user
export async function DELETE(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, urlGroupId } = await props.params;

    // Check if the mapping exists
    const mapping = await prisma.userUrlGroup.findFirst({
      where: {
        userId: id,
        urlGroupId,
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: "User is not assigned to this URL group" },
        { status: 404 },
      );
    }

    // Delete the mapping
    await prisma.userUrlGroup.delete({
      where: {
        userId_urlGroupId: {
          userId: id,
          urlGroupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing URL group from user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
