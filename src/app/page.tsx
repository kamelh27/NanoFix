import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const store = await cookies();
  const hasToken = store.get("auth_token");
  if (hasToken) redirect("/dashboard");
  redirect("/login");
}
