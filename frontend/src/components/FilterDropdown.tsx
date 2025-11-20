import { ProfessionalSource } from "../api/types";

interface Props {
  value?: ProfessionalSource | "all";
  onChange: (value: ProfessionalSource | "all") => void;
}

const filters: { value: ProfessionalSource | "all"; label: string; color?: string }[] = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct", color: "bg-blue-500" },
  { value: "partner", label: "Partner", color: "bg-emerald-500" },
  { value: "internal", label: "Internal", color: "bg-purple-500" },
];

export function FilterDropdown({ value = "all", onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={`filter-chip ${
            value === filter.value ? "filter-chip-active" : "filter-chip-inactive"
          }`}
        >
          {filter.color && (
            <span className={`inline-block w-2 h-2 rounded-full ${filter.color} mr-1.5`} />
          )}
          {filter.label}
        </button>
      ))}
    </div>
  );
}
