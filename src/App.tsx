import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { CookieConsent } from "@/components/cookies";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionWarningModal } from "@/components/shared/SessionWarningModal";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { RouteChrome } from "@/components/shared/RouteChrome";
import { PageLoader } from "@/components/shared/PageLoader";
import { Preloader } from "@/components/shared/Preloader";
import { PageVisibilityGate, ParamVisibilityGate } from "@/components/shared/PageVisibilityGate";

const PRELOADER_KEY = "__mims_intro__";

// Eagerly load the homepage for best LCP
import Index from "./pages/Index";

// Lazy load other pages
const About = lazy(() => import("./pages/About"));
const DivisionDetail = lazy(() => import("./pages/DivisionDetail"));
const FundDetail = lazy(() => import("./pages/FundDetail"));
// `./pages/MembersIndex` is no longer imported: /people is now a route-level
// redirect (see the route below). The file is left in place and is simply not
// bundled, since nothing references it.
const Team = lazy(() => import("./pages/Team"));
const Alumni = lazy(() => import("./pages/Alumni"));
const Events = lazy(() => import("./pages/Events"));
const Join = lazy(() => import("./pages/Join"));
const Apply = lazy(() => import("./pages/Apply"));
const EventRegister = lazy(() => import("./pages/EventRegister"));
const Archive = lazy(() => import("./pages/Archive"));
const Readings = lazy(() => import("./pages/Readings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Statute = lazy(() => import("./pages/Statute"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Partnerships = lazy(() => import("./pages/Partnerships"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const CheckEmail = lazy(() => import("./pages/CheckEmail"));
const ApplicationCheckEmail = lazy(() => import("./pages/ApplicationCheckEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PasswordResetSuccess = lazy(() => import("./pages/PasswordResetSuccess"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const SessionExpired = lazy(() => import("./pages/SessionExpired"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const MinervaWorkspace = lazy(() => import("./pages/MinervaWorkspace"));
const PayoffLab = lazy(() => import("./pages/PayoffLab"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
// Reached by almost nobody, and it needs the whole workspace navigation to
// translate the old `?section=…&sub=…` links: lazy, so that tree stays out
// of the bundle every public visitor downloads.
const LegacyWorkspaceRedirect = lazy(() => import("./pages/LegacyWorkspaceRedirect"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });

/**
 * A redirect that holds a screen of height for the one frame it exists.
 *
 * `<Navigate>` performs its navigation in an effect, so the frame before that
 * effect runs renders NOTHING: the main region is empty, and the black footer
 * rises to fill the viewport before being pushed back down. On /people that
 * measured as a layout shift of 0.51, on a URL whose entire purpose is to send
 * the reader somewhere else.
 *
 * The spacer is the same one the page loader uses, for the same reason, and it
 * is gone in the next frame along with the redirect itself.
 */
const RouteRedirect = ({ to }: { to: string }) => (
  <>
    <div className="min-h-[100svh]" aria-hidden="true" />
    <Navigate to={to} replace />
  </>
);

const DESKTOP_MIN = 1024;

const shouldRunPreloader = () => {
  if (typeof window === "undefined") return false;
  if (window.innerWidth >= DESKTOP_MIN) return false;
  return !sessionStorage.getItem(PRELOADER_KEY);
};

const App = () => {
  const [showPreloader, setShowPreloader] = useState(shouldRunPreloader);

  const handlePreloaderComplete = () => {
    sessionStorage.setItem(PRELOADER_KEY, "1");
    setShowPreloader(false);
  };

  return (
  <>
  {showPreloader && <Preloader onComplete={handlePreloaderComplete} />}
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <RouteChrome />
            <Routes>
              <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="about"><About /></PageVisibilityGate></Suspense>} />
                <Route path="/divisions/:division" element={<Suspense fallback={<PageLoader />}><ParamVisibilityGate prefix="division" param="division"><DivisionDetail /></ParamVisibilityGate></Suspense>} />
                <Route path="/funds/:fund" element={<Suspense fallback={<PageLoader />}><ParamVisibilityGate prefix="fund" param="fund"><FundDetail /></ParamVisibilityGate></Suspense>} />
                {/* =====================================================
                    /people REDIRECTS AT THE ROUTE, NOT THROUGH A PAGE.

                    It used to be a lazy route: a chunk was fetched, a
                    PageLoader was mounted, a PageVisibilityGate queried the
                    database, and the component that finally rendered was a
                    one-line <Navigate> to /people/members - at which point
                    the whole sequence ran again for the real page.

                    The cost was not theoretical. Between the two cycles the
                    main region was empty for a frame, so the black footer
                    rose into the viewport and dropped out again: a layout
                    shift of 0.51, twice, on a URL that exists only to point
                    somewhere else. The visibility gate on "members-index"
                    was equally hollow, since nobody can see a page that
                    navigates away on its first render, and /people/members
                    carries its own gate.

                    Declared here it is what it always was - an alias -
                    resolved before anything renders. This is the same form
                    the three legacy redirects below already use.
                    ===================================================== */}
                <Route path="/people" element={<RouteRedirect to="/people/members" />} />
                <Route path="/people/members" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="team"><Team /></PageVisibilityGate></Suspense>} />
                <Route path="/people/alumni" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="alumni"><Alumni /></PageVisibilityGate></Suspense>} />
                {/* Legacy redirects */}
                <Route path="/members" element={<RouteRedirect to="/people/members" />} />
                <Route path="/members/team" element={<RouteRedirect to="/people/members" />} />
                <Route path="/members/alumni" element={<RouteRedirect to="/people/alumni" />} />
                <Route path="/events" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="events"><Events /></PageVisibilityGate></Suspense>} />
                <Route path="/join" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="join"><Join /></PageVisibilityGate></Suspense>} />
                <Route path="/apply" element={<Suspense fallback={<PageLoader />}><Apply /></Suspense>} />
                <Route path="/events/:id/register" element={<Suspense fallback={<PageLoader />}><EventRegister /></Suspense>} />
                <Route path="/archive" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="archive"><Archive /></PageVisibilityGate></Suspense>} />
                <Route path="/readings" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="readings"><Readings /></PageVisibilityGate></Suspense>} />
                <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
                <Route path="/cookie-policy" element={<Suspense fallback={<PageLoader />}><CookiePolicy /></Suspense>} />
                <Route path="/terms-of-use" element={<Suspense fallback={<PageLoader />}><TermsOfUse /></Suspense>} />
                <Route path="/disclaimer" element={<Suspense fallback={<PageLoader />}><Disclaimer /></Suspense>} />
                <Route path="/statute" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="statute"><Statute /></PageVisibilityGate></Suspense>} />
                <Route path="/sitemap" element={<Suspense fallback={<PageLoader />}><Sitemap /></Suspense>} />
                <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="contacts"><Contacts /></PageVisibilityGate></Suspense>} />
                <Route path="/partnerships" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="partnerships"><Partnerships /></PageVisibilityGate></Suspense>} />
                <Route path="/unsubscribe" element={<Suspense fallback={<PageLoader />}><Unsubscribe /></Suspense>} />
                <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
                <Route path="/check-email" element={<Suspense fallback={<PageLoader />}><CheckEmail /></Suspense>} />
                <Route path="/application-check-email" element={<Suspense fallback={<PageLoader />}><ApplicationCheckEmail /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                <Route path="/password-reset-success" element={<Suspense fallback={<PageLoader />}><PasswordResetSuccess /></Suspense>} />
                <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><EmailVerification /></Suspense>} />
                <Route path="/session-expired" element={<Suspense fallback={<PageLoader />}><SessionExpired /></Suspense>} />
                <Route path="/access-denied" element={<Suspense fallback={<PageLoader />}><AccessDenied /></Suspense>} />
                <Route path="/lab" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="lab"><PayoffLab /></PageVisibilityGate></Suspense>} />
                {/* =====================================================
                    THE WORKSPACE IS ONE ROUTE, WITH A SPLAT.

                    Not three routes for `/workspace`, `/workspace/:section`
                    and `/workspace/:section/:sub`: those are three distinct
                    route elements, and moving between them would UNMOUNT
                    and REMOUNT the whole workspace on every click in the
                    navigation. Every fetch would run again, every open
                    dialog would close, every scroll position would reset.

                    With one splat route the element is the same at every
                    depth, so the router only updates the location and the
                    workspace re-renders. The path is read inside, from
                    `useLocation`.
                    ===================================================== */}
                <Route path="/workspace/*" element={<Suspense fallback={<PageLoader />}><MinervaWorkspace /></Suspense>} />
                {/* The workspace used to live at /admin, and links to it
                    are in emails already sent. Every one of them still
                    works: `LegacyWorkspaceRedirect` translates the old
                    `?section=…&sub=…` query into the new path. */}
                <Route path="/admin" element={<Suspense fallback={<PageLoader />}><LegacyWorkspaceRedirect /></Suspense>} />
                <Route path="/admin/*" element={<Suspense fallback={<PageLoader />}><LegacyWorkspaceRedirect /></Suspense>} />
                <Route path="/pending-approval" element={<Suspense fallback={<PageLoader />}><PendingApproval /></Suspense>} />
                <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
              </Route>
            </Routes>
            <CookieConsent />
            <SessionWarningModal warningThresholdMinutes={2} />
          </BrowserRouter>
        </AuthProvider>
    </TooltipProvider>

  </QueryClientProvider>
  </>
  );
};

export default App;
