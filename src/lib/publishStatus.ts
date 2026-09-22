/**
 * The publication states every dated section shares.
 *
 * Mirrors the CHECK constraint that culture_events and culture_news both carry, so
 * the forms cannot offer a value the database would reject. Kept in its own module
 * because it is needed in the browser and must not drag server code along.
 */
export const PUBLISH_STATUSES = ["draft", "pending", "published", "archived"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  draft: "Черновик",
  pending: "На проверке",
  published: "Опубликовано",
  archived: "В архиве",
};

/** How the list marks each state. */
export const PUBLISH_STATUS_STYLE: Record<PublishStatus, string> = {
  published: "bg-gold/15 text-ocean-dark",
  draft: "bg-ocean/5 text-ocean/50",
  pending: "bg-blue-50 text-blue-700",
  archived: "bg-ocean/5 text-ocean/40",
};

export function toPublishStatus(value: unknown): PublishStatus {
  return PUBLISH_STATUSES.includes(value as PublishStatus) ? (value as PublishStatus) : "draft";
}
