"use client";

import { useState } from "react";

export function SymbolSearch({ initialSymbol, onSubmit }: { initialSymbol: string; onSubmit: (symbol: string) => void }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (symbol.trim()) onSubmit(symbol.trim()); }}>
      <input className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-cyan-500" value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="輸入股票代號，例如 2330、2382、2317" />
      <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="submit">查詢報價</button>
    </form>
  );
}
