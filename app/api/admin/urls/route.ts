import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Get all URLs (admin only)
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

    // Get all URLs
    const urls = await prisma.url.findMany({
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Error fetching URLs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create a new URL (admin only)
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

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const {
      title,
      url,
      urlMobile,
      iconPath,
      idleTimeoutMinutes,
      isLocalhost,
      openInNewTab,
      port,
      path,
      localhostMobilePort,
      localhostMobilePath,
    } = requestData;

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // For localhost URLs, validate that either port or path is provided
    if (isLocalhost) {
      if (!port && !path) {
        return NextResponse.json(
          { error: "Either port or path is required for localhost URLs" },
          { status: 400 },
        );
      }

      // Validate path format if provided
      if (path && !path.startsWith("/")) {
        return NextResponse.json({ error: "Path must start with /" }, { status: 400 });
      }

      // Validate mobile path format if provided
      if (localhostMobilePath && !localhostMobilePath.startsWith("/")) {
        return NextResponse.json({ error: "Mobile path must start with /" }, { status: 400 });
      }
    } else {
      // For standard URLs, validate URL field
      if (!url || url.trim().length === 0) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }
    }

    // Create new URL
    const newUrl = await prisma.url.create({
      data: {
        title,
        url: url || "", // Always store the actual URL, even for localhost
        urlMobile: urlMobile || null,
        iconPath: iconPath || null,
        idleTimeoutMinutes: idleTimeoutMinutes ? Number(idleTimeoutMinutes) : 10,
        // @ts-ignore - These fields exist in our schema but TypeScript doesn't know about them yet
        isLocalhost: isLocalhost || false,
        // @ts-ignore - New field added to schema
        openInNewTab: openInNewTab || false,
        port: port || null,
        path: path || null,
        localhostMobilePort: localhostMobilePort || null,
        localhostMobilePath: localhostMobilePath || null,
      },
    });

    return NextResponse.json(newUrl, { status: 201 });
  } catch (error) {
    console.error("Error creating URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
