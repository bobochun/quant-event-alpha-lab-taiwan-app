import { previewCsvImport } from "../../../lib/importers";
import type { ImportTemplateId } from "../../../lib/importTemplates";
import { fail, ok } from "../../_response";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { templateId?: ImportTemplateId; csvText?: string; generateEvents?: boolean };
    if (!body.templateId || !body.csvText) return fail("缺少 templateId 或 csvText。", 400);
    const result = previewCsvImport(body.templateId, body.csvText, body.generateEvents ?? true);
    return ok({ summary: result.summary, parsed: result.dataset, note: "API route 不寫入 server filesystem；前端會把 parsed dataset 存入 localStorage。" }, "Imported", "CSV 套用預覽完成。Vercel-first MVP 由前端 localStorage 保存使用者資料。");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "CSV 套用失敗。", 400);
  }
}
