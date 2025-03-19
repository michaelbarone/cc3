import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET - Fetch a specific URL group with its URLs
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await context.params;

    // Get the URL group with its URLs
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id },
      include: {
        urls: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!urlGroup) {
      return new Response(JSON.stringify({ error: "URL group not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(urlGroup), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching URL group:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUT - Update a URL group
export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await context.params;

    // Check if URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!existingUrlGroup) {
      return new Response(JSON.stringify({ error: "URL group not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { name, description } = await request.json();

    // Validate input
    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Group name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update URL group
    const updatedUrlGroup = await prisma.urlGroup.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    return new Response(JSON.stringify(updatedUrlGroup), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating URL group:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// DELETE - Remove a URL group and all associated URLs
export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await context.params;

    // Check if URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!existingUrlGroup) {
      return new Response(JSON.stringify({ error: "URL group not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete URL group (will cascade delete URLs and user mappings due to schema)
    await prisma.urlGroup.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting URL group:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
