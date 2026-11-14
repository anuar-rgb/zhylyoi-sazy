import Image from "next/image";

/**
 * The institution's logo, filling a round frame the caller draws: the uploaded picture, or the first
 * letters of its name on a cream ground when it has none yet (a new institution's site).
 */
export default function OrgLogo({ src, name, sizes }: { src: string | null; name: string; sizes: string }) {
  if (src) return <Image src={src} alt={name} fill quality={95} className="object-cover" sizes={sizes} />;
  const initials = name
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span aria-label={name} role="img" className="absolute inset-0 flex items-center justify-center font-bold text-ocean text-sm">
      {initials}
    </span>
  );
}
