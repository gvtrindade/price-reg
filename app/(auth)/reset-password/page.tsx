"use client"

import { useForm } from "react-hook-form"
import { useTransition, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPasswordAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "@/components/password-strength"
import { useTranslations } from "next-intl"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const t = useTranslations("ResetPassword")
  const tv = useTranslations("Validation")
  const ta = useTranslations("Auth")
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ newPassword: string; confirmPassword: string }>()

  const onSubmit = (data: { newPassword: string }) => {
    if (!token) {
      setError(t("invalidToken"))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await resetPasswordAction({
        token,
        newPassword: data.newPassword,
      })
      if (res?.error) {
        setError(res.error)
      } else {
        router.push("/login")
      }
    })
  }

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("invalidLinkTitle")}</CardTitle>
          <CardDescription>
            {t("invalidLinkDescription")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <a
            href="/forgot-password"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            {t("requestNewLink")}
          </a>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  if (!/[a-z]/.test(val)) return tv("lowercaseRequired")
                  if (!/[A-Z]/.test(val)) return tv("uppercaseRequired")
                  if (!/\d/.test(val)) return tv("numberRequired")
                  if (!/[^a-zA-Z0-9]/.test(val)) return tv("symbolRequired")
                  return true
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
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
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
      <CardFooter className="justify-center">
        <a
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {ta("backToLogin")}
        </a>
      </CardFooter>
    </Card>
  )
}
