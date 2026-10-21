import { prisma } from "@/lib/prisma";

const MANAGER_ROLES = ["MANAGER", "ADMIN"];

export function isManagerRole(roles: string[] | undefined): boolean {
  return !!roles?.some((role) => MANAGER_ROLES.includes(role));
}

/**
 * Managers and admins can manage every event. Other users can manage an event
 * only when they have been assigned to it (EventUser).
 */
export async function canManageEvent(
  userId: string,
  roles: string[] | undefined,
  eventId: string,
): Promise<boolean> {
  if (isManagerRole(roles)) return true;

  const assignment = await prisma.eventUser.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { userId: true },
  });
  return assignment !== null;
}
