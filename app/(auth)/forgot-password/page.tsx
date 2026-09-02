"use client"

import { useForm } from "react-hook-form"
import { useTransition, useState } from "react"
import { forgotPasswordAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPassword")
  const tv = useTranslations("Validation")
  const ta = useTranslations("Auth")
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>()

  const onSubmit = (data: { email: string }) => {
    setError(null)
    startTransition(async () => {
      await forgotPasswordAction(data)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("sentTitle")}</CardTitle>
          <CardDescription>
            {t("sentDescription")}
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
