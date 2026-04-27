import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';

// --- COMPONENT IMPORTS ---
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Trainers from './components/Trainers';
import Pricing from './components/Pricing';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';

// --- PAGE IMPORTS ---
import Auth from './pages/Auth';
import MemberDashboard from './pages/MemberDashboard';
import MemberClasses from './pages/MemberClasses';
import MemberWorkout from './pages/MemberWorkout';
import MemberDiet from './pages/MemberDiet';
import MemberPayments from './pages/MemberPayments';
import MemberSettings from './pages/MemberSettings';
import MemberAIAssistant from './pages/MemberAIAssistant';
import MemberOnboarding from './pages/MemberOnboarding';

import AdminDashboard from './pages/AdminDashboard';
import AdminTrainers from './pages/AdminTrainers';
import AdminMembers from './pages/AdminMembers';
import AdminClasses from './pages/AdminClasses';
import AdminAttendance from './pages/AdminAttendance';
import AdminPricing from './pages/AdminPricing';
import AdminPayments from './pages/AdminPayments';
import AdminSettings from './pages/AdminSettings';
import AdminInquiries from './pages/AdminInquiries';
import AdminGallery from './pages/AdminGallery';

import AboutPage from './pages/AboutPage';
import TrainersPage from './pages/TrainersPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import ClassesPage from './pages/ClassesPage';
import LegalPage from './pages/LegalPage';
import WallPayment from './pages/WallPayment';

// --- 1. PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const token = localStorage.getItem('narrow_fitness_token');
  const userStr = localStorage.getItem('narrow_fitness_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/auth" replace />;
  }

  const role = user.role?.toLowerCase();

  // Admin access control
  if (adminOnly && role !== 'admin') {
    return <Navigate to="/member" replace />;
  }

  // Member access control (Redirect admin away from member-only routes)
  if (!adminOnly && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// --- 2. LANDING PAGE WRAPPER ---
function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Trainers />
        <Pricing />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

// --- 3. GLOBAL SCROLL & REFRESH MANAGER ---
// This component handles the "Scroll to top on every change" 
// and "Hard reset on refresh" requirements.
function ScrollAndRouteReset() {
  const navigate = useNavigate();
  const location = useLocation();

  // A. Handle Browser Refresh (Redirect to home if not in Dashboard/Auth)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Force top on load
    window.scrollTo(0, 0);

    const protectedPaths = ['/member', '/admin', '/auth', '/member/onboarding'];
    const isInsideDashboard = protectedPaths.some(path => location.pathname.startsWith(path));

    if (location.pathname !== '/' && !isInsideDashboard) {
      navigate('/', { replace: true });
    }
    
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []); // Only runs on app boot (refresh)

  // B. Handle Every Navigation (Scroll to Top automatically)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.search]);

  return null;
}

// --- 4. MAIN APP COMPONENT ---
export default function App() {
  return (
    <Router>
      {/* 
          This component now manages all scroll resets. 
          The previous "ScrollToTop" component is no longer needed 
          as the logic is merged into ScrollAndRouteReset.
      */}
      <ScrollAndRouteReset />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/trainers" element={<TrainersPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/cookies" element={<LegalPage type="cookies" />} /> 

        <Route path="/wall-pay" element={<WallPayment />} />

        {/* Member Registration (Onboarding) - Standalone */}
        <Route path="/member/onboarding" element={<MemberOnboarding />} />

        {/* --- MEMBER ROUTES (Protected) --- */}
        <Route path="/member" element={<ProtectedRoute><MemberDashboard /></ProtectedRoute>} />
        <Route path="/member/classes" element={<ProtectedRoute><MemberClasses /></ProtectedRoute>} />
        <Route path="/member/workout" element={<ProtectedRoute><MemberWorkout /></ProtectedRoute>} />
        <Route path="/member/diet" element={<ProtectedRoute><MemberDiet /></ProtectedRoute>} />
        <Route path="/member/ai-assistant" element={<ProtectedRoute><MemberAIAssistant /></ProtectedRoute>} />
        <Route path="/member/payments" element={<ProtectedRoute><MemberPayments /></ProtectedRoute>} />
        <Route path="/member/settings" element={<ProtectedRoute><MemberSettings /></ProtectedRoute>} />

        {/* --- ADMIN ROUTES (Protected + adminOnly) --- */}
        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/trainers" element={<ProtectedRoute adminOnly={true}><AdminTrainers /></ProtectedRoute>} />
        <Route path="/admin/members" element={<ProtectedRoute adminOnly={true}><AdminMembers /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute adminOnly={true}><AdminClasses /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute adminOnly={true}><AdminAttendance /></ProtectedRoute>} />
        <Route path="/admin/pricing" element={<ProtectedRoute adminOnly={true}><AdminPricing /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute adminOnly={true}><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute adminOnly={true}><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/inquiries" element={<ProtectedRoute adminOnly={true}><AdminInquiries /></ProtectedRoute>} />
        {<Route path="/admin/gallery" element={<ProtectedRoute adminOnly={true}><AdminGallery /></ProtectedRoute>} /> }

        {/* Default Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}