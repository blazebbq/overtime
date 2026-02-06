import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data for clean slate
  await prisma.booking.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.user.deleteMany();

  // ----- USERS -----
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin1 = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Tom (Admin)",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: "manager@test.com",
      name: "Lisa (Manager)",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: "user@test.com",
      name: "Sarah",
      password: passwordHash,
      role: "USER",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "john@test.com",
      name: "John",
      password: passwordHash,
      role: "USER",
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "emma@test.com",
      name: "Emma",
      password: passwordHash,
      role: "USER",
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: "mike@test.com",
      name: "Mike",
      password: passwordHash,
      role: "USER",
    },
  });

  console.log("✅ Created 6 users (2 admins, 4 regular users)");

  // ----- OVERTIME REQUESTS -----
  const now = new Date();
  const day = (d: number) =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 1. Open shift with no bookings
  const ot1 = await prisma.overtimeRequest.create({
    data: {
      date: day(1),
      shift: "YELLOW",
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 3,
      status: "OPEN",
    },
  });

  // 2. Open shift with 1 booking (needs 2)
  const ot2 = await prisma.overtimeRequest.create({
    data: {
      date: day(2),
      shift: "ORANGE",
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 2,
      status: "OPEN",
    },
  });
  await prisma.booking.create({
    data: { userId: user1.id, overtimeId: ot2.id },
  });

  // 3. FULL shift (2/2 booked) - to test cancellation rule
  const ot3 = await prisma.overtimeRequest.create({
    data: {
      date: day(3),
      shift: "PURPLE",
      startTime: "19:00",
      endTime: "07:00",
      requiredPeople: 2,
      status: "FULL",
    },
  });
  await prisma.booking.create({
    data: { userId: user2.id, overtimeId: ot3.id },
  });
  await prisma.booking.create({
    data: { userId: user3.id, overtimeId: ot3.id },
  });

  // 4. Another FULL shift (3/3 booked)
  const ot4 = await prisma.overtimeRequest.create({
    data: {
      date: day(4),
      shift: "GREEN",
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 3,
      status: "FULL",
    },
  });
  await prisma.booking.create({
    data: { userId: user1.id, overtimeId: ot4.id },
  });
  await prisma.booking.create({
    data: { userId: user2.id, overtimeId: ot4.id },
  });
  await prisma.booking.create({
    data: { userId: user4.id, overtimeId: ot4.id },
  });

  // 5. Open shift for weekend
  const ot5 = await prisma.overtimeRequest.create({
    data: {
      date: day(5),
      shift: "YELLOW",
      startTime: "08:00",
      endTime: "16:00",
      requiredPeople: 2,
      status: "OPEN",
    },
  });

  // 6. Archived shift (should not appear on main page)
  const ot6 = await prisma.overtimeRequest.create({
    data: {
      date: day(-1),
      shift: "ORANGE",
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 2,
      status: "ARCHIVED",
    },
  });
  await prisma.booking.create({
    data: { userId: user3.id, overtimeId: ot6.id },
  });

  console.log("✅ Created 6 overtime requests with various states");
  console.log("   - 3 OPEN shifts (0, 1, 0 bookings)");
  console.log("   - 2 FULL shifts (to test cancellation rule)");
  console.log("   - 1 ARCHIVED shift");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
