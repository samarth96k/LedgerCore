import type { User } from "@prisma/client";

export type AddUserResult =
  | {
      success: true;
      user: User;
    }
  | {
      success: false;
      message: string;
    };

export interface JwtUserPayload {
  id: string;
  accountId: string;
  role: string;
}
