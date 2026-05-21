import { ok } from "../_response";

export function GET() {
  return ok({ status: "ok", app: "Quant Event Alpha Lab Taiwan" });
}
