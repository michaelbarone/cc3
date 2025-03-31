import { prisma } from "@/app/lib/db/prisma";

async function testUrlCreation() {
  try {
    console.log("Testing URL creation...");

    // Create a test group
    const testGroup = await prisma.urlGroup.create({
      data: {
        name: "Test Group",
        description: "Testing URL creation",
      },
    });
    console.log("Created test group:", testGroup);

    // Create and connect URL - Method 1 (using urlGroup.create)
    const url1 = await prisma.url.create({
      data: {
        title: "Test URL 1",
        url: "https://example.com/1",
        idleTimeoutMinutes: 10,
        urlGroups: {
          create: {
            groupId: testGroup.id,
            displayOrder: 0,
          },
        },
      },
      include: {
        urlGroups: {
          include: {
            group: true,
          },
        },
      },
    });
    console.log("Created URL 1:", url1);

    // Create and connect URL - Method 2 (using urlGroup.create)
    const url2 = await prisma.url.create({
      data: {
        title: "Test URL 2",
        url: "https://example.com/2",
        idleTimeoutMinutes: 10,
        urlGroups: {
          create: {
            groupId: testGroup.id,
            displayOrder: 1,
          },
        },
      },
      include: {
        urlGroups: {
          include: {
            group: true,
          },
        },
      },
    });
    console.log("Created URL 2:", url2);

    // Verify the setup
    const verifySetup = await prisma.urlGroup.findFirst({
      where: { id: testGroup.id },
      include: {
        urls: {
          include: {
            url: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });
    console.log("Final verification:", JSON.stringify(verifySetup, null, 2));
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testUrlCreation();
