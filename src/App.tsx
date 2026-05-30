import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { CookieProvider, CookieBanner, CookiePreferences } from "@/components/cookies";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionWarningModal } from "@/components/shared/SessionWarningModal";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { PageLoader } from "@/components/shared/PageLoader";

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
const Archive = lazy(() => import("./pages/Archive"));
const Readings = lazy(() => import("./pages/Readings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Statute = lazy(() => import("./pages/Statute"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MinervaWorkspace = lazy(() => import("./pages/MinervaWorkspace"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CookieProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
                <Route path="/divisions/:division" element={<Suspense fallback={<PageLoader />}><DivisionDetail /></Suspense>} />
                <Route path="/funds/:fund" element={<Suspense fallback={<PageLoader />}><FundDetail /></Suspense>} />
                <Route path="/people" element={<Suspense fallback={<PageLoader />}><MembersIndex /></Suspense>} />
                <Route path="/people/members" element={<Suspense fallback={<PageLoader />}><Team /></Suspense>} />
                <Route path="/people/alumni" element={<Suspense fallback={<PageLoader />}><Alumni /></Suspense>} />
                {/* Legacy redirects */}
                <Route path="/members" element={<Navigate to="/people" replace />} />
                <Route path="/members/team" element={<Navigate to="/people/members" replace />} />
                <Route path="/members/alumni" element={<Navigate to="/people/alumni" replace />} />
                <Route path="/events" element={<Suspense fallback={<PageLoader />}><Events /></Suspense>} />
                <Route path="/join" element={<Suspense fallback={<PageLoader />}><Join /></Suspense>} />
                <Route path="/archive" element={<Suspense fallback={<PageLoader />}><Archive /></Suspense>} />
                <Route path="/readings" element={<Suspense fallback={<PageLoader />}><Readings /></Suspense>} />
                <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
                <Route path="/cookie-policy" element={<Suspense fallback={<PageLoader />}><CookiePolicy /></Suspense>} />
                <Route path="/terms-of-use" element={<Suspense fallback={<PageLoader />}><TermsOfUse /></Suspense>} />
                <Route path="/disclaimer" element={<Suspense fallback={<PageLoader />}><Disclaimer /></Suspense>} />
                <Route path="/statute" element={<Suspense fallback={<PageLoader />}><Statute /></Suspense>} />
                <Route path="/sitemap" element={<Suspense fallback={<PageLoader />}><Sitemap /></Suspense>} />
                <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                <Route path="/admin" element={<Suspense fallback={<PageLoader />}><MinervaWorkspace /></Suspense>} />
                <Route path="/pending-approval" element={<Suspense fallback={<PageLoader />}><PendingApproval /></Suspense>} />
                <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
              </Route>
            </Routes>
            <CookieBanner />
            <CookiePreferences />
            <SessionWarningModal warningThresholdMinutes={2} />
          </BrowserRouter>
        </AuthProvider>
      </CookieProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
