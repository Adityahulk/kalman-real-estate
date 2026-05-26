import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createIssue, issueSchema } from "@/server/services/development";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "development.manage");
    return created(await createIssue(context, await parseJson(request, issueSchema)));
  } catch (error) {
    return apiError(error);
  }
}
