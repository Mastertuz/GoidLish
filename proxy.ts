import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;

  if (hostname === "127.0.0.1") {
    const redirectedUrl = request.nextUrl.clone();
    redirectedUrl.hostname = "localhost";
    return NextResponse.redirect(redirectedUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
