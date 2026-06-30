// Next.js 16 renamed Middleware → Proxy. Clerk's clerkMiddleware lives here.
// Public-first strategy: marketing + auth pages are open; everything
// diagnostic-related requires a signed-in user.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/diagnose(.*)",
  "/api/diagnose(.*)",
  "/api/outcome(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
