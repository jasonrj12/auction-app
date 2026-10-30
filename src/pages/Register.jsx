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
  'Badminton',
  'Cricket',
  'Football',
  'Basketball',
  'Kabaddi',
  'Tennis',
  'Volleyball',
  'Other Sports',
];

const BADMINTON_DISCIPLINES = [
  "Men's Singles",
  "Women's Singles",
  "Men's Doubles",
  "Women's Doubles",
  "Mixed Doubles",
  "Doubles Specialist (Front Court / Net Interceptor)",
  "Doubles Specialist (Back Court / Hard Smasher)",
  "Singles Specialist",
  "All-Round Shuttler (Singles & Doubles)",
];

const BADMINTON_STYLES = [
  'Attacking / Steep Jump Smasher',
  'Defensive Counter-Attacker (Retrieval & Court Coverage)',
  'Net Playmaker / Hairpin Drop Specialist',
  'Tactical Rally Builder (Deceptive Clears & Drops)',
  'All-Round Precision Shuttler',
];

const BADMINTON_TIERS = [
  { tier: 'Icon / Elite (International / National Champion)', base: 20000 },
  { tier: 'Tier 1 (State / National Ranked Athlete)', base: 12000 },
  { tier: 'Tier 2 (District / University / Club Premier)', base: 6000 },
  { tier: 'Tier 3 (Emerging / Junior Talent)', base: 3000 },
];

