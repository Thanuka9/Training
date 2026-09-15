import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

export class JsonUniqueError extends Error {
  readonly code = "P2002";
  constructor(message = "Unique constraint failed") {
    super(message);
    this.name = "JsonUniqueError";
  }
}

type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;

const STORE_PATH = fileURLToPath(new URL("../../data/store.json", import.meta.url));

const collections: Record<string, string> = {
  user: "users",
  trainingType: "trainingTypes",
  institution: "institutions",
  participationRole: "participationRoles",
  completionStatus: "completionStatuses",
  trainingProgram: "trainingPrograms",
  trainingParticipation: "trainingParticipations",
  auditLog: "auditLogs",
  appSetting: "appSettings",
};

const uniqueFields: Record<string, string[]> = {
  users: ["id", "bankId"],
  trainingTypes: ["id", "name"],
  institutions: ["id", "name"],
  participationRoles: ["id", "name"],
  completionStatuses: ["id", "name"],
  trainingPrograms: ["id"],
  trainingParticipations: ["id"],
  auditLogs: ["id"],
  appSettings: ["id"],
};

const relations: Record<string, { field: string; collection: string; many?: boolean; fk?: string }> = {
  trainingType: { field: "trainingTypeId", collection: "trainingTypes" },
  institution: { field: "institutionId", collection: "institutions" },
  createdBy: { field: "createdById", collection: "users" },
  user: { field: "userId", collection: "users" },
  approvedBy: { field: "approvedById", collection: "users" },
  actor: { field: "actorUserId", collection: "users" },
  participationRole: { field: "participationRoleId", collection: "participationRoles" },
  completionStatus: { field: "completionStatusId", collection: "completionStatuses" },
  trainingProgram: { field: "trainingProgramId", collection: "trainingPrograms" },
  participations: { field: "id", collection: "trainingParticipations", many: true, fk: "trainingProgramId" },
};

function emptyStore(): Store {
  return {
    users: [],
    trainingTypes: [],
    institutions: [],
    participationRoles: [],
    completionStatuses: [],
    trainingPrograms: [],
    trainingParticipations: [],
    auditLogs: [],
    appSettings: [],
  };
}

function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Row).map(([key, item]) => [key, revive(item)]));
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return value;
}

function loadStore(): Store {
  if (!existsSync(STORE_PATH)) return emptyStore();
  const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
  return revive(parsed) as Store;
}

function saveStore(store: Store) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

let store = loadStore();

function persist() {
  saveStore(store);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return value;
}

function comparable(value: unknown) {
  const date = asDate(value);
  if (date instanceof Date) return date.getTime();
  if (typeof value === "string") return value.toLowerCase();
  return value;
}

function contains(haystack: unknown, needle: unknown) {
  return String(haystack ?? "")
    .toLowerCase()
    .includes(String(needle ?? "").toLowerCase());
}

function matchCondition(row: Row, key: string, condition: unknown, model: string): boolean {
  if (condition === undefined) return true;
  if (key === "OR" && Array.isArray(condition)) {
    return condition.some((item) => matchWhere(row, item as Row, model));
  }
  if (key === "AND" && Array.isArray(condition)) {
    return condition.every((item) => matchWhere(row, item as Row, model));
  }
  if (key === "NOT") {
    return !matchWhere(row, condition as Row, model);
  }

  const relation = relations[key];
  if (relation) {
    if (relation.many) {
      const related = (store[relation.collection] ?? []).filter((item) => item[relation.fk ?? ""] === row.id);
      if (condition === true) return related.length > 0;
      const filter = (condition as { where?: Row }).where ?? (condition as Row);
      return related.some((item) => matchWhere(item, filter, relation.collection));
    }
    const related = (store[relation.collection] ?? []).find((item) => item.id === row[relation.field]);
    if (!related) return false;
    if (condition && typeof condition === "object" && "is" in (condition as Row)) {
      const inner = (condition as { is: Row | null }).is;
      if (inner === null) return false;
      return matchWhere(related, inner, relation.collection);
    }
    return matchWhere(related, condition as Row, relation.collection);
  }

  const actual = row[key];
  if (condition === null) return actual == null;
  if (condition && typeof condition === "object" && !(condition instanceof Date) && !Array.isArray(condition)) {
    const filter = condition as Row;
    if ("equals" in filter) return comparable(actual) === comparable(filter.equals);
    if ("not" in filter) {
      if (typeof filter.not === "object" && filter.not && "in" in (filter.not as Row)) {
        return !((filter.not as { in: unknown[] }).in ?? []).some((item) => comparable(item) === comparable(actual));
      }
      return comparable(actual) !== comparable(filter.not);
    }
    if ("in" in filter) return (filter.in as unknown[]).some((item) => comparable(item) === comparable(actual));
    if ("notIn" in filter) {
      return !((filter.notIn as unknown[]) ?? []).some((item) => comparable(item) === comparable(actual));
    }
    if ("contains" in filter) return contains(actual, filter.contains);
    if ("gte" in filter && Number(comparable(actual)) < Number(comparable(filter.gte))) return false;
    if ("lte" in filter && Number(comparable(actual)) > Number(comparable(filter.lte))) return false;
    if ("gt" in filter && Number(comparable(actual)) <= Number(comparable(filter.gt))) return false;
    if ("lt" in filter && Number(comparable(actual)) >= Number(comparable(filter.lt))) return false;
    return true;
  }
  return comparable(actual) === comparable(condition);
}

