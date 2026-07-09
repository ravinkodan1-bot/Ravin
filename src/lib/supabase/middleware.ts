import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login";
  const isAdminApiRoute = request.nextUrl.pathname.startsWith("/api/admin");
  const isProtectedRoute = isAdminRoute || isAdminApiRoute;

  if (!user && isProtectedRoute) {
    // If it's an API route, return 401 Unauthorized
    if (isAdminApiRoute) {
       return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Check role if trying to access admin dashboard or admin APIs
  if (user && isProtectedRoute) {
     const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

     if (!userData || !['SUPER_ADMIN', 'ADMIN', 'SALES'].includes(userData.role)) {
         // Unauthorized or viewer role trying to access protected areas
         if (isAdminApiRoute) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
         }
         // Could redirect to a 'not-authorized' page or logout
         const url = request.nextUrl.clone();
         url.pathname = "/";
         return NextResponse.redirect(url);
     }
  }

  return supabaseResponse;
}