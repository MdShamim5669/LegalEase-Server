import prisma from "../../lib/prisma";

export const getClientDashboard = async (userId: string) => {
  const client = await prisma.client.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!client) {
    return { upcomingConsultations: [], pastConsultations: [], totalBooked: 0 };
  }

  const [upcoming, past, totalBooked] = await Promise.all([
    prisma.consultation.findMany({
      where: { clientId: client.id, status: "SCHEDULED" },
      include: {
        lawyer: { select: { name: true, profilePhoto: true, barCouncilNo: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.consultation.findMany({
      where: { clientId: client.id, status: { in: ["COMPLETED", "CANCELED"] } },
      include: {
        lawyer: { select: { name: true, profilePhoto: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.consultation.count({ where: { clientId: client.id } }),
  ]);

  return { upcomingConsultations: upcoming, pastConsultations: past, totalBooked };
};

export const getLawyerDashboard = async (userId: string) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!lawyer) {
    return { todayConsultations: [], upcomingConsultations: [], totalEarned: 0 };
  }

  const [upcoming, completed, paidAggregate] = await Promise.all([
    prisma.consultation.findMany({
      where: { lawyerId: lawyer.id, status: "SCHEDULED" },
      include: { client: { select: { name: true, profilePhoto: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.consultation.count({
      where: { lawyerId: lawyer.id, status: "COMPLETED" },
    }),
    prisma.payment.aggregate({
      where: { consultation: { lawyerId: lawyer.id }, status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  return {
    lawyerProfile: {
      name: lawyer.name,
      rating: lawyer.averageRating,
      reviewCount: lawyer.reviewCount,
    },
    upcomingConsultations: upcoming,
    totalCompleted: completed,
    totalEarned: paidAggregate._sum.amount || 0,
  };
};

export const getAdminDashboard = async () => {
  const [totalUsers, totalLawyers, totalConsultations, revenueAggregate] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.lawyer.count({ where: { isDeleted: false, isVerified: true } }),
    prisma.consultation.count(),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    totalVerifiedLawyers: totalLawyers,
    totalConsultations,
    totalPlatformRevenue: revenueAggregate._sum.amount || 0,
  };
};

export const DashboardService = {
  getClientDashboard,
  getLawyerDashboard,
  getAdminDashboard,
};

export default DashboardService;
