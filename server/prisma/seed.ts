import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminBankId = process.env.ADMIN_BANK_ID;
  const adminName = process.env.ADMIN_NAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminBankId || !adminName || !adminPassword) {
    throw new Error("ADMIN_BANK_ID, ADMIN_NAME and ADMIN_PASSWORD must be set before seeding");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { bankId: adminBankId },
    update: {
      fullName: adminName,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      bankId: adminBankId,
      fullName: adminName,
      passwordHash,
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
      await prisma.trainingType.upsert({
        where: { name: item.name },
        update: { sortOrder: item.sortOrder, active: true },
        create: { ...item, active: true },
      }),
    );
  }

  const roles = [
    { name: "Participant", sortOrder: 1 },
    { name: "Resource Person", sortOrder: 2 },
    { name: "Panelist", sortOrder: 3 },
  ];
  for (const item of roles) {
    await prisma.participationRole.upsert({
      where: { name: item.name },
      update: { sortOrder: item.sortOrder, active: true },
      create: { ...item, active: true },
    });
  }

  const completion = [
    { name: "Planned", sortOrder: 1, isFinal: false },
    { name: "Ongoing", sortOrder: 2, isFinal: false },
    { name: "Completed", sortOrder: 3, isFinal: true },
    { name: "Not Completed", sortOrder: 4, isFinal: true },
    { name: "Cancelled", sortOrder: 5, isFinal: true },
  ];
  for (const item of completion) {
    await prisma.completionStatus.upsert({
      where: { name: item.name },
      update: { sortOrder: item.sortOrder, isFinal: item.isFinal, active: true },
      create: { ...item, active: true },
    });
  }

  const institutions = ["SEACEN", "CBS", "IMF", "World Bank", "Central Bank of Sri Lanka"];
  const institutionRecords = [];
  for (const name of institutions) {
    institutionRecords.push(
      await prisma.institution.upsert({
        where: { name },
        update: { active: true },
        create: { name, active: true },
      }),
    );
  }

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", allowHybridDelivery: true },
  });

  const seacen = institutionRecords.find((item) => item.name === "SEACEN")!;
  const cbs = institutionRecords.find((item) => item.name === "CBS")!;
  const foreignType = typeRecords.find((item) => item.name === "Foreign Training")!;
  const cbsType = typeRecords.find((item) => item.name === "CBS Training")!;
  const virtualType = typeRecords.find((item) => item.name === "Virtual Training Program")!;

  const samplePrograms = [
    {
      name: "Advanced Banking Supervision Programme",
      locationScope: "FOREIGN" as const,
      trainingTypeId: foreignType.id,
      institutionId: seacen.id,
      venue: "Kuala Lumpur, Malaysia",
      description: "SEACEN programme for banking supervisors.",
    },
    {
      name: "CBS Internal Supervision Workshop",
      locationScope: "LOCAL" as const,
      trainingTypeId: cbsType.id,
      institutionId: cbs.id,
      venue: "Central Bank of Sri Lanka",
      description: "Internal workshop for Bank Supervision Department officers.",
    },
    {
      name: "Virtual Risk Assessment Seminar",
      locationScope: "FOREIGN" as const,
      trainingTypeId: virtualType.id,
      institutionId: seacen.id,
      venue: "Microsoft Teams",
      description: "Online seminar covering supervisory risk assessment.",
    },
  ];

  for (const program of samplePrograms) {
    const existing = await prisma.trainingProgram.findFirst({
      where: { name: program.name },
    });
    if (!existing) {
      await prisma.trainingProgram.create({
        data: {
          ...program,
          active: true,
          createdById: admin.id,
        },
      });
    }
  }

  const testPassword = process.env.TEST_USER_PASSWORD ?? "Training9672";
  const testUser = await prisma.user.upsert({
    where: { bankId: "9672" },
    update: {
      fullName: "Thanuka Ellepola",
      role: "USER",
      status: "ACTIVE",
    },
    create: {
      bankId: "9672",
      fullName: "Thanuka Ellepola",
      passwordHash: await bcrypt.hash(testPassword, 12),
      role: "USER",
      status: "ACTIVE",
    },
  });

  const participant = await prisma.participationRole.findUnique({ where: { name: "Participant" } });
  const completed = await prisma.completionStatus.findUnique({ where: { name: "Completed" } });
  const sampleProgram = await prisma.trainingProgram.findFirst({
    where: { name: "CBS Internal Supervision Workshop" },
  });
  if (participant && completed && sampleProgram) {
    const existingRecord = await prisma.trainingParticipation.findFirst({
      where: { userId: testUser.id, trainingProgramId: sampleProgram.id },
    });
    if (!existingRecord) {
      await prisma.trainingParticipation.create({
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

  console.log(`Seed complete. Admin Bank ID: ${admin.bankId}`);
  console.log(`Test officer: Thanuka Ellepola / Bank ID 9672`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
