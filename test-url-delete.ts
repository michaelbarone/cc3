import { DELETE } from "@/app/api/admin/urls/[id]/route";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";

async function main() {
  console.log("Starting URL deletion test...");

  try {
    // Create test icon file
    const iconContent = "test-icon-content";
    const iconPath = "/icons/test-icon.webp";
    const fullIconPath = path.join(process.cwd(), "public", iconPath);

    // Ensure icons directory exists
    await fs.mkdir(path.join(process.cwd(), "public/icons"), { recursive: true });
    await fs.writeFile(fullIconPath, iconContent);
    console.log("Created test icon file");

    // Create test URL groups
    const group1 = await prisma.urlGroup.create({
      data: {
        name: "Test Group 1",
        description: "Test group for deletion test",
      },
    });

    const group2 = await prisma.urlGroup.create({
      data: {
        name: "Test Group 2",
        description: "Second test group for deletion test",
      },
    });
    console.log("Created test groups");

    // Create test URLs
    const url1 = await prisma.url.create({
      data: {
        title: "Test URL 1",
        url: "https://example.com/1",
        iconPath,
      },
    });

    const url2 = await prisma.url.create({
      data: {
        title: "Test URL 2",
        url: "https://example.com/2",
      },
    });

    const url3 = await prisma.url.create({
      data: {
        title: "Test URL 3",
        url: "https://example.com/3",
      },
    });
    console.log("Created test URLs");

    // Add URLs to groups with specific orders
    await prisma.urlsInGroups.createMany({
      data: [
        { urlId: url1.id, groupId: group1.id, displayOrder: 0 },
        { urlId: url2.id, groupId: group1.id, displayOrder: 1 },
        { urlId: url3.id, groupId: group1.id, displayOrder: 2 },
        { urlId: url1.id, groupId: group2.id, displayOrder: 0 },
        { urlId: url2.id, groupId: group2.id, displayOrder: 1 },
      ],
    });
    console.log("Added URLs to groups");

    // Verify initial state
    console.log("\nInitial state:");
    await printGroupState(group1.id, "Group 1");
    await printGroupState(group2.id, "Group 2");

    // Delete URL1 (which has an icon and is in both groups)
    console.log("\nDeleting URL1...");

    // Create mock request for the DELETE endpoint
    const mockRequest = new NextRequest("http://localhost:3000/api/admin/urls/" + url1.id, {
      method: "DELETE",
    });

    const response = await DELETE(mockRequest, { params: { id: url1.id } }, true);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to delete URL: ${result.error}`);
    }
    console.log("Delete response:", result);

    // Verify icon was deleted
    try {
      await fs.access(fullIconPath);
      console.error("❌ Icon file still exists!");
    } catch {
      console.log("✓ Icon file was successfully deleted");
    }

    // Verify group orders were updated
    console.log("\nFinal state:");
    await printGroupState(group1.id, "Group 1");
    await printGroupState(group2.id, "Group 2");

    // Cleanup
    await prisma.urlGroup.deleteMany({
      where: { id: { in: [group1.id, group2.id] } },
    });
    console.log("\nTest cleanup completed");
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

async function printGroupState(groupId: string, groupName: string) {
  const urls = await prisma.urlsInGroups.findMany({
    where: { groupId },
    include: { url: true },
    orderBy: { displayOrder: "asc" },
  });

  console.log(`\n${groupName} URLs:`);
  urls.forEach(({ url, displayOrder }) => {
    console.log(`- ${url.title} (${displayOrder})`);
  });
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
