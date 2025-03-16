// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  try {
    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: {
        isAdmin: true
      }
    });

    if (adminCount === 0) {
      console.log('No admin users found. Creating default admin user...');

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: null, // No password initially
          isAdmin: true,
        },
      });

      console.log(`Created default admin user: ${adminUser.username}`);
    } else {
      console.log(`Database already has ${adminCount} admin users. Skipping default admin creation.`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
