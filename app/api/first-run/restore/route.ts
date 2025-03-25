import { prisma } from "@/app/lib/db/prisma";
import { restoreBackup } from "@/lib/archive";
import { mkdir, unlink, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

// We can't use the Route Handler API's bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

// Common headers for JSON responses
const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// POST /api/first-run/restore - Restore from backup during first run
export async function POST(request: NextRequest) {
  try {
    console.log("Starting first-run restore process...");

    // Check if we're in first run state (exactly one admin user who has never logged in)
    const users = await prisma.user.findMany({
      where: {
        isAdmin: true,
      },
      select: {
        id: true,
        lastLoginAt: true,
      },
    });

    console.log("Found admin users:", users);
    const isFirstRun = users.length === 1 && !users[0].lastLoginAt;
    console.log("Is first run?", isFirstRun);

    if (!isFirstRun) {
      return NextResponse.json(
        { error: "Restore is only available during first run" },
        { status: 403, headers: JSON_HEADERS },
      );
    }

    try {
      // Process file upload
      console.log("Processing file upload...");
      const formData = await request.formData();
      const file = formData.get("backup") as File | null;

      if (!file) {
        console.error("No backup file provided");
        return NextResponse.json(
          { error: "No backup file provided" },
          { status: 400, headers: JSON_HEADERS },
        );
      }

      if (!file.name.endsWith(".zip")) {
        console.error("Invalid file type");
        return NextResponse.json(
          { error: "Invalid file type. Please upload a .zip file" },
          { status: 400, headers: JSON_HEADERS },
        );
      }

      console.log("Received file:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Convert File to Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save the uploaded file to a temporary location
      const tempDir = join(process.cwd(), "temp");
      const tempFile = join(tempDir, `restore-${Date.now()}.zip`);

      console.log("Saving to temporary location:", tempFile);

      // Ensure temp directory exists
      await mkdir(tempDir, { recursive: true });

      // Write the file
      await writeFile(tempFile, buffer);
      console.log("File saved successfully");

      try {
        // Restore from the backup
        console.log("Starting restore process...");
        await restoreBackup(tempFile);
        console.log("Restore completed successfully");
        return NextResponse.json({ success: true }, { headers: JSON_HEADERS });
      } finally {
        // Clean up temp file
        console.log("Cleaning up temporary file...");
        await unlink(tempFile).catch((error) => {
          console.error("Error cleaning up temp file:", error);
        });
      }
    } catch (formError) {
      console.error("Form processing error:", formError);
      return NextResponse.json(
        { error: formError instanceof Error ? formError.message : "Error processing form data" },
        { status: 400, headers: JSON_HEADERS },
      );
    }
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error restoring backup" },
      { status: 500, headers: JSON_HEADERS },
    );
  }
}
