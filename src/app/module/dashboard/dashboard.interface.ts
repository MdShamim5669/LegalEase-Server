export interface IClientDashboardData {
  upcomingConsultations: unknown[];
  pastConsultations: unknown[];
  totalBooked: number;
}

export interface ILawyerDashboardData {
  lawyerProfile?: {
    name: string;
    rating: number;
    reviewCount: number;
  };
  upcomingConsultations: unknown[];
  totalCompleted: number;
  totalEarned: number;
}

export interface IAdminDashboardData {
  totalUsers: number;
  totalVerifiedLawyers: number;
  totalConsultations: number;
  totalPlatformRevenue: number;
}
