export function ok(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function fail(message, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}