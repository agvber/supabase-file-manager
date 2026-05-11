import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsPage } from './pages/SettingsPage';
import { BucketListPage } from './pages/BucketListPage';
import { FileManagerPage } from './pages/FileManagerPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/" element={<ProtectedRoute><BucketListPage /></ProtectedRoute>} />
      <Route path="/b/:bucket/*" element={<ProtectedRoute><FileManagerPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
