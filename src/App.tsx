import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Explore from "./pages/Explore";
import Categories from "./pages/Categories";
import Favorites from "./pages/Favorites";
import PromptDetail from "./pages/PromptDetail";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UploadPromptSimple from "./pages/admin/UploadPromptSimple";
import CategoryManagement from "./pages/admin/CategoryManagement";
import Analytics from "./pages/admin/Analytics";
import TestImageUpload from "./pages/admin/TestImageUpload";
import Content from "./pages/admin/Content";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Index />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/explore" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Explore />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/categories" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Categories />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/favorites" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Favorites />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prompt/:id" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <PromptDetail />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            {/* Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/upload" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <UploadPromptSimple />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/content" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <Content />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/categories" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <CategoryManagement />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/test-upload" 
              element={
                <ProtectedAdminRoute>
                  <Layout>
                    <TestImageUpload />
                  </Layout>
                </ProtectedAdminRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