function matchWhere(row: Row, where: Row | undefined, model: string) {
  if (!where || Object.keys(where).length === 0) return true;
  return Object.entries(where).every(([key, condition]) => matchCondition(row, key, condition, model));
}

function pick(row: Row, select: Row) {
  const result: Row = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) result[key] = row[key];
  }
  return result;
}

function applyInclude(row: Row, include: Row | undefined): Row {
  if (!include) return clone(row);
  const result = clone(row);
  for (const [key, spec] of Object.entries(include)) {
    if (!spec) continue;
    if (key === "_count" && typeof spec === "object") {
      const counts: Row = {};
      for (const countKey of Object.keys(spec as Row)) {
        if (countKey === "participations") {
          counts.participations = (store.trainingParticipations ?? []).filter(
            (item) => item.userId === row.id || item.trainingProgramId === row.id,
          ).length;
        }
      }
      result._count = counts;
      continue;
    }
    const relation = relations[key];
    if (!relation) continue;
    const nested = spec === true ? {} : (spec as Row);
    if (relation.many) {
      let related = (store[relation.collection] ?? []).filter((item) => item[relation.fk ?? ""] === row.id);
      if (nested.where) related = related.filter((item) => matchWhere(item, nested.where as Row, relation.collection));
      result[key] = related.map((item) => {
        let next = clone(item);
        if (nested.include) next = applyInclude(next, nested.include as Row);
        if (nested.select) next = pick(next, nested.select as Row);
        return next;
      });
    } else {
      const related = (store[relation.collection] ?? []).find((item) => item.id === row[relation.field]) ?? null;
      if (!related) {
        result[key] = null;
        continue;
      }
      let next = clone(related);
      if (nested.include) next = applyInclude(next, nested.include as Row);
      if (nested.select) next = pick(next, nested.select as Row);
      result[key] = next;
    }
  }
  return result;
}

