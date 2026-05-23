import type { SourceHealth } from "../types";
import type { ImportedDataset } from "../importers";
import { makeSourceHealth } from "./sourceHealth";

export function getImportSourceHealth(dataset: ImportedDataset): SourceHealth {
  const latest = dataset.summaries[0];
  const recordsFetched =
    dataset.events.length +
    dataset.priceSnapshots.length +
    dataset.institutionalFlows.length +
    dataset.marketWarnings.length +
    dataset.monthlyRevenues.length +
    dataset.earnings.length +
    dataset.dividends.length;
  return makeSourceHealth({
    sourceId: "csv-import",
    sourceName: "CSV 匯入",
    status: recordsFetched ? "ok" : "degraded",
    recordsFetched,
    lastSuccessAt: latest?.importedAt,
    errorMessage: recordsFetched ? undefined : "尚未匯入 CSV 資料。"
  });
}
