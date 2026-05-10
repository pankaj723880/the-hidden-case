"use client";

import { TEMPLATES } from "../lib/templates";

export default function TemplateSelector({ onSelect, selectedType }) {
  const templates = TEMPLATES.filter((template) => template.type === selectedType);

  return (
    <section className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5f35]">
          Start with a structure
        </p>
        <h2 className="serif-title mt-1 text-3xl font-bold text-[#25211d]">
          Choose a template
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="min-w-0 rounded-lg border border-[#ded2c1] bg-[#fffaf2] p-4">
          <div className="text-3xl">+</div>
          <h3 className="serif-title mt-3 text-xl font-bold text-[#25211d]">
            Start blank
          </h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-[#6d6155]">
            Open a clean editor and shape the piece yourself.
          </p>
          <button
            type="button"
            onClick={() => onSelect({ id: "blank" })}
            className="secondary-btn mt-4 w-full px-4 py-2 text-sm"
          >
            Start blank
          </button>
        </article>

        {templates.map((template) => (
          <article
            key={template.id}
            className="min-w-0 rounded-lg border border-[#ded2c1] bg-[#fffaf2] p-4"
          >
            <div className="text-3xl">{template.icon}</div>
            <h3 className="serif-title mt-3 text-xl font-bold text-[#25211d]">
              {template.name}
            </h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[#6d6155]">
              {template.description}
            </p>
            <button
              type="button"
              onClick={() => onSelect(template)}
              className="primary-btn mt-4 w-full px-4 py-2 text-sm"
            >
              Use this template
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
