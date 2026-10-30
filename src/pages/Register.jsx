import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Input from '../components/Input';
import Button from '../components/Button';
import Notice from '../components/Notice';
import PhotoPicker from '../components/PhotoPicker';
import { TrophyIcon, PlayerIcon, OwnerIcon, InfoIcon } from '../components/Icons';
import { validatePhone, validateDob } from '../lib/validators';
import { friendlyError } from '../lib/errors';
import { useToast } from '../context/ToastContext';
import { registerPlayer } from '../services/players';
import { registerTeam } from '../services/teams';

const SPORTS_OPTIONS = [
  'Cricket',
  'Football',
  'Basketball',
  'Kabaddi',
  'Badminton',
  'Volleyball',
  'Tennis',
  'Other Sports',
];

const ROLES_BY_SPORT = {
  Cricket: [
    'Top-Order Batsman',
    'Middle-Order Batsman',
    'Fast Bowler',
    'Spin Bowler',
    'All-Rounder',
    'Wicketkeeper Batsman',
  ],
  Football: [
    'Forward / Striker',
    'Winger',
    'Attacking Midfielder',
    'Central Midfielder',
    'Center-Back Defender',
    'Full-Back',
    'Goalkeeper',
  ],
  Basketball: [
    'Point Guard',
    'Shooting Guard',
    'Small Forward',
    'Power Forward',
    'Center',
  ],
};

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [roleType, setRoleType] = useState('player'); // 'player' | 'bidder'

  // Common user fields
  const [photoData, setPhotoData] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
  });

  // Player-specific fields
  const [playerForm, setPlayerForm] = useState({
    sport: 'Cricket',
    role: 'Top-Order Batsman',
    style: 'Right-hand bat',
    basePrice: 5000,
    matches: 25,
    runsOrGoals: 850,
    wicketsOrAssists: 12,
    highestScore: '112*',
    average: '38.5',
    strikeRate: '124.2',
    bio: '',
  });

  // Bidder (Team Owner) specific fields
  const [teamLogo, setTeamLogo] = useState('');
  const [bidderForm, setBidderForm] = useState({
    teamName: '',
    teamShortCode: '',
    initialChips: 100000,
    squadLimit: 15,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateCommon = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const updatePlayer = (key) => (e) => {
    setPlayerForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateBidder = (key) => (e) => {
    setBidderForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const errors = {};

    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.email.trim()) errors.email = 'Email address is required.';

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;

    const dobErr = validateDob(form.dob);
    if (dobErr) errors.dob = dobErr;

    if (!form.password || form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (roleType === 'bidder') {
      if (!bidderForm.teamName.trim()) {
        errors.teamName = 'Team name is required for team owners.';
      }
    }

    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const createdUser = userCredential.user;

      await updateProfile(createdUser, {
        displayName: form.name.trim(),
      });

      // 2. Create User document
      await setDoc(doc(db, 'users', createdUser.uid), {
        displayName: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dob: form.dob,
        photoData: photoData || '',
        role: roleType,
        disabled: false,
        createdAt: serverTimestamp(),
      });

      // 3. Register corresponding Player or Team entry
      if (roleType === 'player') {
        await registerPlayer(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dob: form.dob,
            photoUrl: photoData,
            sport: playerForm.sport,
            role: playerForm.role,
            style: playerForm.style,
            basePrice: Number(playerForm.basePrice || 1000),
            matches: Number(playerForm.matches || 0),
            runsOrGoals: Number(playerForm.runsOrGoals || 0),
            wicketsOrAssists: Number(playerForm.wicketsOrAssists || 0),
            highestScore: playerForm.highestScore,
            average: playerForm.average,
            strikeRate: playerForm.strikeRate,
            bio: playerForm.bio,
          },
          createdUser
        );

        addToast('Player registration successful. You are in the auction pool.', 'success');
        navigate('/players');
      } else {
        await registerTeam(
          {
            teamName: bidderForm.teamName.trim(),
            teamShortCode: bidderForm.teamShortCode.trim() || bidderForm.teamName.trim().slice(0, 3).toUpperCase(),
            teamLogo: teamLogo || photoData || '',
            ownerName: form.name.trim(),
            ownerEmail: form.email.trim(),
            ownerPhone: form.phone.trim(),
            ownerPhoto: photoData,
            initialChips: Number(bidderForm.initialChips || 100000),
            squadLimit: Number(bidderForm.squadLimit || 15),
          },
          createdUser
        );

        addToast(`Team '${bidderForm.teamName}' registered with 100,000 Chips.`, 'success');
        navigate('/teams');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setGeneralError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sports Auction Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Choose your role to participate in live sports player auctions
          </p>
        </div>

        {/* Role Toggle Switch */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => setRoleType('player')}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              roleType === 'player'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayerIcon className="w-4 h-4" />
            <span>Sports Player</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleType('bidder')}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              roleType === 'bidder'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <OwnerIcon className="w-4 h-4" />
            <span>Team Owner</span>
          </button>
        </div>

        {generalError && (
          <Notice type="error" className="mb-6">
            {generalError}
          </Notice>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Section: Personal Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {roleType === 'player' ? 'Player Profile Details' : 'Owner Profile Details'}
            </h3>

            <div className="flex flex-col items-center justify-center mb-4">
              <PhotoPicker
                value={photoData}
                onChange={setPhotoData}
                name={form.name}
                size="lg"
              />
              <span className="text-[11px] text-slate-400 mt-1">
                {roleType === 'player' ? 'Player headshot photo' : 'Owner profile photo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full name"
                id="name"
                placeholder={roleType === 'player' ? 'e.g. David Miller' : 'e.g. Arthur Blank'}
                value={form.name}
                onChange={updateCommon('name')}
                error={fieldErrors.name}
                required
              />

              <Input
                label="Email address"
                id="email"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={updateCommon('email')}
                error={fieldErrors.email}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Mobile number"
                id="phone"
                type="tel"
                placeholder="+94 77 123 4567"
                value={form.phone}
                onChange={updateCommon('phone')}
                error={fieldErrors.phone}
                helper="With country code"
                required
              />

              <Input
                label="Date of birth"
                id="dob"
                type="date"
                value={form.dob}
                onChange={updateCommon('dob')}
                error={fieldErrors.dob}
                required
              />
            </div>

            <div className="mt-4">
              <Input
                label="Create password"
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={updateCommon('password')}
                error={fieldErrors.password}
                required
              />
            </div>
          </div>

          {/* Role Specific Fields: PLAYER */}
          {roleType === 'player' && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Sports Career & Auction Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sport
                  </label>
                  <select
                    value={playerForm.sport}
                    onChange={(e) => {
                      const newSport = e.target.value;
                      const defaultRole = ROLES_BY_SPORT[newSport] ? ROLES_BY_SPORT[newSport][0] : 'Player';
                      setPlayerForm((prev) => ({ ...prev, sport: newSport, role: defaultRole }));
                    }}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    {SPORTS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Playing Role / Position
                  </label>
                  {ROLES_BY_SPORT[playerForm.sport] ? (
                    <select
                      value={playerForm.role}
                      onChange={updatePlayer('role')}
                      className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      {ROLES_BY_SPORT[playerForm.sport].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="role"
                      placeholder="e.g. Defender, Wicketkeeper"
                      value={playerForm.role}
                      onChange={updatePlayer('role')}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Playing style / Specialization"
                  id="style"
                  placeholder="e.g. Right-hand bat / Right-arm fast"
                  value={playerForm.style}
                  onChange={updatePlayer('style')}
                />

                <Input
                  label="Auction Base Price (Chips)"
                  id="basePrice"
                  type="number"
                  placeholder="e.g. 5000"
                  value={playerForm.basePrice}
                  onChange={updatePlayer('basePrice')}
                  helper="Opening bid amount in chips"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <Input
                  label="Matches"
                  id="matches"
                  type="number"
                  value={playerForm.matches}
                  onChange={updatePlayer('matches')}
                />
                <Input
                  label="Runs / Goals"
                  id="runsOrGoals"
                  type="number"
                  value={playerForm.runsOrGoals}
                  onChange={updatePlayer('runsOrGoals')}
                />
                <Input
                  label="Wickets / Assists"
                  id="wicketsOrAssists"
                  type="number"
                  value={playerForm.wicketsOrAssists}
                  onChange={updatePlayer('wicketsOrAssists')}
                />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Player Bio / Achievements (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Career highlights, previous leagues, or awards..."
                  value={playerForm.bio}
                  onChange={updatePlayer('bio')}
                />
              </div>
            </div>
          )}

          {/* Role Specific Fields: BIDDER / TEAM OWNER */}
          {roleType === 'bidder' && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Franchise & Team Details
              </h3>

              <div className="flex flex-col items-center justify-center mb-4">
                <PhotoPicker
                  value={teamLogo}
                  onChange={setTeamLogo}
                  name={bidderForm.teamName || 'Team'}
                  size="lg"
                />
                <span className="text-[11px] text-slate-400 mt-1">
                  Team Logo / Crest (optional)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Team / Franchise name"
                  id="teamName"
                  placeholder="e.g. Royal Strikers"
                  value={bidderForm.teamName}
                  onChange={updateBidder('teamName')}
                  error={fieldErrors.teamName}
                  required
                />

                <Input
                  label="Short code / Tag"
                  id="teamShortCode"
                  placeholder="e.g. RS"
                  value={bidderForm.teamShortCode}
                  onChange={updateBidder('teamShortCode')}
                  helper="2-4 letter abbreviation"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Allocated Chip Purse"
                  id="initialChips"
                  type="number"
                  value={bidderForm.initialChips}
                  onChange={updateBidder('initialChips')}
                  helper="Starting purse for purchasing players"
                  disabled
                />

                <Input
                  label="Max Squad Size"
                  id="squadLimit"
                  type="number"
                  value={bidderForm.squadLimit}
                  onChange={updateBidder('squadLimit')}
                  helper="Maximum players in your team"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">
                <p className="text-xs text-slate-800 font-bold flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Team Owner Allocation:</span>
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  As a Team Owner, you will be allocated <strong>100,000 Chips</strong> in your purse to bid on and purchase players in live sports auctions.
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full bg-slate-900 hover:bg-black font-bold shadow-md mt-6"
          >
            {submitting
              ? 'Creating your account…'
              : roleType === 'player'
              ? 'Register as Sports Player'
              : 'Register as Team Owner'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-bold text-blue-600 hover:text-blue-800 transition"
            >
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
