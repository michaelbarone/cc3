import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/auth/jwt";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

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
    const urlGroups = await prisma.urlGroup.findMany({
      include: {
        urls: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(urlGroups);
  } catch (error) {
    console.error("Error fetching URL groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
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
  } finally {
    await prisma.$disconnect();
  }
}
