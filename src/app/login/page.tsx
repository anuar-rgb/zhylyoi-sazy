import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";
import { getSiteOrganization, siteBrand } from "@/lib/organization";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/admin");

  const organization = await getSiteOrganization();
  return <LoginForm institution={organization ? siteBrand(organization, "ru").fullName : ""} />;
}
