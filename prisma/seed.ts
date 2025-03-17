import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Create required directories if they don't exist
function createRequiredDirectories() {
  const directories = [
    'data',
    'data/backups',
    'public/uploads',
    'public/icons',
    'public/avatars',
    'public/logos',
    'public/favicons'
  ]

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`Created directory: ${dirPath}`)
    }
  })
}

export async function main() {
  console.log('Starting database seeding...');

  try {
    // Create required directories first
    console.log('Creating required directories...');
    createRequiredDirectories();

    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: {
        isAdmin: true
      }
    });

    let adminUser;
    if (adminCount === 0) {
      console.log('No admin users found. Creating default admin user...');

      // Create admin user
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: null, // No password initially
          isAdmin: true,
        },
      });

      console.log(`Created default admin user: ${adminUser.username}`);
    } else {
      console.log(`Database already has ${adminCount} admin users. Skipping default admin creation.`);
      adminUser = await prisma.user.findFirst({
        where: {
          isAdmin: true
        }
      });
    }

    // Check if app config exists
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' }
    });

    if (!appConfig) {
      console.log('Creating default app configuration...');
      await prisma.appConfig.create({
        data: {
          id: 'app-config',
          appName: 'Control Center',
          loginTheme: 'dark',
          registrationEnabled: false
        },
      });
      console.log('Created default app configuration');
    }

    // Check if any URL groups exist
    const groupCount = await prisma.urlGroup.count();

    if (groupCount === 0) {
      console.log('No URL groups found. Creating example group...');

      try {
        // First create the example group
        const exampleGroup = await prisma.urlGroup.create({
          data: {
            name: 'Example Group',
            description: 'This is an example group with a sample URL',
          }
        });

        console.log('Created example group:', exampleGroup);

        // Create the URL using urlGroupId
        const exampleUrl = await prisma.url.create({
          data: {
            title: 'Example Website',
            url: 'https://example.com',
            displayOrder: 0,
            idleTimeoutMinutes: 10,
            urlGroupId: exampleGroup.id
          }
        });

        console.log('Created example URL:', exampleUrl);

        // Assign the group to the admin user
        if (adminUser) {
          const userUrlGroup = await prisma.userUrlGroup.create({
            data: {
              userId: adminUser.id,
              urlGroupId: exampleGroup.id
            }
          });

          console.log('Assigned example group to admin user:', userUrlGroup);
        }

        // Verify the setup
        const verifySetup = await prisma.urlGroup.findFirst({
          where: { id: exampleGroup.id },
          include: {
            urls: true,
            userUrlGroups: {
              include: {
                user: true
              }
            }
          }
        });

        console.log('Final setup verification:', JSON.stringify(verifySetup, null, 2));
      } catch (error) {
        console.error('Error during example group and URL setup:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      }
    } else {
      console.log(`Database already has ${groupCount} URL groups. Skipping example group creation.`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Keep the direct invocation for prisma seed command
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
