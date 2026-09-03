import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthProvider';
import { Navbar } from '../shared/components/Navbar';
import { AppRoutes } from './routes';
import './App.css';

export const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <div className="app-layout">
          <Navbar />
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};
