"use client";

import { useEffect, useRef } from "react";
import { clearDraft, isBlankDraft, readDraft, sessionDraftStorage, writeDraft } from "@/lib/formDraft";

type Fields = Record<string, string>;

/** The form's text fields by name. Checkboxes (consent) are left out on purpose. */
function textFields(form: HTMLFormElement): (HTMLInputElement | HTMLTextAreaElement)[] {
  return Array.from(form.elements).filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement =>
      (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["checkbox", "radio", "hidden", "submit", "file", "password"].includes(el.type))) &&
      Boolean(el.name)
  );
}

/**
 * A plain form whose typed-in text survives a reload of the tab (formDraft.ts). It is cleared when the
 * form is sent. For forms whose fields are not React state, such as the contact form on Contacts.
 */
export default function DraftForm({
  draftKey,
  children,
  ...rest
}: { draftKey: string; children: React.ReactNode } & React.FormHTMLAttributes<HTMLFormElement>) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const draft = readDraft<Fields>(sessionDraftStorage(), draftKey);
    if (!draft) return;
    for (const field of textFields(form)) {
      if (!field.value && typeof draft[field.name] === "string") field.value = draft[field.name];
    }
  }, [draftKey]);

  function save() {
    const form = ref.current;
    if (!form) return;
    const fields: Fields = Object.fromEntries(textFields(form).map((f) => [f.name, f.value]));
    if (isBlankDraft(fields)) clearDraft(sessionDraftStorage(), draftKey);
    else writeDraft(sessionDraftStorage(), draftKey, fields);
  }

  return (
    <form
      ref={ref}
      {...rest}
      onInput={save}
      onSubmit={(e) => {
        rest.onSubmit?.(e);
        if (!e.defaultPrevented) clearDraft(sessionDraftStorage(), draftKey);
      }}
    >
      {children}
    </form>
  );
}
