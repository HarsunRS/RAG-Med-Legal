"use client";
import { DocType } from "@/types";

interface Props {
  docType: DocType | "";
  dateFrom: string;
  dateTo: string;
  onChange: (filters: { docType: DocType | ""; dateFrom: string; dateTo: string }) => void;
}

export default function FilterBar({ docType, dateFrom, dateTo, onChange }: Props) {
  return (
    <div className="space-y-2 px-3 py-2 border-b border-white/8">
      <select
        value={docType}
        onChange={(e) => onChange({ docType: e.target.value as DocType | "", dateFrom, dateTo })}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All types</option>
        <option value="medical">Medical</option>
        <option value="legal">Legal</option>
        <option value="general">General</option>
      </select>
      <div className="flex gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ docType, dateFrom: e.target.value, dateTo })}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ docType, dateFrom, dateTo: e.target.value })}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="To"
        />
      </div>
    </div>
  );
}
