import { PrismaClient, UrlCreateInput } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log("Starting to seed test data...");

  // Clear existing test data to avoid duplicates
  await clearTestData();

  // 1. Find existing admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      name: "admin",
      role: "ADMIN",
    },
  });

  if (!adminUser) {
    throw new Error("Admin user not found. Run Prisma seed first to create the admin user.");
  }

  // 2. Create a second non-admin user
  const testUser = await prisma.user.create({
    data: {
      name: "testuser",
      role: "USER",
      isActive: true,
      settings: {
        create: {
          theme: "LIGHT",
          menuPosition: "TOP",
        },
      },
    },
  });
  console.log(`Created test user with ID: ${testUser.id}`);

  // 3. Create URL groups with example URLs
  // Group 1: Work Resources (assigned to both admin and test user)
  const workGroup = await createGroup("Work Resources", "Essential work links", adminUser.id);

  // Group 2: Personal Bookmarks (admin only)
  const personalGroup = await createGroup(
    "Personal Bookmarks",
    "Personal sites collection",
    adminUser.id,
  );

  // Group 3: Development Tools (admin only)
  const devGroup = await createGroup(
    "Development Tools",
    "Useful development resources",
    adminUser.id,
  );

  // Group 4: News Sources (admin only)
  const newsGroup = await createGroup("News Sources", "Important news sites", adminUser.id);

  // 4. Create URLs and add them to groups
  // Work group URLs
  await createUrlInGroup(
    "https://github.com",
    "GitHub",
    "Version control and collaboration platform",
    null,
    adminUser.id,
    workGroup.id,
    1,
  );
  await createUrlInGroup(
    "https://atlassian.com",
    "Atlassian",
    "Project management and collaboration tools",
    null,
    adminUser.id,
    workGroup.id,
    2,
  );
  await createUrlInGroup(
    "https://slack.com",
    "Slack",
    "Team communication platform",
    null,
    adminUser.id,
    workGroup.id,
    3,
  );

  // Personal group URLs
  await createUrlInGroup(
    "https://netflix.com",
    "Netflix",
    "Streaming service",
    null,
    adminUser.id,
    personalGroup.id,
    1,
  );
  await createUrlInGroup(
    "https://spotify.com",
    "Spotify",
    "Music streaming platform",
    null,
    adminUser.id,
    personalGroup.id,
    2,
  );

  // Development group URLs
  await createUrlInGroup(
    "https://stackoverflow.com",
    "Stack Overflow",
    "Developer Q&A platform",
    null,
    adminUser.id,
    devGroup.id,
    1,
  );
  await createUrlInGroup(
    "https://reactjs.org",
    "React",
    "JavaScript library for building user interfaces",
    null,
    adminUser.id,
    devGroup.id,
    2,
  );
  await createUrlInGroup(
    "https://developer.mozilla.org",
    "MDN Web Docs",
    "Comprehensive web development documentation",
    null,
    adminUser.id,
    devGroup.id,
    3,
  );

  // News group URLs
  await createUrlInGroup(
    "https://news.ycombinator.com",
    "Hacker News",
    "Tech news aggregator",
    null,
    adminUser.id,
    newsGroup.id,
    1,
  );
  await createUrlInGroup(
    "https://techcrunch.com",
    "TechCrunch",
    "Technology media property",
    null,
    adminUser.id,
    newsGroup.id,
    2,
  );

  // 5. Assign the Work group to the test user
  await prisma.userGroupAccess.create({
    data: {
      userId: testUser.id,
      groupId: workGroup.id,
    },
  });

  // 6. Ensure all groups are assigned to the admin user
  const groups = [workGroup, personalGroup, devGroup, newsGroup];
  for (const group of groups) {
    // Check if the access already exists
    const accessExists = await prisma.userGroupAccess.findFirst({
      where: {
        userId: adminUser.id,
        groupId: group.id,
      },
    });

    if (!accessExists) {
      await prisma.userGroupAccess.create({
        data: {
          userId: adminUser.id,
          groupId: group.id,
        },
      });
    }
  }

  console.log("Test data seeding completed successfully!");
}

async function clearTestData() {
  // Delete the test user if exists (will cascade to user settings and group access)
  await prisma.user.deleteMany({
    where: {
      name: "testuser",
    },
  });

  // Note: Deleting groups will cascade to URLInGroup records
  await prisma.group.deleteMany({
    where: {
      name: {
        in: ["Work Resources", "Personal Bookmarks", "Development Tools", "News Sources"],
      },
    },
  });

  // Remove URLs that were created for testing
  await prisma.url.deleteMany({
    where: {
      url: {
        in: [
          "https://github.com",
          "https://atlassian.com",
          "https://slack.com",
          "https://netflix.com",
          "https://spotify.com",
          "https://stackoverflow.com",
          "https://reactjs.org",
          "https://developer.mozilla.org",
          "https://news.ycombinator.com",
          "https://techcrunch.com",
        ],
      },
    },
  });

  console.log("Cleared existing test data");
}

async function createGroup(name: string, description: string | null, createdById: string) {
  // Create data object first, similar to how it's done in the API routes
  const data = {
    name,
    createdById,
  } as any;

  // Add description using explicit property assignment
  if (description) data.description = description;

  return prisma.group.create({
    data,
  });
}

async function createUrlInGroup(
  url: string,
  title: string,
  notes: string | null,
  mobileSpecificUrl: string | null,
  addedById: string,
  groupId: string,
  displayOrder: number,
) {
  // Check if URL exists
  let urlRecord = await prisma.url.findFirst({
    where: { url },
  });

  // Create URL if it doesn't exist
  if (!urlRecord) {
    // Create properly typed URL data
    const urlData: UrlCreateInput = {
      url,
      title,
      addedById,
    };

    // Add optional fields only if they have values
    if (notes) urlData.notes = notes;
    if (mobileSpecificUrl) urlData.mobileSpecificUrl = mobileSpecificUrl;

    urlRecord = await prisma.url.create({
      data: urlData,
    });
  }

  // Create UrlInGroup data object first, similar to how it's done in the API routes
  const urlInGroupData = {
    urlId: urlRecord.id,
    groupId,
  } as any;

  // Add displayOrderInGroup using explicit property assignment
  urlInGroupData.displayOrderInGroup = displayOrder;

  // Add URL to group
  await prisma.urlInGroup.create({
    data: urlInGroupData,
  });

  return urlRecord;
}

main()
  .catch((e) => {
    console.error("Error seeding test data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
