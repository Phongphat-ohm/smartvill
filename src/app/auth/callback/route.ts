import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = request.nextUrl.searchParams.get("code");
  const nextValue = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = nextValue.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/dashboard";
  if (!url || !key || !code) return NextResponse.redirect(new URL("/login?error=link", request.url));

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", request.url));
  return response;
}
