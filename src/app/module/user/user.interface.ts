import { Gender, UserStatus } from "../../../generated/prisma/enums.js";

export interface ICreateLawyerPayload {
  name: string;
  email: string;
  contactNumber: string;
  gender: Gender;
  barCouncilNo: string;
  consultationFee: number;
  experience?: number;
  chamberAddress?: string;
  practiceAreaIds?: string[];
}

export interface ICreateAdminPayload {
  name: string;
  email: string;
  contactNumber?: string;
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}
