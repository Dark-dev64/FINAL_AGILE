import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabaseAdmin
    .from("notificaciones_web")
    .update({ leida: body.leida ?? true })
    .eq("id_notificacion_web", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("notificaciones_web")
    .delete()
    .eq("id_notificacion_web", id);

  if (error) return fail(error.message, 500);
  return ok({ eliminada: true });
}
