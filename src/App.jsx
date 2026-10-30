import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toaster from './components/Toaster';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { firebaseReady } from './lib/firebase';

import Home from './pages/Home';
import AuctionDetail from './pages/AuctionDetail';
import PlayersDirectory from './pages/PlayersDirectory';
import TeamsDirectory from './pages/TeamsDirectory';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateAuction from './pages/CreateAuction';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

export default function App() {
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mx-auto mb-5">
            🔑
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Almost there!
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            To start using <strong>Bidly Sports</strong>, configure your Firebase credentials in your{' '}
            <code className="bg-slate-100 text-indigo-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
              .env
            </code>{' '}
            file. Copy the template from{' '}
            <code className="bg-slate-100 text-indigo-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
              .env.example
            </code>{' '}
            and fill in your Firebase Web App configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <Toaster />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auction/:id" element={<AuctionDetail />} />
          <Route path="/players" element={<PlayersDirectory />} />
          <Route path="/teams" element={<TeamsDirectory />} />
          <Route path="/bidders" element={<TeamsDirectory />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateAuction />
              </ProtectedRoute>
            }
          />
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
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
