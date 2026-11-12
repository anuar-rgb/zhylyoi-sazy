import { Suspense } from "react";
import SetPasswordForm from "./SetPasswordForm";

export const metadata = { title: "Новый пароль" };

/** Where the link from a controller's invitation lands: the person chooses their password here. */
export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
