import { prisma } from "@/app/lib/db/prisma";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create required directories if they don't exist
function createRequiredDirectories() {
  const directories = [
    "data",
    "data/backups",
    "public/uploads",
    "public/icons",
    "public/avatars",
    "public/logos",
    "public/favicons",
  ];

  directories.forEach((dir) => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  });
}

export async function main() {
  console.log("Starting database seeding...");

  try {
    // Create required directories first
    console.log("Creating required directories...");
    createRequiredDirectories();

    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: {
        isAdmin: true,
      },
    });

    let adminUser;
    if (adminCount === 0) {
      console.log("No admin users found. Creating default admin user...");

      // Create admin user
      adminUser = await prisma.user.create({
        data: {
          username: "admin",
          passwordHash: null, // No password initially
          isAdmin: true,
          themeMode: "dark", // Set dark theme as default
          menuPosition: "top", // Set top menu as default
        },
      });

      console.log(`Created default admin user: ${adminUser.username}`);
    } else {
      console.log(
        `Database already has ${adminCount} admin users. Skipping default admin creation.`,
      );
      adminUser = await prisma.user.findFirst({
        where: {
          isAdmin: true,
        },
      });
    }

    // Check if app config exists
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: "app-config" },
    });

    if (!appConfig) {
      console.log("Creating default app configuration...");
      await prisma.appConfig.create({
        data: {
          id: "app-config",
          appName: "Control Center",
          loginTheme: "dark",
          registrationEnabled: false,
        },
      });
      console.log("Created default app configuration");
    }

    // Check if any URL groups exist
    const groupCount = await prisma.urlGroup.count();

    if (groupCount === 0) {
      console.log("No URL groups found. Creating example groups...");

      try {
        // Create the Development Resources group
        const devGroup = await prisma.urlGroup.create({
          data: {
            name: "Development Resources",
            description: "Useful development and documentation resources",
          },
        });

        console.log("Created Development Resources group:", devGroup);

        // Create the Media & Maps group
        const mediaGroup = await prisma.urlGroup.create({
          data: {
            name: "Media & Maps",
            description: "Embedded media examples and interactive maps",
          },
        });

        console.log("Created Media & Maps group:", mediaGroup);

        // Create URLs for Development Resources group
        const devUrls = [
          {
            title: "MDN Web Docs",
            url: "https://developer.mozilla.org/",
            idleTimeoutMinutes: 30,
          },
          {
            title: "Next.js Documentation",
            url: "https://nextjs.org/docs",
            idleTimeoutMinutes: 30,
          },
          {
            title: "TypeScript Playground",
            url: "https://www.typescriptlang.org/play",
            idleTimeoutMinutes: 20,
          },
        ];

        // Create URLs for Media & Maps group
        const mediaUrls = [
          {
            title: "YouTube Embed Example",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            idleTimeoutMinutes: 15,
          },
          {
            title: "Google Maps - Times Square",
            url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.1015167256684!2d-73.98784892439321!3d40.75779613541194!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c6480299%3A0x55194ec5a1ae072e!2sTimes+Square!5e0!3m2!1sen!2sus!4v1565726584388",
            idleTimeoutMinutes: 20,
          },
          {
            title: "Vimeo Example",
            url: "https://player.vimeo.com/video/148751763",
            idleTimeoutMinutes: 15,
          },
        ];

        // Create and associate Development Resources URLs
        for (let i = 0; i < devUrls.length; i++) {
          const url = await prisma.url.create({
            data: devUrls[i],
          });

          await prisma.urlsInGroups.create({
            data: {
              urlId: url.id,
              groupId: devGroup.id,
              displayOrder: i,
            },
          });

          console.log(`Created and associated URL: ${url.title}`);
        }

        // Create and associate Media & Maps URLs
        for (let i = 0; i < mediaUrls.length; i++) {
          const url = await prisma.url.create({
            data: mediaUrls[i],
          });

          await prisma.urlsInGroups.create({
            data: {
              urlId: url.id,
              groupId: mediaGroup.id,
              displayOrder: i,
            },
          });

          console.log(`Created and associated URL: ${url.title}`);
        }

        // Assign both groups to the admin user
        if (adminUser) {
          await prisma.userUrlGroup.createMany({
            data: [
              {
                userId: adminUser.id,
                urlGroupId: devGroup.id,
              },
              {
                userId: adminUser.id,
                urlGroupId: mediaGroup.id,
              },
            ],
          });

          console.log("Assigned example groups to admin user");
        }

        // Verify the setup
        const verifySetup = await prisma.urlGroup.findMany({
          include: {
            urls: {
              include: {
                url: true,
              },
            },
            userUrlGroups: {
              include: {
                user: true,
              },
            },
          },
        });

        console.log("Final setup verification:", JSON.stringify(verifySetup, null, 2));
      } catch (error) {
        console.error("Error during example groups and URLs setup:", error);
        throw error;
      }
    } else {
      console.log(
        `Database already has ${groupCount} URL groups. Skipping example groups creation.`,
      );
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