const ROLES_BY_SPORT = {
  Badminton: BADMINTON_DISCIPLINES,
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

  // Player fields (Defaults to Badminton)
  const [playerForm, setPlayerForm] = useState({
    sport: 'Badminton', // DEFAULT SPORT: Badminton
    role: "Men's Singles",
    hand: 'Right-handed',
    style: 'Attacking / Steep Jump Smasher',
    tier: 'Tier 2 (District / University / Club Premier)',
    basePrice: 6000,
    matches: 45,
    wins: 34,
    losses: 11,
    ranking: 'State Rank #4',
    smashSpeed: '385 km/h',
    titles: '3 Titles, 5 Silver',
    racket: 'Yonex Astrox 100ZZ',
    bio: '',
  });

  // Bidder (Team Owner) fields
  const [teamLogo, setTeamLogo] = useState('');
  const [bidderForm, setBidderForm] = useState({
    teamName: '',
    teamShortCode: '',
    initialChips: 100000,
    squadLimit: 12,
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

  const handleTierChange = (e) => {
    const selectedTier = e.target.value;
    const found = BADMINTON_TIERS.find((t) => t.tier === selectedTier);
    setPlayerForm((prev) => ({
      ...prev,
      tier: selectedTier,
      basePrice: found ? found.base : prev.basePrice,
    }));
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
        const isBadminton = playerForm.sport === 'Badminton';
        const combinedStyle = isBadminton
          ? `${playerForm.hand} / ${playerForm.style}`
          : playerForm.style;

        const totalMatches = Number(playerForm.matches || 0);
        const wins = Number(playerForm.wins || 0);
        const winPercent = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) + '%' : '-';

        await registerPlayer(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dob: form.dob,
            photoUrl: photoData,
            sport: playerForm.sport,
            role: playerForm.role,
            style: combinedStyle,
            tier: playerForm.tier,
            basePrice: Number(playerForm.basePrice || 5000),
            matches: totalMatches,
            runsOrGoals: wins, // Wins in badminton
            wicketsOrAssists: Number(playerForm.losses || 0), // Losses in badminton
            highestScore: isBadminton && playerForm.smashSpeed ? `Smash: ${playerForm.smashSpeed}` : '-',
            average: isBadminton ? `${winPercent} Win Rate` : '-',
            strikeRate: isBadminton && playerForm.ranking ? playerForm.ranking : '-',
            racket: playerForm.racket || '',
            titles: playerForm.titles || '',
            bio: playerForm.bio,
          },
          createdUser
        );

        addToast(`${playerForm.sport} athlete registered. You are now in the auction pool.`, 'success');
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
            squadLimit: Number(bidderForm.squadLimit || 12),
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

  const isBadminton = playerForm.sport === 'Badminton';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 py-12">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sports Auction Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Register as a player or franchise owner for live player auctions (Default: Badminton)
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

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Section: Personal Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {roleType === 'player' ? 'Player Profile & Personal Details' : 'Franchise Owner Details'}
            </h3>

            <div className="flex flex-col items-center justify-center mb-4">
              <PhotoPicker
                value={photoData}
                onChange={setPhotoData}
                name={form.name}
                size="lg"
              />
              <span className="text-[11px] text-slate-400 mt-1 font-medium">
                {roleType === 'player' ? 'Athlete Headshot Photo' : 'Owner Profile Photo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                id="name"
                placeholder={roleType === 'player' ? 'e.g. Viktor Axelsen / P. V. Sindhu' : 'e.g. Ramesh Kumar'}
                value={form.name}
                onChange={updateCommon('name')}
                error={fieldErrors.name}
                required
              />

              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="athlete@example.com"
                value={form.email}
                onChange={updateCommon('email')}
                error={fieldErrors.email}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Mobile Number"
                id="phone"
                type="tel"
                placeholder="+94 77 123 4567"
                value={form.phone}
                onChange={updateCommon('phone')}
                error={fieldErrors.phone}
                helper="With international country code"
                required
              />

              <Input
                label="Date of Birth"
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
                label="Create Password"
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
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sport Discipline & Player Category
                </h3>
                {isBadminton && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Default Sport: Badminton
                  </span>
                )}
              </div>

              {/* Sport Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sport Discipline
                  </label>
                  <select
                    value={playerForm.sport}
                    onChange={(e) => {
                      const newSport = e.target.value;
                      const defaultRole = ROLES_BY_SPORT[newSport] ? ROLES_BY_SPORT[newSport][0] : 'Player';
                      setPlayerForm((prev) => ({
                        ...prev,
                        sport: newSport,
                        role: defaultRole,
                      }));
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
                    Playing Role / Event
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
                      placeholder="e.g. Singles Specialist"
                      value={playerForm.role}
                      onChange={updatePlayer('role')}
                    />
                  )}
                </div>
              </div>

              {/* BADMINTON SPECIFIC SECTION */}
              {isBadminton ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dominant Playing Hand
                      </label>
                      <select
                        value={playerForm.hand}
                        onChange={updatePlayer('hand')}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Right-handed">Right-handed</option>
                        <option value="Left-handed">Left-handed (Lefty Advantage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Badminton Playing Style
                      </label>
                      <select
                        value={playerForm.style}
                        onChange={updatePlayer('style')}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {BADMINTON_STYLES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Player Tier & Base Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Player Tier / Grading
                      </label>
                      <select
                        value={playerForm.tier}
                        onChange={handleTierChange}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {BADMINTON_TIERS.map((t) => (
                          <option key={t.tier} value={t.tier}>
                            {t.tier}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Auction Base Price (Chips)"
                      id="basePrice"
                      type="number"
                      value={playerForm.basePrice}
                      onChange={updatePlayer('basePrice')}
                      helper="Opening bid amount in chips"
                      required
                    />
                  </div>

                  {/* Badminton Career Stats */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Badminton Match & Performance Statistics
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Matches Played"
                        id="matches"
                        type="number"
                        value={playerForm.matches}
                        onChange={updatePlayer('matches')}
                      />
                      <Input
                        label="Career Wins"
                        id="wins"
                        type="number"
                        value={playerForm.wins}
                        onChange={updatePlayer('wins')}
                      />
                      <Input
                        label="Career Losses"
                        id="losses"
                        type="number"
                        value={playerForm.losses}
                        onChange={updatePlayer('losses')}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <Input
                        label="State / National / BWF Ranking"
                        id="ranking"
                        placeholder="e.g. State Rank #4, BWF #18"
                        value={playerForm.ranking}
                        onChange={updatePlayer('ranking')}
                      />
                      <Input
                        label="Recorded Top Smash Speed"
                        id="smashSpeed"
                        placeholder="e.g. 385 km/h"
                        value={playerForm.smashSpeed}
                        onChange={updatePlayer('smashSpeed')}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <Input
                        label="Tournaments / Medals Won"
                        id="titles"
                        placeholder="e.g. 3 Gold, 4 Silver Medals"
                        value={playerForm.titles}
                        onChange={updatePlayer('titles')}
                      />
                      <Input
                        label="Preferred Racket / Equipment"
                        id="racket"
                        placeholder="e.g. Yonex Astrox 100ZZ / Victor Thruster"
                        value={playerForm.racket}
                        onChange={updatePlayer('racket')}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Generic other sports fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Playing Style / Specialization"
                      id="style"
                      placeholder="e.g. Right-hand bat / Right-arm fast"
                      value={playerForm.style}
                      onChange={updatePlayer('style')}
                    />

                    <Input
                      label="Auction Base Price (Chips)"
                      id="basePrice"
                      type="number"
                      value={playerForm.basePrice}
                      onChange={updatePlayer('basePrice')}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Matches"
                      id="matches"
                      type="number"
                      value={playerForm.matches}
                      onChange={updatePlayer('matches')}
                    />
                    <Input
                      label="Wins / Runs"
                      id="wins"
                      type="number"
                      value={playerForm.wins}
                      onChange={updatePlayer('wins')}
                    />
                    <Input
                      label="Losses / Wickets"
                      id="losses"
                      type="number"
                      value={playerForm.losses}
                      onChange={updatePlayer('losses')}
                    />
                  </div>
                </div>
              )}

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Athlete Bio & Career Highlights (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Share details about your playing background, club achievements, or coaching history..."
                  value={playerForm.bio}
                  onChange={updatePlayer('bio')}
                />
              </div>
            </div>
          )}

          {/* Role Specific Fields: BIDDER / TEAM OWNER */}
          {roleType === 'bidder' && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Franchise & Badminton Team Details
              </h3>

              <div className="flex flex-col items-center justify-center mb-4">
                <PhotoPicker
                  value={teamLogo}
                  onChange={setTeamLogo}
                  name={bidderForm.teamName || 'Team'}
                  size="lg"
                />
                <span className="text-[11px] text-slate-400 mt-1 font-medium">
                  Team Crest / Logo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Team / Franchise Name"
                  id="teamName"
                  placeholder="e.g. Bangalore Blasters / Shuttle Smashers"
                  value={bidderForm.teamName}
                  onChange={updateBidder('teamName')}
                  error={fieldErrors.teamName}
                  required
                />

                <Input
                  label="Short Code / Tag"
                  id="teamShortCode"
                  placeholder="e.g. BB"
                  value={bidderForm.teamShortCode}
                  onChange={updateBidder('teamShortCode')}
                  helper="2-4 letter abbreviation"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Target Squad Size"
                  id="squadLimit"
                  type="number"
                  value={bidderForm.squadLimit}
                  onChange={updateBidder('squadLimit')}
                  helper="Recommended: 10 - 12 players (Singles & Doubles)"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-800 font-bold flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Badminton Franchise Purse:</span>
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  As a Team Owner, your franchise will receive an initial purse of <strong>100,000 Chips</strong> to bid on singles and doubles shuttlers during live auctions.
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
              ? `Register as ${playerForm.sport} Player`
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
