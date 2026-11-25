"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  RECORD_CATEGORIES,
  UNTRACKED_NEEDS,
  categoryPageCount,
  type RecordCategory,
} from "@/lib/record-book/catalog";

export function RecordsNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/leagues/${leagueId}/records`;
  const [, , , , , activeCategory, activeRecord] = pathname.split("/");
  const inverse = useSearchParams().get("view") === "inverse";

  return (
    <nav aria-label="Record book" className="text-sm">
      <Link
        href={base}
        className={`block px-3 py-2 rounded-md font-semibold mb-3 transition-colors ${
          !activeCategory ? "bg-yellow-500/10 text-yellow-400" : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        Overview
      </Link>
      <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Categories</p>
      <div className="space-y-1">
        {RECORD_CATEGORIES.map((c) => (
          <CategoryBlock
            key={c.id}
            category={c}
            base={base}
            isActive={c.id === activeCategory}
            activeRecord={c.id === activeCategory ? activeRecord : undefined}
            inverse={inverse}
          />
        ))}
      </div>
    </nav>
  );
}

function CategoryBlock({
  category,
  base,
  isActive,
  activeRecord,
  inverse,
}: {
  category: RecordCategory;
  base: string;
  isActive: boolean;
  activeRecord?: string;
  inverse: boolean;
}) {
  const [open, setOpen] = useState(isActive);
  const id = `records-nav-${category.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-semibold transition-colors ${
          isActive ? "text-white bg-white/[0.06]" : "text-slate-300 hover:text-white hover:bg-white/5"
        }`}
      >
        <span className="flex-1 text-left">{category.label}</span>
        <span className="text-[11px] font-bold text-slate-500 border border-white/10 rounded-full px-2 py-0.5 tabular-nums">
          {categoryPageCount(category)}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div id={id} className="mt-1 mb-3 ml-2 pl-2 border-l border-white/5">
          {category.sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                  {section.title}
                </p>
              )}
              {section.groups.map((group, gi) => (
                <ul key={gi} className={gi > 0 ? "mt-1.5 pt-1.5 border-t border-white/5" : ""}>
                  {group.map((rec) => {
                    const href = `${base}/${category.id}/${rec.id}`;
                    const here = rec.id === activeRecord;
                    const untracked = UNTRACKED_NEEDS.has(rec.needs);
                    return (
                      <li key={rec.id} className="flex items-center gap-1">
                        <Link
                          href={href}
                          aria-current={here && !inverse ? "page" : undefined}
                          className={`flex-1 min-w-0 truncate px-2 py-1 rounded transition-colors ${
                            here && !inverse
                              ? "bg-yellow-500/15 text-yellow-300 font-semibold"
                              : untracked
                              ? "text-slate-600 hover:text-slate-400"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {rec.label}
                        </Link>
                        {rec.inverseLabel && (
                          <Link
                            href={`${href}?view=inverse`}
                            aria-current={here && inverse ? "page" : undefined}
                            className={`flex-shrink-0 px-1.5 py-1 rounded text-xs transition-colors ${
                              here && inverse
                                ? "bg-yellow-500/15 text-yellow-300 font-semibold"
                                : "text-slate-600 hover:text-slate-300"
                            }`}
                          >
                            ({rec.inverseLabel})
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
