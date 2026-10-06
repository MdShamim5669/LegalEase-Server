export interface IRegisterClientPayload {
  name: string;
  email: string;
  password?: string;
  contactNumber?: string;
}

export interface ILoginPayload {
  email: string;
  password?: string;
}

export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface IChangePasswordPayload {
  oldPassword?: string;
  newPassword: string;
}
