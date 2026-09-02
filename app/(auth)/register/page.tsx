"use client"

import { useForm } from "react-hook-form"
import { useTransition, useState } from "react"
import { signupAction } from "@/actions/auth"
import { authClient } from "@/lib/auth-client"
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

export default function RegisterPage() {
  const t = useTranslations("Register")
  const tv = useTranslations("Validation")
  const ta = useTranslations("Auth")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    name: string
    email: string
    password: string
    confirmPassword: string
  }>()

  const onSubmit = (data: {
    name: string
    email: string
    password: string
  }) => {
    setError(null)
    startTransition(async () => {
      const res = await signupAction({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      if (res?.error) {
        setError(res.error)
      } else if (res?.success) {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("verifyEmailTitle")}</CardTitle>
          <CardDescription>
            {t("verifyEmailDescription")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <a
            href="/login"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            {ta("backToLogin")}
          </a>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              placeholder={t("namePlaceholder")}
              {...register("name", {
                required: tv("nameRequired"),
                minLength: {
                  value: 2,
                  message: tv("nameMinLength"),
                },
                pattern: {
                  value: /^\s*\S+(?:\s+\S+)+\s*$/,
                  message: tv("fullNameRequired")
                },
                setValueAs: (v: string) => v.replace(/\b\w/g, c => c.toUpperCase())
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              {...register("email", {
                required: tv("emailRequired"),
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: tv("emailInvalid"),
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              {...register("password", {
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
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            <PasswordStrength value={watch("password") ?? ""} />
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
                  val === watch("password") || tv("passwordsMismatch"),
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
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t("orContinueWith")}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() =>
            authClient.signIn.social({ provider: "google" })
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-5">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <a
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {t("signInLink")}
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}
