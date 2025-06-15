import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

// for serving public assets from the public folder since nextjs doesn't support serving from the public folder

const publicFolder = path.resolve("public"); //   /app/public (on docker)  and  ./public (on local)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // Extract the path after "/api/public/"
    const filePath = url.pathname.replace("/api/public/", "");

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing file path", code: "MISSING_PATH" },
        { status: 404 },
      );
    }

    // Construct the full file path
    const fullPath = path.join(publicFolder, filePath);

    // Check if file exists
    try {
      const fileContent = await fs.readFile(fullPath);

      // Determine content type based on file extension
      const ext = path.extname(fullPath).toLowerCase();
      let contentType = "application/octet-stream"; // Default content type

      // Set appropriate content type based on file extension
      switch (ext) {
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".webp":
          contentType = "image/webp";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        case ".pdf":
          contentType = "application/pdf";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".txt":
          contentType = "text/plain";
          break;
        case ".css":
          contentType = "text/css";
          break;
        case ".js":
          contentType = "text/javascript";
          break;
        // Add more content types as needed
      }

      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        },
      });
    } catch (error) {
      console.error(`File not found: ${fullPath}`, error);
      const errorCode = error instanceof Error && "code" in error ? error.code : "UNKNOWN_ERROR";

      // Format the error response
      return NextResponse.json(
        {
          error: "File not found",
          code: errorCode,
          path: filePath,
          details: error instanceof Error ? error.message : String(error),
        },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );
    }
  } catch (err) {
    console.error("GET Public File | err: ", err);

    // Format the server error response
    return NextResponse.json(
      {
        error: "Server error processing file request",
        code: err instanceof Error && "code" in err ? err.code : "SERVER_ERROR",
        details: err instanceof Error ? err.message : String(err),
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  }
}
