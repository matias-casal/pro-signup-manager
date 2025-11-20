import { useMemo, useState } from "react";
import { Professional, ProfessionalSource } from "../api/types";

interface Props {
  data: Professional[];
  onOpenResume?: (professional: Professional) => void;
}

type SortKey = keyof Pick<Professional, "full_name" | "company_name" | "job_title" | "email" | "phone" | "source" | "updated_at">;

const columns: { key: SortKey; label: string }[] = [
  { key: "full_name", label: "Name" },
  { key: "company_name", label: "Company" },
  { key: "job_title", label: "Job" },
  { key: "email", label: "Contact" },
  { key: "source", label: "Source" },
  { key: "updated_at", label: "Updated" },
];

const sourceStyles: Record<ProfessionalSource, string> = {
  direct: "badge-direct",
  partner: "badge-partner",
  internal: "badge-internal",
};

const avatarColors: Record<ProfessionalSource, string> = {
  direct: "bg-blue-100 text-blue-700",
  partner: "bg-emerald-100 text-emerald-700",
  internal: "bg-purple-100 text-purple-700",
};

function getInitials(fullName?: string, email?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return fullName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "Today";
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export function ProfessionalTable({ data, onOpenResume }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = (a[sortKey] ?? "") as string;
      const bVal = (b[sortKey] ?? "") as string;
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, direction]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="empty-state-title">No professionals yet</h3>
        <p className="empty-state-description">Add your first professional using the form on the right.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors"
                onClick={() => toggleSort(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.label}</span>
                  {sortKey === col.key && (
                    <span className="text-primary">
                      {direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Resume
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((prof, index) => (
            <tr
              key={prof.id}
              className="hover:bg-slate-50/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <td className="px-5 py-3 max-w-[350px]">
                <div className="flex items-center gap-3">
                  <div className={`avatar flex-shrink-0 ${avatarColors[prof.source]}`}>
                    {getInitials(prof.full_name, prof.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate" title={prof.full_name}>
                      {prof.full_name || "—"}
                    </div>
                    {prof.company_name && (
                      <div className="text-xs text-slate-500 truncate">{prof.company_name}</div>
                    )}
                    {prof.job_title && (
                      <div className="text-xs text-slate-500 truncate">{prof.job_title}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 max-w-[200px]">
                <div className="space-y-0.5 min-w-0">
                  {prof.email && (
                    <div className="text-sm text-slate-900 truncate" title={prof.email}>{prof.email}</div>
                  )}
                  {prof.phone && (
                    <div className="text-xs text-slate-500 truncate">{prof.phone}</div>
                  )}
                  {!prof.email && !prof.phone && (
                    <div className="text-sm text-slate-400">—</div>
                  )}
                </div>
              </td>
              <td className="px-5 py-3">
                <span className={`badge ${sourceStyles[prof.source]}`}>
                  {prof.source}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className="text-sm text-slate-500">{formatDate(prof.updated_at)}</span>
              </td>
              <td className="px-5 py-3">
                {prof.resume ? (
                  <button
                    className="btn btn-ghost text-sm px-2 py-1"
                    onClick={() => onOpenResume?.(prof)}
                  >
                    View
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
