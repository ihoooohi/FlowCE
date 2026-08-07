import { execSync } from "node:child_process";
import { config } from "dotenv";

// Runs once before the suite: apply migrations to the test database.
export default function globalSetup() {
  config({ path: ".env" });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set — copy .env.example to .env and point it at a disposable Postgres database",
    );
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
