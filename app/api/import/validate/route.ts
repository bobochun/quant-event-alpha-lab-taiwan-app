import { previewCsvImport } from "../../../lib/importers";
import type { ImportTemplateId } from "../../../lib/importTemplates";
import { fail, ok } from "../../_response";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { templateId?: ImportTemplateId; csvText?: string; generateEvents?: boolean };
    if (!body.templateId || !body.csvText) return fail("缺少 templateId 或 csvText。", 400);
    const result = previewCsvImport(body.templateId, body.csvText, body.generateEvents ?? true);
    return ok({ summary: result.summary, preview: result.dataset }, "Imported", "CSV 驗證完成，尚未寫入瀏覽器 localStorage。");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "CSV 驗證失敗。", 400);
  }
}
