import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notice from './Notice';
import { ShieldIcon } from './Icons';

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Administrators Only</h2>
          <Notice type="error" className="mb-6 text-left">
            This area requires tournament administrator privileges. Your current account does not have admin access.
          </Notice>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
