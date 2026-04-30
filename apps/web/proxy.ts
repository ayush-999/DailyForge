import { auth } from "@/auth";
import { NextResponse } from "next/server";

const RESTRICTED_STATUSES = new Set(["SUSPENDED", "BANNED", "PENDING"]);

export default auth((req) => {
  const session = req.auth as unknown as { error?: string; user?: { status?: string } } | null;

  // Account was admin-deleted while logged in
  if (session?.error === "AccountInactive") {
    const url = new URL("/signin", req.url);
    url.searchParams.set("error", "AccountInactive");
    return NextResponse.redirect(url);
  }

  // Restricted accounts can only see the account-status page
  const status = session?.user?.status;
  const pathname = new URL(req.url).pathname;
  if (status && RESTRICTED_STATUSES.has(status) && pathname !== "/account-status") {
    return NextResponse.redirect(new URL("/account-status", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/apps/:path*", "/store", "/profile", "/settings", "/admin/:path*"],
};
