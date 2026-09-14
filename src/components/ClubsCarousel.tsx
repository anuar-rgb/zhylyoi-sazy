"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

const WHATSAPP_PHONE_DIGITS = "77789276387";

type Club = {
  title: string;
  description: string;
  image: string;
  imagePosition?: string;
  href: string;
  linkLabel: string;
  real?: boolean;
};

export default function ClubsCarousel({
  clubs,
  activeLabel,
  prevLabel,
  nextLabel,
  signUpLabel,
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
}: {
  clubs: Club[];
  activeLabel: string;
  prevLabel: string;
  nextLabel: string;
  signUpLabel: string;
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
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [signupClub, setSignupClub] = useState<Club | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  useEffect(() => {
    if (!signupClub) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSignupClub(null);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [signupClub]);

  function scrollByCards(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  function openSignup(club: Club) {
    setName("");
    setPhone("");
    setSignupClub(club);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signupClub) return;
    const message = [
      waIntro.replace("{club}", signupClub.title),
      `${waNameLabel}: ${name}`,
      `${waPhoneLabel}: ${phone}`,
    ].join("\n");
    window.open(`https://wa.me/${WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setSignupClub(null);
  }

  return (
    <div className="relative">
      {/* Nav arrows */}
      <div className="hidden sm:flex items-center gap-2 absolute -top-16 right-0 z-10">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          disabled={!canScrollLeft}
          aria-label={prevLabel}
          className="w-10 h-10 rounded-full border border-ocean/25 flex items-center justify-center text-ocean transition-colors hover:bg-ocean hover:text-white hover:border-ocean disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ocean disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          disabled={!canScrollRight}
          aria-label={nextLabel}
          className="w-10 h-10 rounded-full border border-ocean/25 flex items-center justify-center text-ocean transition-colors hover:bg-ocean hover:text-white hover:border-ocean disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ocean disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onWheel={handleWheel}
        className="hide-scrollbar flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth scroll-px-4 sm:scroll-px-0 -mx-4 px-4 sm:mx-0 sm:px-0 pb-3"
      >
        {clubs.map((club) => (
          <div
            key={club.title}
            data-card
            className="group relative shrink-0 w-[74vw] xs:w-[62vw] sm:w-[300px] lg:w-[320px] aspect-[3/4] rounded-3xl overflow-hidden snap-start shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 ease-out"
          >
            <Link href={club.href} className="absolute inset-0" aria-label={club.title}>
              <Image
                src={club.image}
                alt={club.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                style={club.imagePosition ? { objectPosition: club.imagePosition } : undefined}
                sizes="(max-width: 640px) 74vw, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ocean-dark via-ocean-dark/45 to-black/10 opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
            </Link>

            {club.real && (
              <span className="absolute top-4 left-4 bg-gold text-ocean-dark text-[11px] font-semibold px-2.5 py-1 rounded-full shadow pointer-events-none">
                {activeLabel}
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col gap-3">
              <Link href={club.href} className="block">
                <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2 text-balance">
                  {club.title}
                </h3>
                <p className="text-white/75 text-sm leading-relaxed line-clamp-2">
                  {club.description}
                </p>
              </Link>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={club.href}
                  className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                >
                  {club.linkLabel}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => openSignup(club)}
                  className="btn-primary shrink-0 px-4 py-2 text-sm font-semibold"
                >
                  {signUpLabel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Signup modal */}
      {signupClub && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSignupClub(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-ocean mb-1">{modalHeading}</h3>
            <p className="text-sm text-ocean/60 mb-5">{signupClub.title}</p>

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
                  onClick={() => setSignupClub(null)}
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
    </div>
  );
}
