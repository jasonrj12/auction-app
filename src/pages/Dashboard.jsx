import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getPlayerById, updatePlayer } from '../services/players';
import { getTeamByUserId, updateTeam } from '../services/teams';
import { fmtChips } from '../lib/format';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Input from '../components/Input';
import PhotoPicker from '../components/PhotoPicker';

export default function Dashboard() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const isBidder = profile?.role === 'bidder';
  const isPlayer = profile?.role === 'player';

  const [playerData, setPlayerData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEditName(profile?.displayName || '');
    setEditPhone(profile?.phone || '');
    setEditPhoto(profile?.photoData || '');

    if (isPlayer) {
      getPlayerById(user.uid).then((p) => {
        if (p) {
          setPlayerData(p);
          setEditBasePrice(String(p.basePrice || 5000));
          setEditBio(p.bio || '');
        }
        setLoading(false);
      });
    } else if (isBidder) {
      getTeamByUserId(user.uid).then((t) => {
        if (t) setTeamData(t);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, profile, isPlayer, isBidder]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName.trim(),
        phone: editPhone.trim(),
        photoData: editPhoto,
      });

      // 2. Update player or team document
      if (isPlayer && playerData) {
        await updatePlayer(user.uid, {
          name: editName.trim(),
          phone: editPhone.trim(),
          photoUrl: editPhoto,
          basePrice: Number(editBasePrice) || playerData.basePrice,
          bio: editBio.trim(),
        });
        setPlayerData((prev) => ({
          ...prev,
          name: editName.trim(),
          phone: editPhone.trim(),
          photoUrl: editPhoto,
          basePrice: Number(editBasePrice) || prev.basePrice,
          bio: editBio.trim(),
        }));
      }

      if (isBidder && teamData) {
        await updateTeam(teamData.id, {
          ownerName: editName.trim(),
          ownerPhone: editPhone.trim(),
          ownerPhoto: editPhoto,
        });
        setTeamData((prev) => ({
          ...prev,
          ownerName: editName.trim(),
          ownerPhone: editPhone.trim(),
          ownerPhoto: editPhoto,
        }));
      }

      await refreshProfile();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Update error:', err);
      addToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* User Role Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar
              photoData={profile?.photoData}
              name={profile?.displayName || user?.email}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {profile?.displayName || user?.email?.split('@')[0]}
                </h1>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                  {isBidder ? '👑 Team Owner' : isPlayer ? '🏃 Athlete' : isAdmin ? '🛡️ Admin' : 'User'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {user?.email} {profile?.phone && `• ${profile.phone}`}
              </p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-3">
            {isBidder && teamData && (
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-right">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Remaining Purse</span>
                <span className="text-lg font-black text-amber-950">
                  🪙 {fmtChips(teamData.remainingChips)}
                </span>
              </div>
            )}
            {isAdmin && (
              <Link to="/admin">
                <Button className="bg-violet-600 hover:bg-violet-700 font-bold">
                  Open Admin Console
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="outline" className="font-bold">
                Join Live Auction ⚡
              </Button>
            </Link>
          </div>
        </div>

        {/* BIDDER / TEAM OWNER DASHBOARD */}
        {isBidder && teamData && (
          <div className="space-y-6">
            {/* Financial Overview Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Remaining Chips</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">
                  🪙 {fmtChips(teamData.remainingChips)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Available for bidding in live auctions</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Spent Chips</p>
                <p className="text-3xl font-black text-amber-700 mt-1">
                  🪙 {fmtChips(teamData.spentChips)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Total invested in squad recruitment</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Squad Roster Size</p>
                <p className="text-3xl font-black text-indigo-700 mt-1">
                  {teamData.squad?.length || 0} / {teamData.squadLimit || 15}
                </p>
                <p className="text-xs text-slate-400 mt-1">Athletes acquired on the hammer</p>
              </div>
            </div>

            {/* Team Squad Roster */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {teamData.teamName} Squad Roster
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official roster of players won during sports auctions
                  </p>
                </div>
                <Link to="/players">
                  <Button size="sm" variant="outline">Browse Available Players</Button>
                </Link>
              </div>

              {(!teamData.squad || teamData.squad.length === 0) ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <span className="text-4xl block mb-2">📋</span>
                  <p className="text-sm font-bold text-slate-800">Your squad is currently empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Join live auction rooms to place chip bids and sign players to your franchise.
                  </p>
                  <Link to="/">
                    <Button size="sm">Go to Live Auctions</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamData.squad.map((player, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm overflow-hidden flex-shrink-0">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            player.name?.slice(0, 1)
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{player.name}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {player.sport} • {player.role}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Won for</span>
                        <span className="text-sm font-black text-indigo-700">
                          🪙 {fmtChips(player.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATHLETE / PLAYER DASHBOARD */}
        {isPlayer && playerData && (
          <div className="space-y-6">
            {/* Player Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Your Player Status</h2>
                  <p className="text-xs text-slate-500">Live auction status and franchise assignment</p>
                </div>
                <div>
                  {playerData.status === 'sold' ? (
                    <span className="bg-emerald-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-sm">
                      ✓ SOLD to {playerData.soldToTeamName}
                    </span>
                  ) : playerData.status === 'in_auction' ? (
                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-sm animate-pulse">
                      🔥 IN LIVE AUCTION NOW
                    </span>
                  ) : playerData.status === 'unsold' ? (
                    <span className="bg-slate-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl">
                      Unsold (Will enter round 2)
                    </span>
                  ) : (
                    <span className="bg-indigo-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl">
                      🟢 Available in Auction Pool
                    </span>
                  )}
                </div>
              </div>

              {/* Sold Details Banner */}
              {playerData.status === 'sold' && (
                <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Contract Awarded</span>
                    <h3 className="text-lg font-black text-emerald-950">{playerData.soldToTeamName}</h3>
                    <p className="text-xs text-emerald-800">Franchise Owner: {playerData.soldToOwnerName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Winning Bid</span>
                    <p className="text-2xl font-black text-emerald-900">{fmtChips(playerData.soldPrice)}</p>
                  </div>
                </div>
              )}

              {/* Career Stats Grid */}
              <div className="mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Registered Career Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Sport</span>
                    <span className="text-sm font-black text-slate-900">{playerData.sport}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Playing Role</span>
                    <span className="text-sm font-black text-slate-900">{playerData.role}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Matches</span>
                    <span className="text-sm font-black text-slate-900">{playerData.stats?.matches ?? '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Base Price</span>
                    <span className="text-sm font-black text-indigo-700">{fmtChips(playerData.basePrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-1">Account & Profile Settings</h2>
          <p className="text-xs text-slate-500 mb-6">Update your contact information and public profile</p>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div className="flex flex-col items-center justify-center mb-4">
              <PhotoPicker
                value={editPhoto}
                onChange={setEditPhoto}
                name={editName}
                size="lg"
              />
              <span className="text-[11px] text-slate-400 mt-1">Profile Photo</span>
            </div>

            <Input
              label="Full Name"
              id="editName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <Input
              label="Mobile Number"
              id="editPhone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />

            {isPlayer && (
              <>
                <Input
                  label="Auction Base Price (Chips 🪙)"
                  id="editBasePrice"
                  type="number"
                  value={editBasePrice}
                  onChange={(e) => setEditBasePrice(e.target.value)}
                  disabled={playerData?.status === 'sold'}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bio & Achievements
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 font-bold px-8 mt-2"
            >
              {saving ? 'Saving changes…' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
