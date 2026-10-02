import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintTemplateDetail } from "./components/print-template-detail";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function PrintTemplatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  if (!isManager) redirect("/events");

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      printTemplate: {
        select: {
          id: true,
          blob: true,
        },
      },
    },
  });
  if (!event) redirect("/events");

  return (
    <PrintTemplateDetail
      event={{
        id: event.id,
        title: event.title,
        status: event.status,
      }}
      template={
        event.printTemplate
          ? {
              id: event.printTemplate.id,
              blobUrl: `data:image/svg+xml;base64,${Buffer.from(event.printTemplate.blob).toString("base64")}`,
            }
          : null
      }
    />
  );
}
