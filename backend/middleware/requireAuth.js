import { fail } from "../utils/apiResponse";

export function requireAuth(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return fail("No autorizado.", 401);
  }

  // TODO: cuando exista Supabase Auth real, aquí se valida el token/JWT
  // y se extrae el rol del usuario para usarlo en cada endpoint.
  return null; // null significa "todo bien, continuar"
}