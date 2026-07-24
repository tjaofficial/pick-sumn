import {
  router,
} from "expo-router";
import {
  useEffect,
  useRef,
} from "react";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  joinGroup,
} from "@/features/groups/groupsService";
import {
  clearPendingGroupJoinCode,
  getPendingGroupJoinCode,
} from "@/features/groups/pendingGroupInvite";


export function PendingGroupInviteHandler() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  const running =
    useRef(false);


  useEffect(() => {
    if (
      isLoading
      || !isAuthenticated
      || running.current
    ) {
      return;
    }

    async function processInvite() {
      running.current = true;

      try {
        const joinCode =
          await getPendingGroupJoinCode();

        if (!joinCode) {
          return;
        }

        const group =
          await joinGroup({
            join_code:
              joinCode,
          });

        await clearPendingGroupJoinCode();

        router.replace({
          pathname:
            "/groups/[id]",
          params: {
            id: group.id,
          },
        });
      } catch {
      } finally {
        running.current = false;
      }
    }

    void processInvite();
  }, [
    isAuthenticated,
    isLoading,
  ]);


  return null;
}
