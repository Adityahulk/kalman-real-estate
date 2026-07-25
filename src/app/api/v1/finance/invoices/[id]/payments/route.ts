import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { addInvoicePayment, paymentSchema } from "@/server/services/finance";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "finance.manage");
    return ok(await addInvoicePayment(context, params.id, await parseJson(request, paymentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
