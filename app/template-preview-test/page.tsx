import { PrintTemplateDetail } from "@/app/(main)/events/[eventId]/template/components/print-template-detail";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export default function Page() {
  const svg = fs.readFileSync(path.join(process.cwd(), "Untitled.svg"));
  const blobUrl = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return (
    <PrintTemplateDetail
      event={{ id: "test", title: "Test", status: "ACTIVE" }}
      template={{ id: "t", blobUrl }}
    />
  );
}
