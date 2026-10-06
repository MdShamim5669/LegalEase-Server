import prisma from "../src/app/lib/prisma";
import env from "../src/app/config/env";
import { Role, UserStatus } from "../src/generated/prisma/enums.js";

export const DEFAULT_PRACTICE_AREAS = [
  { title: "Family & Divorce Law", icon: "users" },
  { title: "Criminal Defense", icon: "shield" },
  { title: "Corporate & Business Law", icon: "briefcase" },
  { title: "Real Estate & Property", icon: "home" },
  { title: "Labor & Employment Law", icon: "award" },
  { title: "Cyber & Digital Security Law", icon: "lock" },
  { title: "Taxation & Revenue Law", icon: "dollar-sign" },
  { title: "Intellectual Property", icon: "cpu" },
  { title: "Constitutional & Civil Rights", icon: "book-open" },
  { title: "Immigration & Nationality", icon: "globe" },
];

export const seedSuperAdmin = async (client = prisma) => {
  const existingUser = await client.user.findFirst({
    where: { email: env.SUPER_ADMIN_EMAIL },
  });

  if (existingUser) {
    return { created: false, user: existingUser };
  }

  return await client.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: "Super Administrator",
        email: env.SUPER_ADMIN_EMAIL,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        needPasswordChange: false,
      },
    });

    const admin = await tx.admin.create({
      data: {
        userId: user.id,
        name: "Super Administrator",
        email: env.SUPER_ADMIN_EMAIL,
      },
    });

    const account = await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: env.SUPER_ADMIN_PASSWORD,
      },
    });

    return { created: true, user, admin, account };
  });
};

export const seedPracticeAreas = async (client = prisma) => {
  const results = [];
  for (const item of DEFAULT_PRACTICE_AREAS) {
    const record = await client.practiceArea.upsert({
      where: { title: item.title },
      update: { icon: item.icon, isDeleted: false },
      create: { title: item.title, icon: item.icon },
    });
    results.push(record);
  }
  return results;
};

export const main = async () => {
  try {
    const superAdminResult = await seedSuperAdmin();
    const areas = await seedPracticeAreas();
    return { superAdminResult, areasCount: areas.length };
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

if (process.env.NODE_ENV !== "test" && require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error("Seeding failed:", e);
      process.exit(1);
    });
}
