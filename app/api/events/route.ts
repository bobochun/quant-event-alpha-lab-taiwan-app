import { mockEvents } from "../../lib/mockData";
import { ok } from "../_response";

export function GET() {
  return ok(mockEvents);
}

export async function POST(request: Request) {
  const body = await request.json();
  return ok({ ...body, id: body.id ?? `manual-${Date.now()}`, dataSource: "Manual", sourceNote: "Manual API event payload." }, "Manual", "Manual API event payload.");
}
