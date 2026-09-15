import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { createJsonClient, jsonStoreIsEmpty, jsonStorePath, seedJsonStore } from "../db/jsonStore.js";

export type DataStoreMode = "sqlserver" | "json";

export let dbMode: DataStoreMode = "json";
export let prisma = createJsonClient() as unknown as PrismaClient;

function looksLikePlaceholderUrl(url: string) {
  return /YOUR_USER|YOUR_PASSWORD|CHANGE_ME/i.test(url);
}

async function connectSqlServer() {
  const sql = new PrismaClient();
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("SQL Server connection timed out")), 3000);
  });
  await Promise.race([sql.$connect(), timeout]);
  await sql.user.findFirst({ take: 1 }).catch(() => undefined);
  return sql;
}

export async function initDb() {
  const requested = env.DATA_STORE ?? (env.NODE_ENV === "production" ? "sqlserver" : "auto");

  if (requested === "json") {
    dbMode = "json";
    prisma = createJsonClient() as unknown as PrismaClient;
    if (jsonStoreIsEmpty()) {
      await seedJsonStore({
        adminBankId: env.ADMIN_BANK_ID,
        adminName: env.ADMIN_NAME,
        adminPassword: env.ADMIN_PASSWORD,
        testUserPassword: process.env.TEST_USER_PASSWORD,
      });
    }
    console.warn(`SQL Server bypassed. Using JSON file store at ${jsonStorePath()}`);
    return;
  }

  const shouldTrySql = requested === "sqlserver" || requested === "auto";
  if (shouldTrySql && !looksLikePlaceholderUrl(env.DATABASE_URL)) {
    try {
      prisma = await connectSqlServer();
      dbMode = "sqlserver";
      console.log("Connected to SQL Server");
      return;
    } catch (error) {
      if (requested === "sqlserver") throw error;
      console.warn(
        `SQL Server is not reachable (${error instanceof Error ? error.message : "connection failed"}). Falling back to JSON store.`,
      );
    }
  } else if (requested === "auto") {
    console.warn("DATABASE_URL still has placeholder credentials. Using JSON file store for local testing.");
  }

  dbMode = "json";
  prisma = createJsonClient() as unknown as PrismaClient;
  if (jsonStoreIsEmpty()) {
    await seedJsonStore({
      adminBankId: env.ADMIN_BANK_ID,
      adminName: env.ADMIN_NAME,
      adminPassword: env.ADMIN_PASSWORD,
      testUserPassword: process.env.TEST_USER_PASSWORD,
    });
  }
  console.warn(`Using JSON file store at ${jsonStorePath()}`);
}
