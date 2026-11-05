import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isLocale, localeCookie, negotiateLocale } from "@/lib/i18n";

function currentPath(pathname: string): string {
  const replacements: [RegExp, string][] = [
    [/^\/eventi\/([^/]+)\/?$/, "/event/$1"],
    [/^\/eventi(?=\/|$)/, "/events"],
    [/^\/categorie(?=\/|$)/, "/events/category"],
    [/^\/citta(?=\/|$)/, "/events/city"],
    [/^\/admin(?=\/|$)/, "/dashboard/admin"],
    [/^\/accedi\/?$/, "/auth/login"],
    [/^\/registrati\/?$/, "/auth/register"],
    [/^\/segnala-evento\/?$/, "/dashboard/crea-evento"],
  ];
  return replacements.reduce((path, [pattern, replacement]) => path.replace(pattern, replacement), pathname);
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/")[1];
  const cookieLocale = request.cookies.get(localeCookie)?.value;
  const locale = isLocale(firstSegment)
    ? firstSegment
    : isLocale(cookieLocale) ? cookieLocale : negotiateLocale(request.headers.get("accept-language"));
  const unprefixed = isLocale(firstSegment) ? pathname.slice(firstSegment.length + 1) || "/" : pathname;
  const translatedPath = currentPath(unprefixed);

  if (!isLocale(firstSegment) || translatedPath !== unprefixed) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${translatedPath === "/" ? "" : translatedPath}`;
    const response = NextResponse.redirect(url);
    response.headers.set("Vary", "Accept-Language, Cookie");
    return response;
  }

  // The database remains authoritative for role and account status in protected layouts.
  if ((unprefixed === "/dashboard" || unprefixed.startsWith("/dashboard/")) && !request.auth?.user?.id) {
    const signInUrl = new URL(`/${locale}/auth/login`, request.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sf-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = { matcher: ["/((?!api|_next|brand/|favicon.ico|robots.txt|sitemap.xml).*)"] };
