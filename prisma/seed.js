/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.homepageSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      recentProductsEnabled: true,
      weeklyOffersEnabled: true,
    },
  });

  console.log(
    "Seed complete: homepage settings ensured. Product catalog now managed only via DB/API.",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
