import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 STARTING SEED");

  console.log("🧹 Deleting users...");
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("👤 Creating users...");
  await prisma.user.createMany({
    data: [
      {
        email: "thomas.cahill@thermofisher.com",
        name: "Tom Cahill",
        password: passwordHash,
        role: "SUPER_ADMIN",
      },
      {
        email: "rachael.davis2@thermofisher.com",
        name: "Rachael Davis",
        password: passwordHash,
        role: "SUPER_ADMIN",
      },
    ],
  });

  console.log("✅ SEED COMPLETE");
}

main()
  .catch((e) => {
    console.error("❌ SEED ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
