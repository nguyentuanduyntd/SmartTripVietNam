import "server-only";

import {
    getCurrentUser,
    type CurrentAppUser,
} from "./get-current-user";

type UserCheckResult =
    | {
          ok: true;
          user: CurrentAppUser;
      }
    | {
          ok: false;
          status: 401;
          message: string;
      };

export async function requireUser(): Promise<UserCheckResult> {
    const user = await getCurrentUser();

    if (!user) {
        return {
            ok: false,
            status: 401,
            message: "Bạn cần đăng nhập để sử dụng hành trình này.",
        };
    }

    return {
        ok: true,
        user,
    };
}