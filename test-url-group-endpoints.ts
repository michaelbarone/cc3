import { DELETE, GET } from "@/app/api/admin/url-groups/[id]/urls/route";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";

async function main() {
  console.log("Starting URL group endpoints test...");

  try {
    // Create test URL group
    const group = await prisma.urlGroup.create({
      data: {
        name: "Test Group",
        description: "Test group for endpoints test",
      },
    });
    console.log("Created test group");

    // Create test URLs
    const url1 = await prisma.url.create({
      data: {
        title: "Test URL 1",
        url: "https://example.com/1",
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

    // Add URLs to group with specific orders
    await prisma.urlsInGroups.createMany({
      data: [
        { urlId: url1.id, groupId: group.id, displayOrder: 0 },
        { urlId: url2.id, groupId: group.id, displayOrder: 1 },
        { urlId: url3.id, groupId: group.id, displayOrder: 2 },
      ],
    });
    console.log("Added URLs to group");

    // Test GET endpoint
    console.log("\nTesting GET endpoint...");
    const getRequest = new NextRequest(
      "http://localhost:3000/api/admin/url-groups/" + group.id + "/urls",
      {
        method: "GET",
      },
    );

    const getResponse = await GET(getRequest, { params: { id: group.id } }, true);
    const getResult = await getResponse.json();

    console.log("GET response:", getResult);

    // Verify response structure
    if (!getResponse.ok) {
      throw new Error(`GET request failed: ${getResult.error}`);
    }

    if (!Array.isArray(getResult.urls)) {
      throw new Error("Expected urls array in response");
    }

    if (getResult.urls.length !== 3) {
      throw new Error(`Expected 3 URLs, got ${getResult.urls.length}`);
    }

    // Verify URL order
    getResult.urls.forEach((url: any, index: number) => {
      console.log(`URL ${index + 1}:`, url.title, "Order:", url.displayOrder);
      if (url.displayOrder !== index) {
        throw new Error(
          `URL ${url.title} has incorrect order ${url.displayOrder}, expected ${index}`,
        );
      }
    });

    console.log("✓ GET endpoint test passed");

    // Test DELETE endpoint
    console.log("\nTesting DELETE endpoint...");
    const deleteRequest = new NextRequest(
      "http://localhost:3000/api/admin/url-groups/" + group.id + "/urls",
      {
        method: "DELETE",
        body: JSON.stringify({
          urlIds: [url1.id, url3.id],
        }),
      },
    );

    const deleteResponse = await DELETE(deleteRequest, { params: { id: group.id } }, true);
    const deleteResult = await deleteResponse.json();

    console.log("DELETE response:", deleteResult);

    // Verify delete operation
    if (!deleteResponse.ok) {
      throw new Error(`DELETE request failed: ${deleteResult.error}`);
    }

    if (deleteResult.removed !== 2) {
      throw new Error(`Expected 2 URLs to be removed, got ${deleteResult.removed}`);
    }

    if (deleteResult.remaining !== 1) {
      throw new Error(`Expected 1 URL to remain, got ${deleteResult.remaining}`);
    }

    // Verify remaining URLs and their order
    const verifyRequest = new NextRequest(
      "http://localhost:3000/api/admin/url-groups/" + group.id + "/urls",
      {
        method: "GET",
      },
    );

    const verifyResponse = await GET(verifyRequest, { params: { id: group.id } }, true);
    const verifyResult = await verifyResponse.json();

    console.log("Verification GET response:", verifyResult);

    if (verifyResult.urls.length !== 1) {
      throw new Error(`Expected 1 URL after deletion, got ${verifyResult.urls.length}`);
    }

    if (verifyResult.urls[0].id !== url2.id) {
      throw new Error("Expected URL 2 to remain");
    }

    if (verifyResult.urls[0].displayOrder !== 0) {
      throw new Error(
        `Expected remaining URL to have order 0, got ${verifyResult.urls[0].displayOrder}`,
      );
    }

    console.log("✓ DELETE endpoint test passed");

    // Cleanup
    await prisma.urlGroup.delete({
      where: { id: group.id },
    });
    console.log("\nTest cleanup completed");
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
