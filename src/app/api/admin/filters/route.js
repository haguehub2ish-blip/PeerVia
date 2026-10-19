import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";

const KINDS = ["field", "country", "career_field", "community_field"];

// Validates one filter item and returns the row to store.
function clean(item) {
  if (!KINDS.includes(item?.kind)) return { error: "Invalid filter type" };

  const label = String(item.label || "").trim();
  if (!label) return { error: "A name is required" };

  const sortOrder = Number(item.sort_order);
  const row = {
    kind: item.kind,
    label,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    value: null,
    keywords: null,
    flag: null,
  };

  if (item.kind === "country") {
    const value = String(item.value || "").trim().toUpperCase();
    if (!value) return { error: "A country code is required (for example NL)" };
    row.value = value;
    row.flag = String(item.flag || "").trim() || null;
  } else if (item.kind === "field" || item.kind === "community_field") {
    row.keywords = String(item.keywords || "").trim() || null;
  }
  return { row };
}

export async function POST(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [body];

  const rows = [];
  for (const item of items) {
    const { row, error } = clean(item);
    if (error) return Response.json({ error }, { status: 400 });
    rows.push(row);
  }
  if (rows.length === 0) return Response.json({ error: "Nothing to add" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("site_filters").insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PATCH(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();

  // Reordering: { order: [{ id, sort_order }, ...] }
  if (Array.isArray(body.order)) {
    for (const { id, sort_order } of body.order) {
      const { error } = await supabaseAdmin
        .from("site_filters")
        .update({ sort_order: Number(sort_order) || 0 })
        .eq("id", id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ success: true });
  }

  // Editing one filter: { id, kind, label, ... }
  if (!body.id) return Response.json({ error: "Missing id" }, { status: 400 });
  const { row, error: cleanError } = clean(body);
  if (cleanError) return Response.json({ error: cleanError }, { status: 400 });

  const { error } = await supabaseAdmin.from("site_filters").update(row).eq("id", body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id, kind } = await request.json();

  // { kind } removes the whole custom list, so the site falls back to its built-in defaults.
  if (!id && KINDS.includes(kind)) {
    const { error } = await supabaseAdmin.from("site_filters").delete().eq("kind", kind);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("site_filters").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}