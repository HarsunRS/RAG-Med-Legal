"use client";
import { DocType } from "@/types";

const TABS: { value: DocType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "medical", label: "Medical" },
  { value: "legal", label: "Legal" },
  { value: "general", label: "General" },
];

interface Props {
  docType: DocType | "";
  dateFrom: string;
  dateTo: string;
  onChange: (filters: { docType: DocType | ""; dateFrom: string; dateTo: string }) => void;
}

export default function FilterBar({ docType, dateFrom, dateTo, onChange }: Props) {
  return (
    <div className="px-3 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(250,249,245,0.08)" }}>
      {/* Category tabs */}
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const active = docType === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange({ docType: tab.value, dateFrom, dateTo })}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--rounded-md)",
                fontSize: 12,
                fontWeight: 500,
                background: active ? "var(--color-surface-dark-elevated)" : "transparent",
                color: active ? "var(--color-on-dark)" : "var(--color-on-dark-soft)",
                transition: "all 0.15s",
                border: "none",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="flex gap-1.5">
        {[
          { val: dateFrom, key: "dateFrom", placeholder: "From" },
          { val: dateTo,   key: "dateTo",   placeholder: "To" },
        ].map(({ val, key, placeholder }) => (
          <input
            key={key}
            type="date"
            value={val}
            onChange={(e) =>
              onChange({ docType, dateFrom: key === "dateFrom" ? e.target.value : dateFrom, dateTo: key === "dateTo" ? e.target.value : dateTo })
            }
            placeholder={placeholder}
            className="flex-1 focus:outline-none"
            style={{
              background: "var(--color-surface-dark-elevated)",
              border: "1px solid rgba(250,249,245,0.10)",
              borderRadius: "var(--rounded-sm)",
              padding: "5px 8px",
              fontSize: 11,
              color: "var(--color-on-dark-soft)",
              colorScheme: "dark",
            }}
          />
        ))}
      </div>
    </div>
  );
}
