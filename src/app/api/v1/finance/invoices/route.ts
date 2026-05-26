import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createInvoice, invoiceSchema } from "@/server/services/finance";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.manage");
    return created(await createInvoice(context, await parseJson(request, invoiceSchema)));
  } catch (error) {
    return apiError(error);
  }
}
