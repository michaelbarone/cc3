import { prisma } from "@/app/lib/db/prisma";

async function testReorder() {
  try {
    // Create a test group
    const group = await prisma.urlGroup.create({
      data: {
        name: "Test Group",
        description: "Test group for reordering",
      },
    });

    // Create test URLs
    const url1 = await prisma.url.create({
      data: {
        title: "URL 1",
        url: "https://example1.com",
        idleTimeoutMinutes: 10,
      },
    });

    const url2 = await prisma.url.create({
      data: {
        title: "URL 2",
        url: "https://example2.com",
        idleTimeoutMinutes: 10,
      },
    });

    const url3 = await prisma.url.create({
      data: {
        title: "URL 3",
        url: "https://example3.com",
        idleTimeoutMinutes: 10,
      },
    });

    // Create relationships with display order
    await prisma.$executeRaw`
      INSERT INTO urls_in_groups (urlId, groupId, displayOrder, createdAt, updatedAt)
      VALUES
        (${url1.id}, ${group.id}, 0, datetime('now'), datetime('now')),
        (${url2.id}, ${group.id}, 1, datetime('now'), datetime('now')),
        (${url3.id}, ${group.id}, 2, datetime('now'), datetime('now'))
    `;

    console.log("Created test data");

    // Get initial order
    const initialOrder = await prisma.$queryRaw<
      Array<{ urlId: string; groupId: string; displayOrder: number; title: string }>
    >`
      SELECT uig.urlId, uig.groupId, uig.displayOrder, u.title
      FROM urls_in_groups uig
      JOIN Url u ON u.id = uig.urlId
      WHERE uig.groupId = ${group.id}
      ORDER BY uig.displayOrder ASC
    `;

    console.log(
      "Initial order:",
      initialOrder.map((u) => `${u.title} (${u.displayOrder})`),
    );

    // Test moving URL 2 up
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE urls_in_groups
        SET displayOrder = ${initialOrder[0].displayOrder}
        WHERE urlId = ${url2.id}
        AND groupId = ${group.id}
      `,
      prisma.$executeRaw`
        UPDATE urls_in_groups
        SET displayOrder = ${initialOrder[1].displayOrder}
        WHERE urlId = ${url1.id}
        AND groupId = ${group.id}
      `,
    ]);

    // Get new order
    const newOrder = await prisma.$queryRaw<
      Array<{ urlId: string; groupId: string; displayOrder: number; title: string }>
    >`
      SELECT uig.urlId, uig.groupId, uig.displayOrder, u.title
      FROM urls_in_groups uig
      JOIN Url u ON u.id = uig.urlId
      WHERE uig.groupId = ${group.id}
      ORDER BY uig.displayOrder ASC
    `;

    console.log(
      "New order after moving URL 2 up:",
      newOrder.map((u) => `${u.title} (${u.displayOrder})`),
    );

    // Clean up
    await prisma.urlGroup.delete({
      where: { id: group.id },
    });

    console.log("Test completed successfully");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testReorder().catch(console.error);
