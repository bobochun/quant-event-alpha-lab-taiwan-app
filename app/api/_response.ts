import { NextResponse } from "next/server";
import type { ApiResponse, DataSource } from "../lib/types";
import { DEMO_SOURCE_NOTE } from "../lib/utils";

export function ok<T>(data: T, dataSource: DataSource = "Demo", sourceNote = DEMO_SOURCE_NOTE) {
  const body: ApiResponse<T> = { ok: true, data, error: null, dataSource, sourceNote, generatedAt: new Date().toISOString() };
  return NextResponse.json(body);
}

export function fail(error: string, status = 400) {
  const body: ApiResponse<null> = { ok: false, data: null, error, dataSource: "Missing", sourceNote: "Request failed.", generatedAt: new Date().toISOString() };
  return NextResponse.json(body, { status });
}
