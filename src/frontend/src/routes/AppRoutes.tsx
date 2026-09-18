import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const IncidentsList = lazy(() => import('@/pages/IncidentsList'));
const IncidentDetail = lazy(() => import('@/pages/IncidentDetail'));
const AlertsFeed = lazy(() => import('@/pages/AlertsFeed'));
const Sources = lazy(() => import('@/pages/Sources'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Costs = lazy(() => import('@/pages/Costs'));
const Pipeline = lazy(() => import('@/pages/Pipeline'));
const Knowledge = lazy(() => import('@/pages/Knowledge'));
const ServiceMap = lazy(() => import('@/pages/ServiceMap'));
const Agents = lazy(() => import('@/pages/Agents'));
const Settings = lazy(() => import('@/pages/Settings'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<IncidentsList />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/alerts" element={<AlertsFeed />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/services" element={<ServiceMap />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
