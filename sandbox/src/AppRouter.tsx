import { Navigate, Route, Routes } from 'react-router-dom';
import Launcher from './Launcher';
import CarryOnlyApp from './carry-only/CarryOnlyApp';
import PartialApp from './partial/PartialApp';
import { ErrorBoundary } from './ErrorBoundary';

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/carry" element={<CarryOnlyApp />} />
        <Route path="/partial" element={<PartialApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
