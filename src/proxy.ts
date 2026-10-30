import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let invalidRefreshToken = false;
  try {
    const { error } = await supabase.auth.getClaims();
    invalidRefreshToken = error?.code === "refresh_token_not_found";
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
    if (code !== "refresh_token_not_found") throw error;
    invalidRefreshToken = true;
  }

  if (invalidRefreshToken) {
    const staleAuthCookies = request.cookies.getAll().filter(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
    staleAuthCookies.forEach(({ name }) => request.cookies.set(name, ""));
    response = NextResponse.next({ request });
    staleAuthCookies.forEach(({ name }) => response.cookies.set(name, "", { path: "/", maxAge: 0 }));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
