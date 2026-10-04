import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.neon_connect;
  if (!connectionString) throw new Error("Watchme database is not configured.");
  return drizzle(neon(connectionString), { schema });
}
let instance: ReturnType<typeof createDb> | undefined;
export function getDb() {
  instance ??= createDb();
  return instance;
}
