import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ----- USERS -----
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Tom (Admin)",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@test.com" },
    update: {},
    create: {
      email: "user@test.com",
      name: "Sarah",
      password: passwordHash,
      role: "USER",
    },
  });

  // ----- OVERTIME -----
  const existing = await prisma.overtimeRequest.count();
  if (existing > 0) {
    console.log("ℹ️ Overtime already exists, skipping seed");
    return;
  }

  const now = new Date();
  const day = (d: number) =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  await prisma.overtimeRequest.createMany({
    data: [
      {
        date: day(1),
        shift: "YELLOW",
        startTime: "07:00",
        endTime: "19:00",
        requiredPeople: 2,
        status: "OPEN",
      },
      {
        date: day(2),
        shift: "ORANGE",
        startTime: "07:00",
        endTime: "19:00",
        requiredPeople: 1,
        status: "OPEN",
      },
      {
        date: day(3),
        shift: "PURPLE",
        startTime: "19:00",
        endTime: "07:00",
        requiredPeople: 2,
        status: "OPEN",
      },
      {
        date: day(4),
        shift: "GREEN",
        startTime: "07:00",
        endTime: "19:00",
        requiredPeople: 3,
        status: "OPEN",
      },
    ],
  });

  console.log("✅ Seeded users + overtime requests");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
