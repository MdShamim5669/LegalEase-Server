import { Role, UserStatus } from "../../generated/prisma/enums.js";

export interface IAuthUser {
  userId: string;
  email: string;
  role: Role;
  status: UserStatus;
  profileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
    }
  }
}
