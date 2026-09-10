import { redirect } from "next/navigation";

/** Existing bookmarks now open the unified Personas management surface. */
export default function AgentFleetPage() {
  redirect("/workspace/personas");
}
