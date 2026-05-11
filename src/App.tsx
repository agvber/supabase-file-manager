import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsPage } from './pages/SettingsPage';
import { BucketListPage } from './pages/BucketListPage';
import { FileManagerPage } from './pages/FileManagerPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<BucketListPage />} />
        <Route path="/b/:bucket/*" element={<FileManagerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
