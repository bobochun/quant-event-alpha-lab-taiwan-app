import { importTemplates } from "../../../lib/importTemplates";
import { ok } from "../../_response";

export function GET() {
  return ok(importTemplates, "Imported", "CSV 匯入模板 metadata。請使用 UTF-8 與 YYYY-MM-DD 日期格式。");
}
