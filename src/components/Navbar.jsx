import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import Chip from './Chip';
import Button from './Button';

export default function Navbar() {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setMobileMenuOpen(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 font-extrabold text-xl text-indigo-600 group"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
              B
            </span>
            <span className="tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Bidly
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors ${
                isActive('/') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              Auctions
            </Link>

            {user && (
              <Link
                to="/create"
                className={`text-sm font-semibold transition-colors ${
                  isActive('/create') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Sell Item
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'text-violet-600'
                    : 'text-slate-600 hover:text-violet-600'
                }`}
              >
                <span>Admin</span>
                <Chip label="ADMIN" type="admin" className="text-[10px] py-0 px-1.5" />
              </Link>
            )}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-slate-50 transition"
                  title="Go to Dashboard"
                >
                  <Avatar
                    photoData={profile?.photoData}
                    name={profile?.displayName || user.email}
                    size="sm"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 max-w-[130px] truncate leading-tight">
                      {profile?.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Dashboard</span>
                  </div>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-rose-600 hover:border-rose-300"
                >
                  Log out
                </Button>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-slate-700 hover:text-indigo-600"
          >
            Auctions
          </Link>

          {user && (
            <Link
              to="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-slate-700 hover:text-indigo-600"
            >
              Sell Item
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-base font-semibold text-violet-700"
            >
              <span>Admin Panel</span>
              <Chip label="ADMIN" type="admin" />
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {!user ? (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Register</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2"
                >
                  <Avatar
                    photoData={profile?.photoData}
                    name={profile?.displayName || user.email}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile?.displayName || user.email}
                    </p>
                    <p className="text-xs text-slate-500">View dashboard & profile</p>
                  </div>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  Log out
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
