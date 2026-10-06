export interface IUpdateLawyerPayload {
  name?: string;
  contactNumber?: string;
  profilePhoto?: string;
  chamberAddress?: string;
  consultationFee?: number;
  experience?: number;
  languages?: string[];
  bio?: string;
  practiceAreaIds?: string[];
}

export interface IVerifyLawyerPayload {
  isVerified: boolean;
  verificationNote?: string;
}
