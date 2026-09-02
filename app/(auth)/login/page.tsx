"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"

export default function LoginPage() {
  const t = useTranslations("Login")
  const tv = useTranslations("Validation")
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ email: string; password: string }>()

  const email = watch("email")

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null)
    setEmailNotVerified(false)
    setIsPending(true)
    const { error: authError } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    })
    setIsPending(false)
    if (authError) {
      if (authError.status === 403) {
        setEmailNotVerified(true)
        setError(t("accountNotVerified"))
      } else {
        setError(authError.message ?? t("invalidCredentials"))
      }
    } else {
      router.replace("/protected")
    }
  }

  const handleResendVerification = async () => {
    setResendState("sending")
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResendState("sent")
      } else {
        setResendState("error")
      }
    } catch {
      setResendState("error")
    }
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
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <a
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              {...register("password", {
                required: tv("passwordRequired"),
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          {emailNotVerified && (
            <div className="text-center space-y-2">
              {resendState === "sent" ? (
                <p className="text-sm text-green-600">{t("resentSuccess")}</p>
              ) : resendState === "error" ? (
                <p className="text-sm text-destructive">{t("resentError")}</p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={resendState === "sending"}
                  onClick={handleResendVerification}
                >
                  {resendState === "sending" ? t("sending") : t("resendVerification")}
                </Button>
              )}
            </div>
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
          {t("noAccount")}{" "}
          <a
            href="/register"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {t("signUpLink")}
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}
