import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        passwordHash: true,
        lastLoginAt: true,
        isActive: true,
      },
    });

    console.log("User data:");
    users.forEach((user) => {
      console.log(`- User: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Has password: ${user.passwordHash !== null}`);
      console.log(`  Never logged in: ${user.lastLoginAt === null}`);
      console.log(`  Is active: ${user.isActive}`);
      console.log(
        `  Can login without password: ${user.passwordHash === null && user.role === "ADMIN" && user.lastLoginAt === null}`,
      );
      console.log("---");
    });
  } catch (error) {
    console.error("Error retrieving user data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
