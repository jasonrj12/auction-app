import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTeamByUserId } from '../services/teams';
import { fmtChips } from '../lib/format';
import { TrophyIcon, PlayerIcon, OwnerIcon, PlusIcon, ShieldIcon, ChipIcon } from './Icons';
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
            to={isAdmin ? "/admin" : "/"}
            className="flex items-center gap-2.5 group"
          >
            <span className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
              <TrophyIcon className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="tracking-tight text-slate-900 text-lg font-black leading-tight">
                BIDLY
              </span>
              <span className={`text-[10px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                isAdmin
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {isAdmin ? 'ADMIN' : 'Sports'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`text-sm font-bold flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldIcon className="w-4 h-4" />
                  <span>Admin Console</span>
                </Link>

                <Link
                  to="/create"
                  className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    isActive('/create') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Create Auction</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    isActive('/') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Auctions</span>
                </Link>

                <Link
                  to="/players"
                  className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    isActive('/players') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlayerIcon className="w-4 h-4" />
                  <span>Players Pool</span>
                </Link>

                <Link
                  to="/teams"
                  className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    isActive('/teams') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <OwnerIcon className="w-4 h-4" />
                  <span>Team Owners</span>
                </Link>
              </>
            )}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Bidder Chip Purse Badge */}
            {userTeam && (
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
                <span className="text-emerald-800 font-bold uppercase text-[10px] tracking-wider">Purse:</span>
                <span className="font-black text-emerald-900">
                  {fmtChips(userTeam.remainingChips)}
                </span>
              </div>
            )}

            {!user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-bold text-slate-700 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="dark">
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to={isAdmin ? '/admin' : '/dashboard'}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                  title={isAdmin ? 'Admin Console' : 'Go to Dashboard'}
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
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {isAdmin ? 'System Admin' : profile?.role === 'bidder' ? 'Team Owner' : profile?.role === 'player' ? 'Athlete' : profile?.role || 'User'}
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
          {userTeam && !isAdmin && (
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs mb-2">
              <span className="text-emerald-800 font-bold uppercase">Team Purse:</span>
              <span className="font-black text-emerald-950">{fmtChips(userTeam.remainingChips)}</span>
            </div>
          )}

          {isAdmin ? (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-blue-600 bg-blue-50"
              >
                <ShieldIcon className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
              <Link
                to="/create"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Create Auction</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Live Auctions
              </Link>

              <Link
                to="/players"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Players Directory
              </Link>

              <Link
                to="/teams"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Team Owners & Bidders
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-slate-100">
            {!user ? (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {!isAdmin && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-700 bg-slate-50"
                  >
                    My Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50"
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
