import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import AdminConfig from "./pages/AdminConfig";
import { AdminModels } from "./pages/AdminModels";
import { AdminIntel } from "./pages/AdminIntel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { initialize, isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminConfig />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/models"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminModels />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/intel"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminIntel />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
