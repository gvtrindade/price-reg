"use client";

import { resetUserPasswordAction, updateUserEmailAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface UserDetailProps {
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    emailVerified: boolean;
  };
}

export function UserDetail({ user }: UserDetailProps) {
  const t = useTranslations("UserDetail");
  const tv = useTranslations("Validation");
  const tu = useTranslations("UserTable");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [emailResult, setEmailResult] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<{ email: string }>({ defaultValues: { email: user.email } });

  const onSubmitEmail = (data: { email: string }) => {
    setEmailResult("idle");
    setEmailError(null);
    startTransition(async () => {
      const res = await updateUserEmailAction({ userId: user.id, email: data.email });
      if (res?.error) {
        setEmailResult("error");
        setEmailError(res.error);
      } else {
        setEmailResult("success");
        router.refresh();
      }
    });
  };

  const onResetPassword = () => {
    setResetResult("idle");
    startTransition(async () => {
      const res = await resetUserPasswordAction({ userId: user.id });
      setResetResult(res?.error ? "error" : "success");
      if (!res?.error) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("roles")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-accent px-2 py-0.5 text-xs"
            >
              {tu(`role.${role}` as "role.VOLUNTEER")}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("emailCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                required: tv("emailRequired"),
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: tv("emailInvalid"),
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            {emailResult === "success" && (
              <p className="text-sm text-green-600">{t("emailUpdated")}</p>
            )}
            {emailResult === "error" && emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("passwordCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("passwordCardDescription")}
          </p>
          {resetResult === "success" && (
            <p className="text-sm text-green-600">{t("passwordSent")}</p>
          )}
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onResetPassword}
          >
            {isPending ? t("resetting") : t("resetPassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
