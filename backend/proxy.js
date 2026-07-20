import { NextResponse } from "next/server";

// Orígenes permitidos
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://cip-estudiantil.netlify.app",
];

export function middleware(request) {
  const origin = request.headers.get("origin");

  const corsHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };

  // Solo agrega Access-Control-Allow-Origin si el origen está permitido
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  // Responder a la petición preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Continuar con la petición normal
  const response = NextResponse.next();

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};