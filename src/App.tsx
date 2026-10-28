import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Layout, RequireAuth } from "@/components/Layout";
import { referral } from "@/lib/format";
import { Catalog } from "@/pages/Catalog";
import { CourseDetail } from "@/pages/CourseDetail";
import { Login, Register } from "@/pages/Auth";
import { MyLearning } from "@/pages/MyLearning";
import { Learn } from "@/pages/Learn";
import { Attempt } from "@/pages/Attempt";
import { Verify } from "@/pages/Verify";
import { SandboxCheckout, OrderStatus } from "@/pages/Checkout";
import { Earnings } from "@/pages/Earnings";
import { Organization } from "@/pages/Organization";
import { TeachHome } from "@/pages/teach/TeachHome";
import { CourseEditor } from "@/pages/teach/CourseEditor";
import { AdminHome } from "@/pages/admin/AdminHome";
import { Dashboard } from "@/pages/Dashboard";
import { LiveClasses } from "@/pages/LiveClasses";
import { Classroom } from "@/pages/Classroom";
import { CareerPathPage, Careers } from "@/pages/Careers";
import { ProgressPage } from "@/pages/ProgressPage";
import { Practice } from "@/pages/Practice";
import { Viva } from "@/pages/Viva";
import { Landing } from "@/pages/Landing";
import { Partners } from "@/pages/Partners";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { Empty } from "@/components/ui";

export function App() {
  const location = useLocation();
  useEffect(() => {
    referral.capture(location.search);
  }, [location.search]);

  const auth = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;
  return (
    <Routes>
      <Route path="/verify/:code" element={<Verify />} />
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/classes/:sessionId/room" element={auth(<Classroom />)} />
      <Route element={<Layout />}>
        <Route path="/courses" element={<Catalog />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/careers/:slug" element={<CareerPathPage />} />
        <Route path="/dashboard" element={auth(<Dashboard />)} />
        <Route path="/classes" element={auth(<LiveClasses />)} />
        <Route path="/learn" element={auth(<MyLearning />)} />
        <Route path="/progress" element={auth(<ProgressPage />)} />
        <Route path="/practice/:enrollmentId" element={auth(<Practice />)} />
        <Route path="/viva/:enrollmentId" element={auth(<Viva />)} />
        <Route path="/learn/:enrollmentId" element={auth(<Learn />)} />
        <Route path="/attempts/:attemptId" element={auth(<Attempt />)} />
        <Route path="/checkout/sandbox/:orderId" element={auth(<SandboxCheckout />)} />
        <Route path="/orders/:orderId" element={auth(<OrderStatus />)} />
        <Route path="/earnings" element={auth(<Earnings />)} />
        <Route path="/org" element={auth(<Organization />)} />
        <Route path="/teach" element={auth(<TeachHome />)} />
        <Route path="/teach/courses/:courseId" element={auth(<CourseEditor />)} />
        <Route path="/admin" element={auth(<AdminHome />)} />
        <Route path="*" element={<Empty title="Page not found">Check the address, or head back to the catalog.</Empty>} />
      </Route>
    </Routes>
  );
}

/** Public landing page for visitors; signed-in users go straight to their dashboard. */
function Home() {
  const { me, loading } = useAuth();
  if (loading) return null;
  return me ? <Navigate to="/dashboard" replace /> : <Landing />;
}
