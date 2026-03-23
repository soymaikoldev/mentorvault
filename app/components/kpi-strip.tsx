import React from "react";

type KpiItem = {
  label: string;
  value: string;
  hint?: string;
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
        >
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {item.value}
          </p>
          {item.hint && (
            <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
