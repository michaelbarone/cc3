import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Create and connect URL - Method 1 (using urlGroupId)
    const url1 = await prisma.url.create({
      data: {
        title: "Test URL 1",
        url: "https://example.com/1",
        displayOrder: 0,
        idleTimeoutMinutes: 10,
        urlGroupId: testGroup.id,
      },
      include: {
        urlGroup: true,
      },
    });
    console.log("Created URL 1:", url1);

    // Create and connect URL - Method 2 (using connect)
    const url2 = await prisma.url.create({
      data: {
        title: "Test URL 2",
        url: "https://example.com/2",
        displayOrder: 1,
        idleTimeoutMinutes: 10,
        urlGroup: {
          connect: {
            id: testGroup.id,
          },
        },
      },
      include: {
        urlGroup: true,
      },
    });
    console.log("Created URL 2:", url2);

    // Verify the setup
    const verifySetup = await prisma.urlGroup.findFirst({
      where: { id: testGroup.id },
      include: {
        urls: true,
      },
    });
    console.log("Final verification:", JSON.stringify(verifySetup, null, 2));
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testUrlCreation();
