import { verifyToken } from "@/app/lib/auth/jwt";
import { createBackup, restoreBackup, validateArchive } from "@/lib/archive";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// We can't use the Route Handler API's bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET /api/admin/backup - Download a backup
export async function GET() {
  try {
    // Verify the user is authenticated and is an admin
    const tokenPayload = await verifyToken();
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin permissions
    if (!tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    // Create the backup
    const backupFile = await createBackup();

    // Stream the file back to the client
    const fileStream = await fs.readFile(backupFile);
    const filename = path.basename(backupFile);

    // Clean up the backup file after sending
    await fs.unlink(backupFile);

    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json({ error: "Error creating backup" }, { status: 500 });
  }
}

// POST /api/admin/backup - Restore from a backup
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const tokenPayload = await verifyToken();
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin permissions
    if (!tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    // Process file upload
    const formData = await request.formData();
    const backupFile = formData.get("backup") as File | null;

    if (!backupFile || !(backupFile instanceof File)) {
      return NextResponse.json({ error: "No backup file provided" }, { status: 400 });
    }

    // Create temp directory for processing
    const tempDir = path.join(process.cwd(), "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // Save uploaded file to temp directory
    const tempFile = path.join(tempDir, `upload-${Date.now()}.zip`);
    const buffer = Buffer.from(await backupFile.arrayBuffer());
    await fs.writeFile(tempFile, buffer);

    // Validate the backup file
    const isValid = await validateArchive(tempFile);
    if (!isValid) {
      await fs.unlink(tempFile);
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    const rollbackFile = await createBackup();

    try {
      // Restore from the backup
      await restoreBackup(tempFile);

      // Clean up temp file
      await fs.unlink(tempFile);

      return NextResponse.json({
        message: "Backup restored successfully",
        rollbackFile: path.basename(rollbackFile),
      });
    } catch (error) {
      console.error("Error restoring backup:", error);

      // Attempt rollback
      try {
        await restoreBackup(rollbackFile);
        return NextResponse.json(
          { error: "Restore failed, rolled back to previous state" },
          { status: 500 },
        );
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
        return NextResponse.json(
          { error: "Restore and rollback failed. Manual intervention required." },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    console.error("Error processing backup:", error);
    return NextResponse.json({ error: "Error processing backup" }, { status: 500 });
  }
}
