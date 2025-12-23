import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import Index from "./pages/Index";
import About from "./pages/About";
import Divisions from "./pages/Divisions";
import DivisionDetail from "./pages/DivisionDetail";
import Funds from "./pages/Funds";
import FundDetail from "./pages/FundDetail";
import MembersIndex from "./pages/MembersIndex";
import Team from "./pages/Team";
import Alumni from "./pages/Alumni";
import Events from "./pages/Events";
import Join from "./pages/Join";
import Archive from "./pages/Archive";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Terms from "./pages/Terms";
import Sitemap from "./pages/Sitemap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/divisions" element={<Divisions />} />
            <Route path="/divisions/:division" element={<DivisionDetail />} />
            <Route path="/funds" element={<Funds />} />
            <Route path="/funds/:fund" element={<FundDetail />} />
            <Route path="/members" element={<MembersIndex />} />
            <Route path="/members/team" element={<Team />} />
            <Route path="/members/alumni" element={<Alumni />} />
            <Route path="/events" element={<Events />} />
            <Route path="/join" element={<Join />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/sitemap" element={<Sitemap />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
