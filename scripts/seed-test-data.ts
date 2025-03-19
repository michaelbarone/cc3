import { seedTestData } from "../lib/db/init";

console.log("Starting test data seeding...");

seedTestData()
  .then(() => {
    console.log("Test data seeding completed successfully");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Error seeding test data:", error);
    process.exit(1);
  });
