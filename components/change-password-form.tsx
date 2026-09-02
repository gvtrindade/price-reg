"use client";

import { changePasswordAction } from "@/actions/auth";
import { PasswordStrength } from "@/components/password-strength";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

export function ChangePasswordForm({ mode }: { mode: "settings" | "forced" }) {
  const t = useTranslations("ChangePassword");
  const tv = useTranslations("Validation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const onSubmit = (data: { currentPassword: string; newPassword: string }) => {
    setError(null);
    startTransition(async () => {
      const res = await changePasswordAction({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (mode === "settings") {
        await authClient.signOut();
        router.replace("/login?password-changed=true");
      } else {
        router.replace("/events");
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t("currentPasswordLabel")}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder={t("currentPasswordPlaceholder")}
              {...register("currentPassword", {
                required: tv("passwordRequired"),
              })}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder={t("newPasswordPlaceholder")}
              {...register("newPassword", {
                required: tv("passwordRequired"),
                minLength: {
                  value: 8,
                  message: tv("passwordMinLength"),
                },
                validate: (val: string) => {
                  if (!/[a-z]/.test(val)) return tv("lowercaseRequired");
                  if (!/[A-Z]/.test(val)) return tv("uppercaseRequired");
                  if (!/\d/.test(val)) return tv("numberRequired");
                  if (!/[^a-zA-Z0-9]/.test(val)) return tv("symbolRequired");
                  return true;
                },
              })}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
            <PasswordStrength value={watch("newPassword") ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t("confirmPasswordLabel")}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t("confirmPasswordPlaceholder")}
              {...register("confirmPassword", {
                required: tv("confirmPasswordRequired"),
                validate: (val: string) =>
                  val === watch("newPassword") || tv("passwordsMismatch"),
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
      {mode === "settings" ? (
        <CardFooter className="justify-center">
          <a
            href="/settings"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("backToSettings")}
          </a>
        </CardFooter>
      ) : (
        <CardFooter className="justify-center">
          <a
            href="#"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={async (e) => {
              e.preventDefault();
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            {t("signOut")}
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
