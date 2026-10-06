import prisma from "../src/app/lib/prisma";
import env from "../src/app/config/env";
import { Role, UserStatus, Gender, ConsultationType, ConsultationStatus, PaymentStatus } from "../src/generated/prisma/enums.js";

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

export const REAL_LAWYERS_DATA = [
  {
    name: "Advocate Rafiqul Islam",
    email: "rafiqul.law@legalease.com",
    contactNumber: "+8801711002233",
    gender: Gender.MALE,
    barCouncilNo: "DH-10294/2012",
    consultationFee: 2500,
    experience: 14,
    bio: "Senior Advocate at the Supreme Court of Bangladesh, Appellate Division. Specialized in Constitutional Writ, Criminal Appeals, and High Court matters with over 14 years of successful trial experience.",
    chamberAddress: "Room 402, Supreme Court Bar Association Building, Shahbag, Dhaka",
    practiceAreas: ["Constitutional & Civil Rights", "Criminal Defense"],
    initialRating: 4.9,
    initialReviewCount: 18,
  },
  {
    name: "Barrister Sara Hossain",
    email: "sara.hossain@legalease.com",
    contactNumber: "+8801819223344",
    gender: Gender.FEMALE,
    barCouncilNo: "DH-14820/2015",
    consultationFee: 3000,
    experience: 11,
    bio: "Barrister-at-Law (Lincoln's Inn). Renowned legal practitioner specializing in Family Law, Child Custody, Marital Property Settlement, and Corporate Governance.",
    chamberAddress: "Suite 7B, Concord Tower, 113 Kazi Nazrul Islam Avenue, Banglamotor, Dhaka",
    practiceAreas: ["Family & Divorce Law", "Corporate & Business Law"],
    initialRating: 5.0,
    initialReviewCount: 24,
  },
  {
    name: "Advocate Tanvir Ahmed",
    email: "tanvir.ahmed@legalease.com",
    contactNumber: "+8801912334455",
    gender: Gender.MALE,
    barCouncilNo: "DH-22019/2018",
    consultationFee: 2000,
    experience: 8,
    bio: "Advocate specializing in Commercial Contracts, Tech Startup Compliance, Intellectual Property, and Cross-border Transactions.",
    chamberAddress: "Level 5, Simpletree Anarkali, 89 Gulshan Avenue, Dhaka",
    practiceAreas: ["Corporate & Business Law", "Intellectual Property", "Taxation & Revenue Law"],
    initialRating: 4.8,
    initialReviewCount: 15,
  },
  {
    name: "Advocate Farhana Yasmin",
    email: "farhana.yasmin@legalease.com",
    contactNumber: "+8801715445566",
    gender: Gender.FEMALE,
    barCouncilNo: "CTG-09312/2016",
    consultationFee: 1800,
    experience: 9,
    bio: "Experienced property and land dispute attorney at District & Sessions Judge Court, Chattogram. Expert in title verification, deeds, and land registration.",
    chamberAddress: "Chamber 12, Court Building Road, Kotwali, Chattogram",
    practiceAreas: ["Real Estate & Property", "Civil Rights"],
    initialRating: 4.7,
    initialReviewCount: 12,
  },
  {
    name: "Advocate Mahfuzur Rahman",
    email: "mahfuz.cyber@legalease.com",
    contactNumber: "+8801611556677",
    gender: Gender.MALE,
    barCouncilNo: "SYL-05118/2020",
    consultationFee: 1500,
    experience: 6,
    bio: "Cyber Law consultant and digital forensic legal advisor. Specialized in Digital Security Act defense, financial cyber fraud, and online data privacy protection.",
    chamberAddress: "Zindabazar Legal Arcade, 3rd Floor, Sylhet",
    practiceAreas: ["Cyber & Digital Security Law", "Criminal Defense"],
    initialRating: 4.9,
    initialReviewCount: 9,
  },
];

export const seedSuperAdmin = async (client = prisma) => {
  const existingUser = await client.user.findFirst({
    where: { email: env.SUPER_ADMIN_EMAIL },
  });

  if (existingUser) {
    return { created: false, user: existingUser };
  }

  return await client.$transaction(async (tx: any) => {
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

export const seedRealLawyers = async (client = prisma) => {
  const seededLawyers = [];

  for (const lawyerData of REAL_LAWYERS_DATA) {
    const existingUser = await client.user.findFirst({
      where: { email: lawyerData.email },
    });

    let lawyerRecord;

    if (!existingUser) {
      const user = await client.user.create({
        data: {
          name: lawyerData.name,
          email: lawyerData.email,
          role: Role.LAWYER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          needPasswordChange: false,
        },
      });

      await client.account.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: "LawyerPassword123!",
        },
      });

      lawyerRecord = await client.lawyer.create({
        data: {
          userId: user.id,
          name: lawyerData.name,
          email: lawyerData.email,
          contactNumber: lawyerData.contactNumber,
          gender: lawyerData.gender,
          barCouncilNo: lawyerData.barCouncilNo,
          consultationFee: lawyerData.consultationFee,
          experience: lawyerData.experience,
          bio: lawyerData.bio,
          chamberAddress: lawyerData.chamberAddress,
          isVerified: true,
          verifiedAt: new Date(),
          averageRating: lawyerData.initialRating,
          reviewCount: lawyerData.initialReviewCount,
        },
      });
    } else {
      lawyerRecord = await client.lawyer.findFirst({
        where: { userId: existingUser.id },
      });
    }

    if (lawyerRecord) {
      for (const areaTitle of lawyerData.practiceAreas) {
        const pa = await client.practiceArea.findFirst({ where: { title: areaTitle } });
        if (pa) {
          await client.lawyerPracticeArea.upsert({
            where: {
              lawyerId_practiceAreaId: {
                lawyerId: lawyerRecord.id,
                practiceAreaId: pa.id,
              },
            },
            update: {},
            create: {
              lawyerId: lawyerRecord.id,
              practiceAreaId: pa.id,
            },
          });
        }
      }
      seededLawyers.push(lawyerRecord);
    }
  }

  return seededLawyers;
};

