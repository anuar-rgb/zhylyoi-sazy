"use client";

import { useEffect, useState } from "react";

const WHATSAPP_PHONE_DIGITS = "77789276387";

type ClubApplyButtonProps = {
  clubTitle: string;
  triggerLabel: string;
  triggerClassName: string;
  modalHeading: string;
  nameLabel: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  submitLabel: string;
  cancelLabel: string;
  waIntro: string;
  waNameLabel: string;
  waPhoneLabel: string;
};

export default function ClubApplyButton({
  clubTitle,
  triggerLabel,
  triggerClassName,
  modalHeading,
  nameLabel,
  namePlaceholder,
  phoneLabel,
  phonePlaceholder,
  submitLabel,
  cancelLabel,
  waIntro,
  waNameLabel,
  waPhoneLabel,
}: ClubApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

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
    setName("");
    setPhone("");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = [waIntro.replace("{club}", clubTitle), `${waNameLabel}: ${name}`, `${waPhoneLabel}: ${phone}`].join(
      "\n"
    );
    window.open(`https://wa.me/${WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ocean mb-1">{modalHeading}</h3>
            <p className="text-sm text-ocean/60 mb-5">{clubTitle}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean/70 mb-1">{nameLabel}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
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

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors"
                >
                  {cancelLabel}
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 text-sm font-semibold">
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
