import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if the admin user already exists
  const adminExists = await prisma.user.findFirst({
    where: {
      name: "admin",
      role: "ADMIN",
    },
  });

  // Only create the admin user if it doesn't exist
  if (!adminExists) {
    console.log("Creating default admin user...");

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        name: "admin",
        role: "ADMIN",
        isActive: true,
        // No passwordHash initially - this will be set during the first run experience
        settings: {
          create: {
            // Use string values for enums in the create operation
            theme: "SYSTEM",
            menuPosition: "SIDE",
          },
        },
      },
    });

    console.log(`Created admin user with ID: ${admin.id}`);
  } else {
    console.log("Admin user already exists, skipping creation.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
