import { notFound } from "next/navigation";
import { getSupportThread, supportContext } from "@/lib/support";
import { PlatformRequestButtons, ReplyForm } from "../../../support/ui";
import { CARD, Thread, ThreadHeader } from "../../../support/views";

export const metadata = { title: "Обращение" };

export default async function PlatformSupportRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await supportContext();
  if (!ctx || ctx.side !== "platform") notFound();
  const thread = await getSupportThread(ctx, (await params).id);
  if (!thread) notFound();

  return (
    <div className="space-y-5">
      <ThreadHeader thread={thread} back="/admin/platform/support" backLabel="Поддержка" showInstitution />
      <PlatformRequestButtons requestId={thread.id} closed={thread.status === "closed"} />
      <Thread thread={thread} ownSide="platform" />
      <section className={`${CARD} p-5 sm:p-6`}>
        <ReplyForm requestId={thread.id} closed={thread.status === "closed"} />
      </section>
    </div>
  );
}