function sortRows(rows: Row[], orderBy: unknown) {
  const orders = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (!orders.length) return rows;
  return [...rows].sort((a, b) => {
    for (const order of orders as Row[]) {
      const [key, direction] = Object.entries(order)[0] ?? [];
      if (!key) continue;
      const av = comparable(a[key]);
      const bv = comparable(b[key]);
      if (av === bv) continue;
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
      return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function assertUnique(collection: string, row: Row, ignoreId?: unknown) {
  const keys = uniqueFields[collection] ?? ["id"];
  const rows = store[collection] ?? [];
  for (const key of keys) {
    if (row[key] == null) continue;
    const clash = rows.find((item) => item[key] === row[key] && item.id !== ignoreId);
    if (clash) throw new JsonUniqueError(`${key} already exists`);
  }
}

function createDelegate(model: string) {
  const collection = collections[model];
  return {
    async findUnique(args: { where: Row; include?: Row; select?: Row } = { where: {} }) {
      const row = (store[collection] ?? []).find((item) => matchWhere(item, args.where, collection));
      if (!row) return null;
      let result = applyInclude(row, args.include);
      if (args.select) result = pick(result, args.select);
      return result;
    },
    async findFirst(args: { where?: Row; include?: Row; orderBy?: unknown; take?: number } = {}) {
      const rows = sortRows(
        (store[collection] ?? []).filter((item) => matchWhere(item, args.where, collection)),
        args.orderBy,
      );
      const row = rows[0];
      return row ? applyInclude(row, args.include) : null;
    },
    async findMany(args: {
      where?: Row;
      include?: Row;
      select?: Row;
      orderBy?: unknown;
      skip?: number;
      take?: number;
    } = {}) {
      let rows = (store[collection] ?? []).filter((item) => matchWhere(item, args.where, collection));
      rows = sortRows(rows, args.orderBy);
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take != null) rows = rows.slice(0, args.take);
      return rows.map((row) => {
        let result = applyInclude(row, args.include);
        if (args.select) result = pick(result, args.select);
        return result;
      });
    },
    async count(args: { where?: Row } = {}) {
      return (store[collection] ?? []).filter((item) => matchWhere(item, args.where, collection)).length;
    },
    async create(args: { data: Row; include?: Row }) {
      const now = new Date();
      const row: Row = {
        id: (args.data.id as string) ?? randomUUID(),
        ...args.data,
        createdAt: args.data.createdAt ?? now,
        updatedAt: args.data.updatedAt ?? now,
      };
      if (model === "appSetting" && !args.data.id) row.id = "default";
      assertUnique(collection, row);
      store[collection].push(row);
      persist();
      return applyInclude(row, args.include);
    },
    async update(args: { where: Row; data: Row; include?: Row; select?: Row }) {
      const index = (store[collection] ?? []).findIndex((item) => matchWhere(item, args.where, collection));
      if (index < 0) return null;
      const next = {
        ...store[collection][index],
        ...args.data,
        updatedAt: new Date(),
      };
      assertUnique(collection, next, store[collection][index].id);
      store[collection][index] = next;
      persist();
      let result = applyInclude(next, args.include);
      if (args.select) result = pick(result, args.select);
      return result;
    },
    async upsert(args: { where: Row; update: Row; create: Row; include?: Row }) {
      const existing = (store[collection] ?? []).find((item) => matchWhere(item, args.where, collection));
      if (existing) {
        return this.update({ where: { id: existing.id }, data: args.update, include: args.include });
      }
      return this.create({ data: args.create, include: args.include });
    },
  };
}

export function createJsonClient(): any {
  const client: Row = {
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
    $disconnect: async () => undefined,
    $connect: async () => undefined,
  };
  for (const model of Object.keys(collections)) {
    client[model] = createDelegate(model);
  }
  return client;
}

export function jsonStorePath() {
  return STORE_PATH;
}

export function jsonStoreIsEmpty() {
  return (store.users?.length ?? 0) === 0;
}

export async function seedJsonStore(env: {
  adminBankId?: string;
  adminName?: string;
  adminPassword?: string;
  testUserPassword?: string;
}) {
  const client = createJsonClient();
  const adminBankId = env.adminBankId ?? "ADMIN001";
  const adminName = env.adminName ?? "System Administrator";
  const adminPassword = env.adminPassword ?? "ChangeMeNow123";
  const testPassword = env.testUserPassword ?? "Training9672";

  const admin = await client.user.upsert({
    where: { bankId: adminBankId },
    update: { fullName: adminName, role: "ADMIN", status: "ACTIVE" },
    create: {
      bankId: adminBankId,
      fullName: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const trainingTypes = [
    { name: "CBS Training", sortOrder: 1 },
    { name: "Foreign Training", sortOrder: 2 },
    { name: "Virtual Training Program", sortOrder: 3 },
    { name: "Public Lecture", sortOrder: 4 },
  ];
  const typeRecords = [];
  for (const item of trainingTypes) {
    typeRecords.push(
      await client.trainingType.upsert({
        where: { name: item.name },
        update: { sortOrder: item.sortOrder, active: true },
        create: { ...item, active: true },
      }),
    );
  }

  for (const item of [
    { name: "Participant", sortOrder: 1 },
    { name: "Resource Person", sortOrder: 2 },
    { name: "Panelist", sortOrder: 3 },
  ]) {
    await client.participationRole.upsert({
      where: { name: item.name },
      update: { sortOrder: item.sortOrder, active: true },
      create: { ...item, active: true },
    });
  }

  for (const item of [
    { name: "Planned", sortOrder: 1, isFinal: false },
    { name: "Ongoing", sortOrder: 2, isFinal: false },
    { name: "Completed", sortOrder: 3, isFinal: true },
    { name: "Not Completed", sortOrder: 4, isFinal: true },
    { name: "Cancelled", sortOrder: 5, isFinal: true },
  ]) {
    await client.completionStatus.upsert({
      where: { name: item.name },
      update: { sortOrder: item.sortOrder, isFinal: item.isFinal, active: true },
      create: { ...item, active: true },
    });
  }

  const institutionRecords = [];
  for (const name of ["SEACEN", "CBS", "IMF", "World Bank", "Central Bank of Sri Lanka"]) {
    institutionRecords.push(
      await client.institution.upsert({
        where: { name },
        update: { active: true },
        create: { name, active: true },
      }),
    );
  }

  await client.appSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", allowHybridDelivery: true },
  });

  const seacen = institutionRecords.find((item: Row) => item.name === "SEACEN")!;
  const cbs = institutionRecords.find((item: Row) => item.name === "CBS")!;
  const foreignType = typeRecords.find((item: Row) => item.name === "Foreign Training")!;
  const cbsType = typeRecords.find((item: Row) => item.name === "CBS Training")!;
  const virtualType = typeRecords.find((item: Row) => item.name === "Virtual Training Program")!;

  const samplePrograms = [
    {
      name: "Advanced Banking Supervision Programme",
      locationScope: "FOREIGN",
      trainingTypeId: foreignType.id,
      institutionId: seacen.id,
      venue: "Kuala Lumpur, Malaysia",
      description: "SEACEN programme for banking supervisors.",
    },
    {
      name: "CBS Internal Supervision Workshop",
      locationScope: "LOCAL",
      trainingTypeId: cbsType.id,
      institutionId: cbs.id,
      venue: "Central Bank of Sri Lanka",
      description: "Internal workshop for Bank Supervision Department officers.",
    },
    {
      name: "Virtual Risk Assessment Seminar",
      locationScope: "FOREIGN",
      trainingTypeId: virtualType.id,
      institutionId: seacen.id,
      venue: "Microsoft Teams",
      description: "Online seminar covering supervisory risk assessment.",
    },
  ];

  for (const program of samplePrograms) {
    const existing = await client.trainingProgram.findFirst({ where: { name: program.name } });
    if (!existing) {
      await client.trainingProgram.create({
        data: { ...program, active: true, createdById: admin.id },
      });
    }
  }

  const testUser = await client.user.upsert({
    where: { bankId: "9672" },
    update: { fullName: "Thanuka Ellepola", role: "USER", status: "ACTIVE" },
    create: {
      bankId: "9672",
      fullName: "Thanuka Ellepola",
      passwordHash: await bcrypt.hash(testPassword, 12),
      role: "USER",
      status: "ACTIVE",
    },
  });

  const participant = await client.participationRole.findUnique({ where: { name: "Participant" } });
  const completed = await client.completionStatus.findUnique({ where: { name: "Completed" } });
  const sampleProgram = await client.trainingProgram.findFirst({
    where: { name: "CBS Internal Supervision Workshop" },
  });
  if (participant && completed && sampleProgram) {
    const existingRecord = await client.trainingParticipation.findFirst({
      where: { userId: testUser.id, trainingProgramId: sampleProgram.id },
    });
    if (!existingRecord) {
      await client.trainingParticipation.create({
        data: {
          userId: testUser.id,
          trainingProgramId: sampleProgram.id,
          deliveryMode: "PHYSICAL",
          participationRoleId: participant.id,
          fromDate: new Date("2026-03-10"),
          toDate: new Date("2026-03-12"),
          completionStatusId: completed.id,
          remarks: "Seeded demonstration record",
          workflowStatus: "SUBMITTED",
          submittedAt: new Date(),
        },
      });
    }
  }
}

export function reloadJsonStore() {
  store = loadStore();
}
