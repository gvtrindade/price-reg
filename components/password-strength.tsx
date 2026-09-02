"use client"

import { useTranslations } from "next-intl"

interface PasswordRequirement {
  label: string
  met: boolean
}

interface PasswordStrengthProps {
  value: string
}

export function PasswordStrength({ value }: PasswordStrengthProps) {
  const t = useTranslations("PasswordStrength")

  const requirements: PasswordRequirement[] = [
    { label: t("minLength"), met: value.length >= 8 },
    { label: t("lowercase"), met: /[a-z]/.test(value) },
    { label: t("uppercase"), met: /[A-Z]/.test(value) },
    { label: t("number"), met: /\d/.test(value) },
    { label: t("symbol"), met: /[^a-zA-Z0-9]/.test(value) },
  ]

  const strength = requirements.filter((r) => r.met).length
  const percentage = (strength / requirements.length) * 100

  const barColor =
    strength <= 1
      ? "bg-destructive"
      : strength <= 3
        ? "bg-yellow-500"
        : "bg-emerald-500"

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ul className="space-y-0.5">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={`text-xs ${req.met ? "text-emerald-500" : "text-muted-foreground"}`}
          >
            {req.met ? "✓ " : "✗ "}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
