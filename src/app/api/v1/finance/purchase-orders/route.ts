import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createPurchaseOrder, purchaseOrderSchema } from "@/server/services/finance";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.manage");
    return created(await createPurchaseOrder(context, await parseJson(request, purchaseOrderSchema)));
  } catch (error) {
    return apiError(error);
  }
}
