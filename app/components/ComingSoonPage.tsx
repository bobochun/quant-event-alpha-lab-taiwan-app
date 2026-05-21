import Link from "next/link";
import { SectionCard } from "./ui";

export function ComingSoonPage({ title, description, features, alternatives }: { title: string; description: string; features: string[]; alternatives: Array<{ label: string; href: string }> }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">Coming Soon</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p>
        <Link className="mt-4 inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href="/">回到每日主控台</Link>
      </section>
      <SectionCard title="未來功能清單">
        <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          {features.map((feature) => <li key={feature} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">{feature}</li>)}
        </ul>
      </SectionCard>
      <SectionCard title="目前可用替代功能">
        <div className="flex flex-wrap gap-2">
          {alternatives.map((item) => (
            <Link key={item.href} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href={item.href}>{item.label}</Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
