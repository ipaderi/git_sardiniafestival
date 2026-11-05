import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const user = request.auth?.user;

  // Proxy handles the sign-in redirect only. Role and active-state checks use
  // the database in the protected server layouts and route handlers.
  if ((pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) && (!user || !user.id)) {
    const signInUrl = new URL("/accedi", request.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*"] };