export const seedRealClients = async (client = prisma) => {
  const clientsData = [
    {
      name: "Tariqul Hasan",
      email: "tariqul.client@example.com",
      contactNumber: "+8801712345678",
      address: "House 45, Road 11, Banani, Dhaka",
    },
    {
      name: "Nusrat Jahan",
      email: "nusrat.jahan@example.com",
      contactNumber: "+8801812345678",
      address: "GEC Circle, Nasirabad, Chattogram",
    },
    {
      name: "Kamrul Islam",
      email: "kamrul.islam@example.com",
      contactNumber: "+8801912345678",
      address: "Dhanmondi 27, Dhaka",
    },
  ];

  const seededClients = [];
  for (const c of clientsData) {
    let user = await client.user.findFirst({ where: { email: c.email } });
    if (!user) {
      user = await client.user.create({
        data: {
          name: c.name,
          email: c.email,
          role: Role.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          needPasswordChange: false,
        },
      });

      await client.account.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: "ClientPassword123!",
        },
      });

      const clientRec = await client.client.create({
        data: {
          userId: user.id,
          name: c.name,
          email: c.email,
          contactNumber: c.contactNumber,
          address: c.address,
        },
      });
      seededClients.push(clientRec);
    } else {
      const clientRec = await client.client.findFirst({ where: { userId: user.id } });
      if (clientRec) seededClients.push(clientRec);
    }
  }
  return seededClients;
};

export const seedRealSchedulesAndConsultations = async (
  client = prisma,
  lawyers: any[],
  clients: any[]
) => {
  if (lawyers.length === 0 || clients.length === 0) return;

  const now = new Date();
  for (let i = 0; i < lawyers.length; i++) {
    const lawyer = lawyers[i];
    const clientUser = clients[i % clients.length];

    // Create 3 schedules: 1 past completed, 1 upcoming booked, 1 open slot
    const slotTimes = [
      {
        start: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        end: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: ConsultationStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        isBooked: true,
      },
      {
        start: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        end: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: ConsultationStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PAID,
        isBooked: true,
      },
      {
        start: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // in 3 days
        end: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: null,
        paymentStatus: null,
        isBooked: false,
      },
    ];

    for (const slot of slotTimes) {
      const schedule = await client.schedule.upsert({
        where: {
          startDateTime_endDateTime: {
            startDateTime: slot.start,
            endDateTime: slot.end,
          },
        },
        update: {},
        create: {
          startDateTime: slot.start,
          endDateTime: slot.end,
        },
      });

      await client.lawyerSchedule.upsert({
        where: {
          lawyerId_scheduleId: {
            lawyerId: lawyer.id,
            scheduleId: schedule.id,
          },
        },
        update: { isBooked: slot.isBooked },
        create: {
          lawyerId: lawyer.id,
          scheduleId: schedule.id,
          isBooked: slot.isBooked,
        },
      });

      if (slot.status) {
        const videoCallingId = `room_seed_${lawyer.id.slice(0, 5)}_${schedule.id.slice(0, 5)}`;
        const existingCons = await client.consultation.findUnique({
          where: { videoCallingId },
        });

        if (!existingCons) {
          const consultation = await client.consultation.create({
            data: {
              clientId: clientUser.id,
              lawyerId: lawyer.id,
              scheduleId: schedule.id,
              type: ConsultationType.VIDEO,
              status: slot.status,
              paymentStatus: slot.paymentStatus,
              topic: "Legal Consultation & Document Advisory",
              videoCallingId,
            },
          });

          await client.payment.create({
            data: {
              consultationId: consultation.id,
              amount: lawyer.consultationFee,
              status: slot.paymentStatus,
              transactionId: `txn_seed_${consultation.id.slice(0, 8)}`,
              paidAt: slot.start,
            },
          });

          if (slot.status === ConsultationStatus.COMPLETED) {
            await client.review.create({
              data: {
                consultationId: consultation.id,
                clientId: clientUser.id,
                lawyerId: lawyer.id,
                rating: 5,
                comment: "অত্যন্ত দক্ষ এবং সহযোগিতাপূর্ণ উকিল। আমার আইনি সমস্যা নিখুঁতভাবে বিশ্লেষণ করে সমাধান দিয়েছেন। Highly recommended!",
                isHidden: false,
              },
            });
          }
        }
      }
    }
  }
};

export const main = async () => {
  try {
    const superAdminResult = await seedSuperAdmin();
    const areas = await seedPracticeAreas();
    const lawyers = await seedRealLawyers();
    const clients = await seedRealClients();
    await seedRealSchedulesAndConsultations(prisma, lawyers, clients);

    return {
      superAdminResult,
      areasCount: areas.length,
      lawyersCount: lawyers.length,
      clientsCount: clients.length,
    };
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

if (process.env.NODE_ENV !== "test" && require.main === module) {
  main()
    .then((summary) => {
      console.log("Database seeded with authentic data:", summary);
      process.exit(0);
    })
    .catch((e) => {
      console.error("Seeding failed:", e);
      process.exit(1);
    });
}
