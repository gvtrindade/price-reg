"use client";

import { addUserRoleAction, removeUserRoleAction } from "@/actions/users";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

const ROLE_OPTIONS = ["VOLUNTEER", "MANAGER", "ADMIN"] as const;

export function UserTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const t = useTranslations("UserTable");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(userId: string, action: () => Promise<{ error: string | null }>) {
    setError(null);
    setPendingUserId(userId);
    startTransition(async () => {
      const res = await action();
      setPendingUserId(null);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-3 font-medium">{t("name")}</th>
            <th className="p-3 font-medium">{t("email")}</th>
            <th className="p-3 font-medium">{t("roles")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const missingRoles = ROLE_OPTIONS.filter(
              (r) => !user.roles.includes(r),
            );
            const busy = isPending && pendingUserId === user.id;
            return (
              <tr
                key={user.id}
                onClick={() => router.push(`/settings/users/${user.id}`)}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/50"
              >
                <td className="p-3 font-medium">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("you")}
                    </span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{user.email}</td>
                <td className="p-3">
                  <div
                    className="flex flex-wrap items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs"
                      >
                        {t(`role.${role}` as "role.VOLUNTEER")}
                        <button
                          type="button"
                          aria-label={t("removeRole")}
                          disabled={busy}
                          className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={() =>
                            run(user.id, () =>
                              removeUserRoleAction({
                                userId: user.id,
                                role,
                              }),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {missingRoles.length > 0 && (
                      <select
                        aria-label={t("addRole")}
                        disabled={busy}
                        value=""
                        className={cn(
                          "cursor-pointer rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground",
                          "hover:border-solid hover:text-foreground disabled:opacity-50",
                        )}
                        onChange={(e) => {
                          const role = e.target.value;
                          if (!role) return;
                          run(user.id, () =>
                            addUserRoleAction({ userId: user.id, role }),
                          );
                        }}
                      >
                        <option value="" disabled>
                          {t("addRole")}
                        </option>
                        {missingRoles.map((role) => (
                          <option key={role} value={role}>
                            {t(`role.${role}` as "role.VOLUNTEER")}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="p-3 text-muted-foreground">
                {t("empty")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
