import { config } from "dotenv";

// Runs in each test worker BEFORE any test file imports "@/lib/prisma":
// route the shared Prisma client at the test database.
config({ path: ".env" });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set");
}
process.env.TEST_DATABASE_URL_ACTIVE = process.env.TEST_DATABASE_URL;
