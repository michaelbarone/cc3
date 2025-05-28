import { prisma } from "@/lib/db/prisma";
import { createAvatar, deleteAvatar } from "@/lib/services/avatarService";
import { Fields, Files, formidable } from "formidable";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { IncomingMessage } from "http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { Readable } from "stream";

// Disable Next.js body parsing for form data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to convert NextRequest to Node's IncomingMessage for formidable
function requestToFormidableStream(req: NextRequest): IncomingMessage {
  const duplex = new ReadableStream({
    start(controller) {
      req.arrayBuffer().then((buffer) => {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      });
    },
  });

  const readable = Readable.fromWeb(duplex as any);
  const message = Object.assign(readable, {
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url,
    method: req.method,
  });

  return message as IncomingMessage;
}

export async function POST(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Ensure avatars directory exists
    const avatarsDir = join(process.cwd(), "public", "avatars");
    if (!existsSync(avatarsDir)) {
      await mkdir(avatarsDir, { recursive: true });
    }

    // Parse the form data
    const message = requestToFormidableStream(req);
    const { fields, files } = await new Promise<{ fields: Fields; files: Files }>(
      (resolve, reject) => {
        const form = formidable({
          maxFiles: 1,
          maxFileSize: 1024 * 1024, // 1MB
          allowEmptyFiles: false,
          filter: (part) => {
            return (
              part.mimetype === "image/jpeg" ||
              part.mimetype === "image/png" ||
              part.mimetype === "image/gif"
            );
          },
        });

        form.parse(message, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ fields, files });
        });
      },
    );

    const avatar = files.avatar?.[0];

    if (!avatar) {
      return NextResponse.json({ message: "No avatar file provided" }, { status: 400 });
    }

    // Process and save the avatar
    const { avatarUrl } = await createAvatar(session.user.id, avatar);

    // Update user in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    return NextResponse.json(
      { message: "Avatar uploaded successfully", avatarUrl },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { message: "An error occurred while uploading avatar" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Get current user with avatar URL
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return NextResponse.json({ message: "No avatar to delete" }, { status: 400 });
    }

    // Delete the avatar file
    await deleteAvatar(session.user.id);

    // Update user in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ message: "Avatar deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting avatar" },
      { status: 500 },
    );
  }
}
