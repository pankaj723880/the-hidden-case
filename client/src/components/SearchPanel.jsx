"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const defaultFilters = {
  keyword: "",
  type: "all",
  tag: "",
  sort: "newest",
  dateFrom: "",
  dateTo: "",
};

const sortOptions = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["most-liked", "Most Liked"],
  ["most-viewed", "Most Viewed"],
];

function cleanFilters(filters) {
  const cleaned = {};
  if (filters.keyword.trim()) cleaned.keyword = filters.keyword.trim();
  if (filters.type !== "all") cleaned.type = filters.type;
  if (filters.tag) cleaned.tag = filters.tag;
  if (filters.sort !== "newest") cleaned.sort = filters.sort;
  if (filters.dateFrom) cleaned.dateFrom = filters.dateFrom;
  if (filters.dateTo) cleaned.dateTo = filters.dateTo;
  return cleaned;
}

function filterLabel(key, value) {
  if (key === "keyword") return `Keyword: ${value}`;
  if (key === "type") return value === "story" ? "Stories" : "Blogs";
  if (key === "tag") return `#${value}`;
  if (key === "sort") {
    return sortOptions.find(([sortValue]) => sortValue === value)?.[1] ?? value;
  }
  if (key === "dateFrom") return `From ${value}`;
  if (key === "dateTo") return `To ${value}`;
  return value;
}

export default function SearchPanel({ onSearch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [tags, setTags] = useState([]);

  const activeEntries = useMemo(
    () => Object.entries(appliedFilters).filter(([, value]) => value),
    [appliedFilters],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get("/api/tags");
        if (!cancelled) setTags(res.data.tags ?? []);
      } catch {
        if (!cancelled) setTags([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    const cleaned = cleanFilters(filters);
    setAppliedFilters(cleaned);
    onSearch(cleaned);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters({});
    onSearch({});
  };

  const removeFilter = (key) => {
    const nextFilters = {
      ...filters,
      [key]: defaultFilters[key],
    };
    const cleaned = cleanFilters(nextFilters);
    setFilters(nextFilters);
    setAppliedFilters(cleaned);
    onSearch(cleaned);
  };

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="secondary-btn inline-flex items-center gap-2 px-5 py-3"
      >
        Advanced Search
        {activeEntries.length > 0 ? (
          <span
            className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {activeEntries.length}
          </span>
        ) : null}
      </button>

      {activeEntries.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeEntries.map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => removeFilter(key)}
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg3)",
                color: "var(--text2)",
              }}
            >
              {filterLabel(key, value)} x
            </button>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="paper-card mt-4 rounded-lg p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Keyword
              </span>
              <input
                value={filters.keyword}
                onChange={(event) => updateFilter("keyword", event.target.value)}
                className="field mt-2"
                placeholder="Search stories and blogs..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Tag
              </span>
              <select
                value={filters.tag}
                onChange={(event) => updateFilter("tag", event.target.value)}
                className="field mt-2"
              >
                <option value="">All tags</option>
                {tags.map(({ tag, count }) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Type
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["story", "Stories"],
                  ["blog", "Blogs"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateFilter("type", value)}
                    className="rounded-full border px-4 py-2 text-sm font-bold"
                    style={{
                      borderColor:
                        filters.type === value ? "var(--accent)" : "var(--border)",
                      backgroundColor:
                        filters.type === value ? "var(--accent)" : "transparent",
                      color: filters.type === value ? "#fff" : "var(--text2)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Sort by
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sortOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateFilter("sort", value)}
                    className="rounded-full border px-4 py-2 text-sm font-bold"
                    style={{
                      borderColor:
                        filters.sort === value ? "var(--accent)" : "var(--border)",
                      backgroundColor:
                        filters.sort === value ? "var(--accent)" : "transparent",
                      color: filters.sort === value ? "#fff" : "var(--text2)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Date From
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
                className="field mt-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Date To
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => updateFilter("dateTo", event.target.value)}
                className="field mt-2"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={applyFilters} className="primary-btn px-5 py-2.5">
              Apply Filters
            </button>
            <button type="button" onClick={clearFilters} className="secondary-btn px-5 py-2.5">
              Clear All
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
