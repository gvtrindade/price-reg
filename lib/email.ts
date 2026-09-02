import { getTranslations } from "next-intl/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY)

function emailShell(heading: string, body: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${heading}</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        ${body}
      </div>
    </div>
  `
}

export async function sendResetPasswordEmail(params: {
  to: string
  url: string
}) {
  const t = await getTranslations("Emails.resetPassword")
  const html = emailShell(
    t("heading"),
    `
        <p style="margin: 0 0 16px;">${t("intro")}</p>
        <p style="margin: 0 0 24px;">${t("instructions")}</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${params.url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            ${t("cta")}
          </a>
        </div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
          ${t("ignoreNote")}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          ${t("fallbackNote")}<br />
          <a href="${params.url}" style="color: #2563eb;">${params.url}</a>
        </p>
    `,
  )

  await resend.emails.send({
    from: process.env.RESEND_SENDER as string,
    to: params.to,
    subject: t("subject"),
    html,
  })
}

export async function sendVerificationEmail(params: {
  to: string
  url: string
}) {
  const t = await getTranslations("Emails.verification")
  const html = emailShell(
    t("heading"),
    `
        <p style="margin: 0 0 16px;">${t("intro")}</p>
        <p style="margin: 0 0 24px;">${t("instructions")}</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${params.url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            ${t("cta")}
          </a>
        </div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
          ${t("ignoreNote")}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          ${t("fallbackNote")}<br />
          <a href="${params.url}" style="color: #2563eb;">${params.url}</a>
        </p>
    `,
  )

  await resend.emails.send({
    from: process.env.RESEND_SENDER as string,
    to: params.to,
    subject: t("subject"),
    html,
  })
}

export async function sendTemporaryPasswordEmail(params: {
  to: string
  name: string
  password: string
}) {
  const t = await getTranslations("Emails.temporaryPassword")
  const html = emailShell(
    t("heading"),
    `
        <p style="margin: 0 0 16px;">${t("intro", { name: params.name })}</p>
        <p style="margin: 0 0 8px;">${t("instructions")}</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 12px 24px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: 600; letter-spacing: 1px;">${params.password}</span>
        </div>
        <p style="margin: 0; font-size: 14px; color: #dc2626;">
          ${t("warning")}
        </p>
    `,
  )

  await resend.emails.send({
    from: process.env.RESEND_SENDER as string,
    to: params.to,
    subject: t("subject"),
    html,
  })
}
