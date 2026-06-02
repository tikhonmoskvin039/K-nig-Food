/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const {
  generateAdminPassword,
  hashAdminPassword,
  isLikelyStrongPassword,
} = require("../app/lib/adminAuthCore");

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const configuredAdminPassword = process.env.ADMIN_PASSWORD;
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username: adminUsername },
  });
  const generatedAdminPassword =
    existingAdmin || configuredAdminPassword ? null : generateAdminPassword();
  const adminPassword = configuredAdminPassword || generatedAdminPassword;

  if (adminPassword && !isLikelyStrongPassword(adminPassword)) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 16 characters and include lowercase, uppercase, number, and symbol characters.",
    );
  }

  if (adminPassword) {
    await prisma.adminUser.upsert({
      where: { username: adminUsername },
      update: {
        passwordHash: hashAdminPassword(adminPassword),
      },
      create: {
        username: adminUsername,
        passwordHash: hashAdminPassword(adminPassword),
      },
    });
  }

  await prisma.homepageSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      recentProductsEnabled: true,
      weeklyOffersEnabled: true,
    },
  });

  console.log("Seed complete: admin user and homepage settings ensured.");

  if (generatedAdminPassword) {
    console.log("Generated admin credentials:");
    console.log(`  username: ${adminUsername}`);
    console.log(`  password: ${generatedAdminPassword}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
