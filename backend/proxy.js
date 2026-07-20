import { NextResponse } from "next/server";

// Lista de orígenes permitidos. Agrega aquí cualquier otro dominio
// (por ejemplo un preview de Netlify) si lo necesitas más adelante.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://finalcip.netlify.app",
];

export function proxy(request) {
  const origin = request.headers.get("origin");
  const originPermitido = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const corsHeaders = {
    "Access-Control-Allow-Origin": originPermitido,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin", // importante: le dice a los caches que la respuesta varía según el origin
  };

  if (request.method === "OPTIONS") {
    // Importante: debe llevar un cuerpo (aunque sea {}), un body null causa 400 en Next.js
    return NextResponse.json({}, { headers: corsHeaders });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};