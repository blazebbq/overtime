import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Version 2 database...\n");

  // Clear existing data for clean slate
  console.log("🧹 Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.overtimeApproval.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.managerAssignment.deleteMany();
  await prisma.userShiftPattern.deleteMany();
  await prisma.shiftPattern.deleteMany();
  await prisma.areaShiftColour.deleteMany();
  await prisma.shiftColour.deleteMany();
  await prisma.area.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleared all existing data\n");

  // ----- USERS -----
  console.log("👥 Creating users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@test.com",
      name: "Alice (Super Admin)",
      password: passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const admin1 = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Tom (Admin)",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: "manager1@test.com",
      name: "Lisa (Manager)",
      password: passwordHash,
      role: "MANAGER",
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "manager2@test.com",
      name: "Bob (Manager)",
      password: passwordHash,
      role: "MANAGER",
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

  console.log("✅ Created 8 users:");
  console.log("   - 1 Super Admin");
  console.log("   - 1 Admin");
  console.log("   - 2 Managers");
  console.log("   - 4 Regular Users\n");

  // ----- AREAS -----
  console.log("🏢 Creating areas...");
  const swc2 = await prisma.area.create({
    data: { name: "SWC2", enabled: true },
  });

  const swc4 = await prisma.area.create({
    data: { name: "SWC4", enabled: true },
  });

  const smc2 = await prisma.area.create({
    data: { name: "SMC2", enabled: true },
  });

  const testArea = await prisma.area.create({
    data: { name: "Test Area (Disabled)", enabled: false },
  });

  console.log("✅ Created 4 areas (3 enabled, 1 disabled)\n");

  // ----- SHIFT COLOURS -----
  console.log("🎨 Creating shift colours...");
  const yellow = await prisma.shiftColour.create({
    data: { name: "Yellow", hexColor: "#FCD34D", enabled: true },
  });

  const orange = await prisma.shiftColour.create({
    data: { name: "Orange", hexColor: "#FB923C", enabled: true },
  });

  const purple = await prisma.shiftColour.create({
    data: { name: "Purple", hexColor: "#A78BFA", enabled: true },
  });

  const green = await prisma.shiftColour.create({
    data: { name: "Green", hexColor: "#34D399", enabled: true },
  });

  const blue = await prisma.shiftColour.create({
    data: { name: "Blue", hexColor: "#60A5FA", enabled: true },
  });

  const red = await prisma.shiftColour.create({
    data: { name: "Red", hexColor: "#F87171", enabled: true },
  });

  console.log("✅ Created 6 shift colours\n");

  // ----- AREA ↔ SHIFT COLOUR ASSOCIATIONS -----
  console.log("🔗 Creating area-shift colour associations...");
  // SWC2: Yellow, Orange, Purple
  await prisma.areaShiftColour.create({
    data: { areaId: swc2.id, shiftColourId: yellow.id },
  });
  await prisma.areaShiftColour.create({
    data: { areaId: swc2.id, shiftColourId: orange.id },
  });
  await prisma.areaShiftColour.create({
    data: { areaId: swc2.id, shiftColourId: purple.id },
  });

  // SWC4: Green, Blue
  await prisma.areaShiftColour.create({
    data: { areaId: swc4.id, shiftColourId: green.id },
  });
  await prisma.areaShiftColour.create({
    data: { areaId: swc4.id, shiftColourId: blue.id },
  });

  // SMC2: Red, Purple, Yellow
  await prisma.areaShiftColour.create({
    data: { areaId: smc2.id, shiftColourId: red.id },
  });
  await prisma.areaShiftColour.create({
    data: { areaId: smc2.id, shiftColourId: purple.id },
  });
  await prisma.areaShiftColour.create({
    data: { areaId: smc2.id, shiftColourId: yellow.id },
  });

  console.log("✅ Created area-shift colour associations\n");

  // ----- SHIFT PATTERNS -----
  console.log("📅 Creating shift patterns...");
  const pattern7Day = await prisma.shiftPattern.create({
    data: {
      name: "7-Day Pattern A",
      cycleLength: 7,
      patternData: JSON.stringify({
        days: [true, true, true, true, false, false, false], // 4 on, 3 off
      }),
    },
  });

  const pattern14Day = await prisma.shiftPattern.create({
    data: {
      name: "14-Day Pattern B",
      cycleLength: 14,
      patternData: JSON.stringify({
        days: [
          true, true, false, true, true, false, false,
          true, true, true, false, false, true, true,
        ], // Complex 14-day pattern
      }),
    },
  });

  const pattern28Day = await prisma.shiftPattern.create({
    data: {
      name: "28-Day Pattern C",
      cycleLength: 28,
      patternData: JSON.stringify({
        days: Array(28)
          .fill(null)
          .map((_, i) => i % 4 !== 3), // 3 on, 1 off repeating
      }),
    },
  });

  console.log("✅ Created 3 shift patterns (7, 14, 28 day cycles)\n");

  // ----- USER SHIFT PATTERN ASSIGNMENTS -----
  console.log("🔄 Assigning shift patterns to users...");
  const patternStartDate = new Date();
  patternStartDate.setDate(patternStartDate.getDate() - 30); // Start 30 days ago

  await prisma.userShiftPattern.create({
    data: {
      userId: user1.id,
      shiftPatternId: pattern7Day.id,
      startDate: patternStartDate,
    },
  });

  await prisma.userShiftPattern.create({
    data: {
      userId: user2.id,
      shiftPatternId: pattern14Day.id,
      startDate: patternStartDate,
    },
  });

  await prisma.userShiftPattern.create({
    data: {
      userId: user3.id,
      shiftPatternId: pattern7Day.id,
      startDate: patternStartDate,
    },
  });

  console.log("✅ Assigned shift patterns to 3 users\n");

  // ----- MANAGER ASSIGNMENTS -----
  console.log("👔 Creating manager assignments...");
  // Manager1 manages user1, user2 in SWC2 for Yellow and Orange
  await prisma.managerAssignment.create({
    data: {
      managerId: manager1.id,
      userId: user1.id,
      areaId: swc2.id,
      shiftColourId: yellow.id,
    },
  });
  await prisma.managerAssignment.create({
    data: {
      managerId: manager1.id,
      userId: user1.id,
      areaId: swc2.id,
      shiftColourId: orange.id,
    },
  });
  await prisma.managerAssignment.create({
    data: {
      managerId: manager1.id,
      userId: user2.id,
      areaId: swc2.id,
      shiftColourId: yellow.id,
    },
  });

  // Manager2 manages user3, user4 in SWC4 for Green and Blue
  await prisma.managerAssignment.create({
    data: {
      managerId: manager2.id,
      userId: user3.id,
      areaId: swc4.id,
      shiftColourId: green.id,
    },
  });
  await prisma.managerAssignment.create({
    data: {
      managerId: manager2.id,
      userId: user4.id,
      areaId: swc4.id,
      shiftColourId: blue.id,
    },
  });

  console.log("✅ Created manager assignments\n");

  // ----- OVERTIME REQUESTS -----
  console.log("⏰ Creating overtime requests...");
  const now = new Date();
  const day = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 1. Open shift in SWC2 - Yellow
  const ot1 = await prisma.overtimeRequest.create({
    data: {
      date: day(1),
      areaId: swc2.id,
      shiftColourId: yellow.id,
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 3,
      status: "OPEN",
    },
  });

  // 2. Open shift in SWC2 - Orange with 1 booking
  const ot2 = await prisma.overtimeRequest.create({
    data: {
      date: day(2),
      areaId: swc2.id,
      shiftColourId: orange.id,
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 2,
      status: "OPEN",
    },
  });
  await prisma.booking.create({
    data: { userId: user1.id, overtimeId: ot2.id },
  });

  // 3. FULL shift in SWC4 - Green
  const ot3 = await prisma.overtimeRequest.create({
    data: {
      date: day(3),
      areaId: swc4.id,
      shiftColourId: green.id,
      startTime: "19:00",
      endTime: "07:00",
      requiredPeople: 2,
      status: "FULL",
    },
  });
  await prisma.booking.create({
    data: { userId: user3.id, overtimeId: ot3.id },
  });
  await prisma.booking.create({
    data: { userId: user4.id, overtimeId: ot3.id },
  });

  // 4. Open shift in SMC2 - Red
  const ot4 = await prisma.overtimeRequest.create({
    data: {
      date: day(4),
      areaId: smc2.id,
      shiftColourId: red.id,
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 2,
      status: "OPEN",
    },
  });

  // 5. Open shift for weekend in SWC2 - Purple
  const ot5 = await prisma.overtimeRequest.create({
    data: {
      date: day(5),
      areaId: swc2.id,
      shiftColourId: purple.id,
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
      areaId: swc4.id,
      shiftColourId: blue.id,
      startTime: "07:00",
      endTime: "19:00",
      requiredPeople: 2,
      status: "ARCHIVED",
    },
  });
  await prisma.booking.create({
    data: { userId: user2.id, overtimeId: ot6.id },
  });

  console.log("✅ Created 6 overtime requests:");
  console.log("   - 4 OPEN shifts");
  console.log("   - 1 FULL shift");
  console.log("   - 1 ARCHIVED shift\n");

  // ----- AUDIT LOGS -----
  console.log("📝 Creating sample audit logs...");
  await prisma.auditLog.create({
    data: {
      action: "USER_CREATED",
      entityType: "User",
      entityId: user1.id,
      creatorId: superAdmin.id,
      affectedUserId: user1.id,
      changes: JSON.stringify({
        name: "Sarah",
        email: "user@test.com",
        role: "USER",
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "OVERTIME_CREATED",
      entityType: "OvertimeRequest",
      entityId: ot1.id,
      creatorId: admin1.id,
      changes: JSON.stringify({
        date: ot1.date.toISOString(),
        area: "SWC2",
        shiftColour: "Yellow",
        requiredPeople: 3,
      }),
    },
  });

  console.log("✅ Created sample audit logs\n");

  console.log("🎉 Version 2 database seeding complete!\n");
  console.log("📧 Test Accounts:");
  console.log("   Super Admin: superadmin@test.com / password123");
  console.log("   Admin: admin@test.com / password123");
  console.log("   Manager 1: manager1@test.com / password123");
  console.log("   Manager 2: manager2@test.com / password123");
  console.log("   Users: user@test.com, john@test.com, emma@test.com, mike@test.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
