import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { createJsonClient, ensureExtraDemoOfficers, jsonStoreIsEmpty, jsonStorePath, seedJsonStore } from "../db/jsonStore.js";
import { syncWorkbookMasterData } from "../services/workbookMasterSync.js";

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

async function ensureWorkbookCatalog(actorBankId?: string) {
  const adminBankId = actorBankId ?? env.ADMIN_BANK_ID ?? "ADMIN001";
  const admin = await prisma.user.findUnique({ where: { bankId: adminBankId } });
  if (!admin) return;
  const summary = await syncWorkbookMasterData(prisma, admin.id);
  const created =
    summary.created.typesCreated +
    summary.created.institutionsCreated +
    summary.created.rolesCreated +
    summary.created.programsCreated;
  if (created > 0) {
    console.warn(
      `Workbook master data: +${summary.created.typesCreated} types / +${summary.created.institutionsCreated} institutions / +${summary.created.programsCreated} programmes (catalog ${summary.trainingTypes}/${summary.institutions}/${summary.trainingPrograms})`,
    );
  }
}

async function bootJsonStore() {
  dbMode = "json";
  prisma = createJsonClient() as unknown as PrismaClient;
  if (jsonStoreIsEmpty()) {
    await seedJsonStore({
      adminBankId: env.ADMIN_BANK_ID,
      adminName: env.ADMIN_NAME,
      adminPassword: env.ADMIN_PASSWORD,
      testUserPassword: process.env.TEST_USER_PASSWORD,
    });
  } else {
    await ensureExtraDemoOfficers(undefined, process.env.TEST_USER_PASSWORD);
  }
  await ensureWorkbookCatalog(env.ADMIN_BANK_ID);
  console.warn(`Using JSON file store at ${jsonStorePath()} (SQL Server can be enabled later with DATA_STORE=sqlserver)`);
}

export async function initDb() {
  // Local/default: JSON until SQL Server is configured. Production still defaults to sqlserver.
  const requested = env.DATA_STORE ?? (env.NODE_ENV === "production" ? "sqlserver" : "json");

  if (requested === "json") {
    await bootJsonStore();
    return;
  }

  const shouldTrySql = requested === "sqlserver" || requested === "auto";
  if (shouldTrySql && !looksLikePlaceholderUrl(env.DATABASE_URL)) {
    try {
      prisma = await connectSqlServer();
      dbMode = "sqlserver";
      console.log("Connected to SQL Server");
      await ensureWorkbookCatalog(env.ADMIN_BANK_ID);
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

  await bootJsonStore();
}
