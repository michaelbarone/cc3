import { prisma } from "@/lib/db/prisma";
import { deleteFavicon, deleteLogo } from "@/lib/services/brandingService";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for delete request
const DeleteRequestSchema = z.object({
  type: z.enum(["logo", "favicon"]),
});

/**
 * DELETE /api/admin/branding/delete
 *
 * Delete a branding image (logo or favicon)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Check if the user is an admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const validationResult = DeleteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const { type } = validationResult.data;

    // Process the request based on type
    if (type === "logo") {
      await deleteLogo();

      // Update the logoPath in SystemSetting to null
      await prisma.systemSetting.upsert({
        where: { key: "logoPath" },
        update: { value: "" },
        create: {
          key: "logoPath",
          value: "",
        },
      });

      return NextResponse.json({ message: "Logo deleted successfully" }, { status: 200 });
    } else if (type === "favicon") {
      await deleteFavicon();

      // Update the faviconPath in SystemSetting to null
      await prisma.systemSetting.upsert({
        where: { key: "faviconPath" },
        update: { value: "" },
        create: {
          key: "faviconPath",
          value: "",
        },
      });

      return NextResponse.json({ message: "Favicon deleted successfully" }, { status: 200 });
    }

    return NextResponse.json({ message: "Invalid branding type" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting branding image:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting the image" },
      { status: 500 },
    );
  }
}
