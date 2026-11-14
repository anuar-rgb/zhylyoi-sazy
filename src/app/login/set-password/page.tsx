import { Suspense } from "react";
import SetPasswordForm from "./SetPasswordForm";
import { getSiteOrganization, siteBrand } from "@/lib/organization";

export const metadata = { title: "Новый пароль" };

/** Where the link from a controller's invitation lands: the person chooses their password here. */
export default async function SetPasswordPage() {
  const organization = await getSiteOrganization();
  return (
    <Suspense>
      <SetPasswordForm institution={organization ? siteBrand(organization, "ru").fullName : ""} />
    </Suspense>
  );
}
