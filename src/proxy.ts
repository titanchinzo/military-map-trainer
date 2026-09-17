import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`. Clerk's
// `clerkMiddleware` handler is still request/event-shaped, so it plugs in
// directly as the proxy export.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isTeacherRoute = createRouteMatcher(["/teacher(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { sessionClaims } = await auth.protect();

  // Хурдан шүүлт: эрх нь session token дотор ирдэг (Clerk dashboard дээр
  // `{"metadata": "{{user.public_metadata}}"}` claim нэмсэн үед). Claim
  // тохируулаагүй бол энд шүүхгүй өнгөрөөж, хуудсан дахь `requireRole()`
  // (Clerk API руу буцаж асуудаг) эцсийн шийдвэрийг гаргана.
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (!role) return;

  const denied =
    (isAdminRoute(req) && role !== "admin") ||
    (isTeacherRoute(req) && role !== "teacher" && role !== "admin");

  if (denied) return NextResponse.redirect(new URL("/map", req.url));
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
