import { supabaseAdmin, requireAdmin } from "@/lib/adminAuth";

const STATUSES = ["new", "contacted", "active", "declined"];

export async function GET(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("volunteer_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PATCH(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id, status, admin_notes } = await request.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const update = {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = status;
  }
  if (admin_notes !== undefined) update.admin_notes = String(admin_notes).slice(0, 2000);

  const { error } = await supabaseAdmin.from("volunteer_applications").update(update).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await request.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin.from("volunteer_applications").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}