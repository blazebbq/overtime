import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting FitFinish seed...");

  // ----- USERS -----
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fitfinish.com" },
    update: {},
    create: {
      email: "admin@fitfinish.com",
      name: "Admin User",
      passwordHash: passwordHash,
      role: "Admin",
    },
  });
  console.log("✅ Created Admin user: admin@fitfinish.com / password123");

  const qaUser = await prisma.user.upsert({
    where: { email: "qa@fitfinish.com" },
    update: {},
    create: {
      email: "qa@fitfinish.com",
      name: "QA Inspector",
      passwordHash: passwordHash,
      role: "QA",
    },
  });
  console.log("✅ Created QA user: qa@fitfinish.com / password123");

  const engineeringManager = await prisma.user.upsert({
    where: { email: "manager@fitfinish.com" },
    update: {},
    create: {
      email: "manager@fitfinish.com",
      name: "Engineering Manager",
      passwordHash: passwordHash,
      role: "EngineeringManager",
    },
  });
  console.log("✅ Created Engineering Manager: manager@fitfinish.com / password123");

  const regularUser = await prisma.user.upsert({
    where: { email: "user@fitfinish.com" },
    update: {},
    create: {
      email: "user@fitfinish.com",
      name: "Regular User",
      passwordHash: passwordHash,
      role: "User",
    },
  });
  console.log("✅ Created Regular User: user@fitfinish.com / password123");

  // ----- ISSUE TYPES -----
  const issueTypeCount = await prisma.issueType.count();
  if (issueTypeCount === 0) {
    const issueTypes = [
      { name: "Rust", sortOrder: 1 },
      { name: "Damage", sortOrder: 2 },
      { name: "Crack", sortOrder: 3 },
      { name: "Flickering Light", sortOrder: 4 },
      { name: "Wall Vinyl Damage", sortOrder: 5 },
      { name: "Plasterboard Repair", sortOrder: 6 },
      { name: "Missing Label", sortOrder: 7 },
      { name: "Cleanliness", sortOrder: 8 },
      { name: "Paint Touch-up Required", sortOrder: 9 },
      { name: "Door Hardware Issue", sortOrder: 10 },
      { name: "Floor Damage", sortOrder: 11 },
      { name: "Ceiling Issue", sortOrder: 12 },
    ];

    await prisma.issueType.createMany({
      data: issueTypes,
    });
    console.log(`✅ Created ${issueTypes.length} issue types`);
  } else {
    console.log("ℹ️  Issue types already exist, skipping");
  }

  console.log("✅ FitFinish seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
