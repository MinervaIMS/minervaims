import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { CookieProvider, CookieBanner, CookiePreferences } from "@/components/cookies";
import { AuthProvider } from "@/contexts/AuthContext";

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
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CookieProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={null}><About /></Suspense>} />
                <Route path="/divisions/:division" element={<Suspense fallback={null}><DivisionDetail /></Suspense>} />
                <Route path="/funds/:fund" element={<Suspense fallback={null}><FundDetail /></Suspense>} />
                <Route path="/members" element={<Suspense fallback={null}><MembersIndex /></Suspense>} />
                <Route path="/members/team" element={<Suspense fallback={null}><Team /></Suspense>} />
                <Route path="/members/alumni" element={<Suspense fallback={null}><Alumni /></Suspense>} />
                <Route path="/events" element={<Suspense fallback={null}><Events /></Suspense>} />
                <Route path="/join" element={<Suspense fallback={null}><Join /></Suspense>} />
                <Route path="/archive" element={<Suspense fallback={null}><Archive /></Suspense>} />
                <Route path="/privacy-policy" element={<Suspense fallback={null}><PrivacyPolicy /></Suspense>} />
                <Route path="/cookie-policy" element={<Suspense fallback={null}><CookiePolicy /></Suspense>} />
                <Route path="/terms-of-use" element={<Suspense fallback={null}><TermsOfUse /></Suspense>} />
                <Route path="/sitemap" element={<Suspense fallback={null}><Sitemap /></Suspense>} />
                <Route path="/auth" element={<Suspense fallback={null}><Auth /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={null}><ResetPassword /></Suspense>} />
                <Route path="/admin" element={<Suspense fallback={null}><AdminDashboard /></Suspense>} />
                <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
              </Route>
            </Routes>
            <CookieBanner />
            <CookiePreferences />
          </BrowserRouter>
        </AuthProvider>
      </CookieProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
