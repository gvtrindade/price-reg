"use client";

import {
  assignEventUserAction,
  unassignEventUserAction,
} from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface EventMemberUser {
  id: string;
  name: string;
  email: string;
}

export function EventMembersDialog({
  open,
  onOpenChange,
  eventId,
  users,
  assignedUserIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  users: EventMemberUser[];
  assignedUserIds: string[];
}) {
  const t = useTranslations("EventDetail");
  const router = useRouter();
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(assignedUserIds),
  );
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(userId: string) {
    const isAssigned = assigned.has(userId);
    setPendingUserId(userId);
    setError(null);

    const res = isAssigned
      ? await unassignEventUserAction({ eventId, userId })
      : await assignEventUserAction({ eventId, userId });

    setPendingUserId(null);
    if (res?.error) {
      setError(res.error);
      return;
    }

    setAssigned((prev) => {
      const next = new Set(prev);
      if (isAssigned) next.delete(userId);
      else next.add(userId);
      return next;
    });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("membersTitle")}</DialogTitle>
          <DialogDescription>{t("membersDescription")}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ul className="divide-y rounded-lg border">
          {users.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">
              {t("noUsers")}
            </li>
          ) : (
            users.map((user) => {
              const isAssigned = assigned.has(user.id);
              return (
                <li key={user.id} className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    disabled={pendingUserId !== null}
                    onChange={() => toggle(user.id)}
                    aria-label={user.name}
                    className="h-4 w-4 rounded border-gray-300 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
