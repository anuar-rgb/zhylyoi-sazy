/**
 * How a buyer is named in the admin: by email for orders made since the form asks only for it, by
 * name and phone for the earlier ones. Safe to import from client components.
 */
export function buyerContact(buyer: { buyerEmail?: string | null; buyerName?: string | null; buyerPhone?: string | null }): string {
  if (buyer.buyerEmail) return buyer.buyerEmail;
  return [buyer.buyerName, buyer.buyerPhone].filter(Boolean).join(" · ") || "—";
}
