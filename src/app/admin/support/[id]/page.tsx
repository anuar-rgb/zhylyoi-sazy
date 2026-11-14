import { notFound } from "next/navigation";
import { getSupportThread, supportContext } from "@/lib/support";
import { LiveRefresh, ReplyForm } from "../ui";
import { CARD, Thread, ThreadHeader } from "../views";

export const metadata = { title: "Обращение" };

export default async function SupportRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await supportContext();
  if (!ctx || ctx.side !== "institution") notFound();
  const thread = await getSupportThread(ctx, (await params).id);
  if (!thread) notFound();

  return (
    <div className="space-y-5">
      <LiveRefresh seconds={5} />
      <ThreadHeader thread={thread} back="/admin/support" backLabel="Поддержка" showInstitution={false} />
      <Thread thread={thread} ownSide="institution" />
      <section className={`${CARD} p-5 sm:p-6`}>
        <ReplyForm requestId={thread.id} closed={thread.status === "closed"} />
      </section>
    </div>
  );
}
