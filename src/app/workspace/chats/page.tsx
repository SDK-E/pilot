import { redirect } from "next/navigation";

/** Chat history is available through the private Command-K palette. */
export default function ChatsPage() {
  redirect("/workspace");
}
