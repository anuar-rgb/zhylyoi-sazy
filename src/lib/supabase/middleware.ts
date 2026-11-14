import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and guards the staff area.
 * Uses getUser() rather than getSession(): getUser() revalidates the token with
 * the auth server, so a tampered cookie cannot pass the check.
 */
export async function updateSession(request: NextRequest) {
  // The admin layout has no other way to learn which page it wraps, and it needs to: the platform
  // owner is kept to /admin/platform there. Copied fresh each time so refreshed cookies go along.
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-admin-path", request.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && (pathname.startsWith("/admin") || pathname.startsWith("/door"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
