import { mockDataStatus } from "../../lib/mockData";
import { ok } from "../_response";

export function GET() {
  return ok(mockDataStatus);
}
