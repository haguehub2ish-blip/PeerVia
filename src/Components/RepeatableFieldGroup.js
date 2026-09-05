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
    <div className="pt-5 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      {description && <p className="text-xs text-gray-400 mb-3">{description}</p>}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1">↑</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1">↓</button>
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 text-xs font-medium px-1.5">✕ Remove</button>
              </div>
            </div>
            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  {f.type === "textarea" || f.type === "list" ? (
                    <textarea
                      rows={f.type === "list" ? 3 : 2}
                      value={item[f.key] || ""}
                      onChange={(e) => updateItem(index, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={item[f.key] || ""}
                      onChange={(e) => updateItem(index, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
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
        className="mt-3 text-sm font-semibold text-green-700 border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-50 transition"
      >
        + {addLabel}
      </button>
    </div>
  );
}