"use client";

export default function RepeatableFieldGroup({ title, description, items, onChange, fields, emptyItem, addLabel }) {
  function updateItem(index, key, value) {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }
  function addItem() {
    onChange([...items, { ...emptyItem }]);
  }
  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function moveItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const next = [...items];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="pt-5 border-t border-border">
      <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-1">{title}</p>
      {description && <p className="text-xs text-muted mb-3">{description}</p>}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="border border-border rounded-lg p-3 bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label text-[10px] tracking-[0.1em] uppercase text-muted">#{index + 1}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-muted hover:text-ink disabled:opacity-30 text-xs px-1">↑</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-muted hover:text-ink disabled:opacity-30 text-xs px-1">↓</button>
                <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700 text-xs font-medium px-1.5">✕ Remove</button>
              </div>
            </div>
            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted mb-1">{f.label}</label>
                  {f.type === "textarea" || f.type === "list" ? (
                    <textarea
                      rows={f.type === "list" ? 3 : 2}
                      value={item[f.key] || ""}
                      onChange={(e) => updateItem(index, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-muted/60 bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={item[f.key] || ""}
                      onChange={(e) => updateItem(index, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-muted/60 bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-3 text-sm font-semibold text-primary border border-primary/40 rounded-md px-3 py-1.5 hover:bg-primary/10 transition"
      >
        + {addLabel}
      </button>
    </div>
  );
}