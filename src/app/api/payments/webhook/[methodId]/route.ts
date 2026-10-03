import { handlePaymentWebhook } from "@/lib/payments/process";

/** Where a bank sends its payment notifications. The id in the URL is a payment method id. */
export async function POST(request: Request, { params }: { params: Promise<{ methodId: string }> }) {
  const { methodId } = await params;
  return handlePaymentWebhook(methodId, request);
}
