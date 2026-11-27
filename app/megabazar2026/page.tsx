import type { Metadata } from "next";
import { MegaBazarList } from "./components/mega-bazar-list";

export const metadata: Metadata = {
  title: "Mega Bazar 2026",
};

export default function MegaBazarPage() {
  return <MegaBazarList />;
}
