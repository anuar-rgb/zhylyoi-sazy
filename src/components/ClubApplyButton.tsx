"use client";

import { useEffect, useState } from "react";
import { submitClubApplication } from "@/app/actions/applications";

export type ApplyFormLabels = {
  modalHeading: string;
  clubLabel: string;
  childNameLabel: string;
  childNamePlaceholder: string;
  ageLabel: string;
  agePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  commentLabel: string;
  commentPlaceholder: string;
  consentLabel: string;
  submitLabel: string;
  cancelLabel: string;
  successMessage: string;
  errorMessage: string;
  consentRequiredMessage: string;
};

type ClubApplyButtonProps = ApplyFormLabels & {
  clubTitle: string;
  /** Address of the club being applied to; omitted where the card is not a club. */
  clubSlug?: string;
  triggerLabel: string;
  triggerClassName: string;
};

export default function ClubApplyButton({
  clubTitle,
  clubSlug,
  triggerLabel,
  triggerClassName,
  modalHeading,
  clubLabel,
  childNameLabel,
  childNamePlaceholder,
  ageLabel,
  agePlaceholder,
  phoneLabel,
  phonePlaceholder,
  commentLabel,
  commentPlaceholder,
  consentLabel,
  submitLabel,
  cancelLabel,
  successMessage,
  errorMessage,
  consentRequiredMessage,
}: ClubApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "consent">("idle");

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  function openModal() {
    setChildName("");
    setAge("");
    setPhone("");
    setComment("");
    setConsent(false);
    setStatus("idle");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setStatus("consent");
      return;
    }
    setStatus("submitting");
    const result = await submitClubApplication({
      childName,
      age,
      parentPhone: phone,
      clubTitle,
      clubSlug,
      comment,
      consent,
    });
    setStatus(result.ok ? "success" : "error");
  }

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "success" ? (
              <div className="text-center py-4">
                <p className="text-ocean font-semibold mb-4">{successMessage}</p>
                <button type="button" onClick={() => setOpen(false)} className="btn-primary px-6 py-2.5 text-sm font-semibold">
                  {cancelLabel}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-ocean mb-1">{modalHeading}</h3>
                <p className="text-sm text-ocean/60 mb-5">
                  {clubLabel}: {clubTitle}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ocean/70 mb-1">{childNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder={childNamePlaceholder}
                      className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ocean/70 mb-1">{ageLabel}</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={agePlaceholder}
                      className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ocean/70 mb-1">{phoneLabel}</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={phonePlaceholder}
                      className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ocean/70 mb-1">{commentLabel}</label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={commentPlaceholder}
                      className="w-full px-5 py-3 border border-cream-dark rounded-3xl focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 resize-none"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => {
                        setConsent(e.target.checked);
                        if (status === "consent") setStatus("idle");
                      }}
                      className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
                    />
                    <span>{consentLabel}</span>
                  </label>

                  {status === "consent" && <p className="text-sm text-red-600">{consentRequiredMessage}</p>}
                  {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {submitLabel}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
