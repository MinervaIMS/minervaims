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
import { PageLoader } from "@/components/shared/PageLoader";
import { Preloader } from "@/components/shared/Preloader";
import { PageVisibilityGate } from "@/components/shared/PageVisibilityGate";

const PRELOADER_KEY = "__mims_intro__";

// Eagerly load the homepage for best LCP
import Index from "./pages/Index";

// Lazy load other pages
const About = lazy(() => import("./pages/About"));
const DivisionDetail = lazy(() => import("./pages/DivisionDetail"));
const FundDetail = lazy(() => import("./pages/FundDetail"));
const MembersIndex = lazy(() => import("./pages/MembersIndex"));
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
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PasswordResetSuccess = lazy(() => import("./pages/PasswordResetSuccess"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const SessionExpired = lazy(() => import("./pages/SessionExpired"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const MinervaWorkspace = lazy(() => import("./pages/MinervaWorkspace"));
const PayoffLab = lazy(() => import("./pages/PayoffLab"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });

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
            <Routes>
              <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="about"><About /></PageVisibilityGate></Suspense>} />
                <Route path="/divisions/:division" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="divisions"><DivisionDetail /></PageVisibilityGate></Suspense>} />
                <Route path="/funds/:fund" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="funds"><FundDetail /></PageVisibilityGate></Suspense>} />
                <Route path="/people" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="members-index"><MembersIndex /></PageVisibilityGate></Suspense>} />
                <Route path="/people/members" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="team"><Team /></PageVisibilityGate></Suspense>} />
                <Route path="/people/alumni" element={<Suspense fallback={<PageLoader />}><PageVisibilityGate pageKey="alumni"><Alumni /></PageVisibilityGate></Suspense>} />
                {/* Legacy redirects */}
                <Route path="/members" element={<Navigate to="/people" replace />} />
                <Route path="/members/team" element={<Navigate to="/people/members" replace />} />
                <Route path="/members/alumni" element={<Navigate to="/people/alumni" replace />} />
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
                <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><Contacts /></Suspense>} />
                <Route path="/partnerships" element={<Suspense fallback={<PageLoader />}><Partnerships /></Suspense>} />
                <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
                <Route path="/check-email" element={<Suspense fallback={<PageLoader />}><CheckEmail /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                <Route path="/password-reset-success" element={<Suspense fallback={<PageLoader />}><PasswordResetSuccess /></Suspense>} />
                <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><EmailVerification /></Suspense>} />
                <Route path="/session-expired" element={<Suspense fallback={<PageLoader />}><SessionExpired /></Suspense>} />
                <Route path="/access-denied" element={<Suspense fallback={<PageLoader />}><AccessDenied /></Suspense>} />
                <Route path="/lab" element={<Suspense fallback={<PageLoader />}><PayoffLab /></Suspense>} />
                <Route path="/admin" element={<Suspense fallback={<PageLoader />}><MinervaWorkspace /></Suspense>} />
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
