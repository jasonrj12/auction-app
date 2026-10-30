import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTeamByUserId } from '../services/teams';
import { fmtChips } from '../lib/format';
import Avatar from './Avatar';
import Chip from './Chip';
import Button from './Button';

export default function Navbar() {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userTeam, setUserTeam] = useState(null);

  useEffect(() => {
    if (user?.uid && profile?.role === 'bidder') {
      getTeamByUserId(user.uid).then((team) => {
        setUserTeam(team);
      });
    } else {
      setUserTeam(null);
    }
  }, [user, profile]);

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
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              🏆
            </span>
            <div className="flex flex-col">
              <span className="tracking-tight text-slate-900 leading-tight font-black group-hover:text-indigo-600 transition-colors">
                Bidly <span className="text-indigo-600 font-extrabold text-xs uppercase bg-indigo-50 px-1.5 py-0.5 rounded">Sports</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <span>⚡</span>
              <span>Auctions</span>
            </Link>

            <Link
              to="/players"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/players') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <span>🏃</span>
              <span>Players Pool</span>
            </Link>

            <Link
              to="/teams"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/teams') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <span>👑</span>
              <span>Team Owners</span>
            </Link>

            {isAdmin && (
              <Link
                to="/create"
                className={`text-sm font-semibold transition-colors flex items-center gap-1 ${
                  isActive('/create') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                <span>➕</span>
                <span>Create Auction</span>
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
                <span>Admin Console</span>
                <Chip label="ADMIN" type="admin" className="text-[10px] py-0 px-1.5" />
              </Link>
            )}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Bidder Chip Purse Badge */}
            {userTeam && (
              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
                <span className="text-amber-700 font-bold">Purse:</span>
                <span className="font-black text-amber-900">
                  🪙 {fmtChips(userTeam.remainingChips)}
                </span>
              </div>
            )}

            {!user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600">
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                  title="Go to Dashboard"
                >
                  <Avatar
                    photoData={profile?.photoData}
                    name={profile?.displayName || user.email}
                    size="sm"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 max-w-[120px] truncate leading-tight">
                      {profile?.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium capitalize">
                      {profile?.role === 'bidder' ? 'Team Owner' : profile?.role === 'player' ? 'Athlete' : profile?.role || 'User'}
                    </span>
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

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {userTeam && (
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs mb-2">
              <span className="text-amber-800 font-bold">Team Purse:</span>
              <span className="font-black text-amber-900">🪙 {fmtChips(userTeam.remainingChips)}</span>
            </div>
          )}

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ⚡ Live Auctions
          </Link>

          <Link
            to="/players"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            🏃 Players Directory
          </Link>

          <Link
            to="/teams"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            👑 Team Owners & Bidders
          </Link>

          {isAdmin && (
            <Link
              to="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ➕ Create Sports Auction
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              🛡️ Admin Console
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {!user ? (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
