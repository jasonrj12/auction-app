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
  'Defensive Counter-Attacker (Retrieval & Stamina)',
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

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [roleType, setRoleType] = useState('player'); // 'player' | 'bidder'

  // Personal Info (empty by default)
  const [photoData, setPhotoData] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
  });

  // Player fields (all empty by default, strictly Badminton)
  const [playerForm, setPlayerForm] = useState({
    role: '',
    hand: 'Right-handed',
    style: '',
    tier: '',
    matches: '',
    wins: '',
    losses: '',
    ranking: '',
    smashSpeed: '',
    titles: '',
    racket: '',
    bio: '',
  });

  // Bidder (Team Owner) fields (empty by default)
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
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }));
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

    if (roleType === 'player') {
      if (!playerForm.role) {
        errors.role = 'Please select your badminton event / discipline.';
      }
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

      // 3. Register Player or Team
      if (roleType === 'player') {
        const totalMatches = playerForm.matches ? Number(playerForm.matches) : 0;
        const totalWins = playerForm.wins ? Number(playerForm.wins) : 0;
        const totalLosses = playerForm.losses ? Number(playerForm.losses) : 0;
        const winPercent = totalMatches > 0 ? `${((totalWins / totalMatches) * 100).toFixed(1)}% Win Rate` : '-';

        // Calculate base price from tier, without requiring player to enter bid amount
        const tierObj = BADMINTON_TIERS.find((t) => t.tier === playerForm.tier);
        const calculatedBasePrice = tierObj ? tierObj.base : 5000;

        const combinedStyle = [playerForm.hand, playerForm.style].filter(Boolean).join(' / ');

        await registerPlayer(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dob: form.dob,
            photoUrl: photoData,
            sport: 'Badminton',
            role: playerForm.role || "Men's Singles",
            style: combinedStyle || 'Right-handed',
            tier: playerForm.tier || 'Tier 2 (District / Club)',
            basePrice: calculatedBasePrice,
            matches: totalMatches,
            runsOrGoals: totalWins, // Career wins
            wicketsOrAssists: totalLosses, // Career losses
            highestScore: playerForm.smashSpeed ? `Smash: ${playerForm.smashSpeed}` : '-',
            average: winPercent,
            strikeRate: playerForm.ranking || '-',
            racket: playerForm.racket || '',
            titles: playerForm.titles || '',
            bio: playerForm.bio || '',
          },
          createdUser
        );

        addToast('Badminton player registration successful. You are in the auction pool.', 'success');
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

        addToast(`Badminton franchise '${bidderForm.teamName}' registered.`, 'success');
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
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Badminton Auction Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Register as a player or franchise owner for badminton league auctions
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
            <span>Badminton Player</span>
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
              {roleType === 'player' ? 'Personal Details' : 'Owner Details'}
            </h3>

            <div className="flex flex-col items-center justify-center mb-4">
              <PhotoPicker
                value={photoData}
                onChange={setPhotoData}
                name={form.name}
                size="lg"
              />
              <span className="text-[11px] text-slate-400 mt-1 font-medium">
                {roleType === 'player' ? 'Upload Headshot' : 'Upload Owner Photo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                id="name"
                placeholder="Enter full name"
                value={form.name}
                onChange={updateCommon('name')}
                error={fieldErrors.name}
                required
              />

              <Input
                label="Email Address"
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
                label="Mobile Number"
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

          {/* Role Specific Fields: BADMINTON PLAYER */}
          {roleType === 'player' && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Badminton Profile & Technical Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event / Discipline <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={playerForm.role}
                    onChange={updatePlayer('role')}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">Select your discipline...</option>
                    {BADMINTON_DISCIPLINES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {fieldErrors.role && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.role}</p>
                  )}
                </div>

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
                    <option value="Left-handed">Left-handed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badminton Playing Style
                  </label>
                  <select
                    value={playerForm.style}
                    onChange={updatePlayer('style')}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select playing style...</option>
                    {BADMINTON_STYLES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Player Tier / Grade
                  </label>
                  <select
                    value={playerForm.tier}
                    onChange={updatePlayer('tier')}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select your level...</option>
                    {BADMINTON_TIERS.map((t) => (
                      <option key={t.tier} value={t.tier}>{t.tier}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Badminton Match Statistics */}
              <div className="pt-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Match & Career Record
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Matches Played"
                    id="matches"
                    type="number"
                    placeholder="e.g. 30"
                    value={playerForm.matches}
                    onChange={updatePlayer('matches')}
                  />
                  <Input
                    label="Career Wins"
                    id="wins"
                    type="number"
                    placeholder="e.g. 22"
                    value={playerForm.wins}
                    onChange={updatePlayer('wins')}
                  />
                  <Input
                    label="Career Losses"
                    id="losses"
                    type="number"
                    placeholder="e.g. 8"
                    value={playerForm.losses}
                    onChange={updatePlayer('losses')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <Input
                    label="State / National / Club Ranking"
                    id="ranking"
                    placeholder="e.g. State Rank #4, District Top 8"
                    value={playerForm.ranking}
                    onChange={updatePlayer('ranking')}
                  />
                  <Input
                    label="Top Smash Speed (Optional)"
                    id="smashSpeed"
                    placeholder="e.g. 360 km/h"
                    value={playerForm.smashSpeed}
                    onChange={updatePlayer('smashSpeed')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <Input
                    label="Medals & Tournament Titles"
                    id="titles"
                    placeholder="e.g. 2 Gold, 3 Silver medals"
                    value={playerForm.titles}
                    onChange={updatePlayer('titles')}
                  />
                  <Input
                    label="Racket / Equipment"
                    id="racket"
                    placeholder="e.g. Yonex Astrox / Victor Thruster"
                    value={playerForm.racket}
                    onChange={updatePlayer('racket')}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Athlete Bio & Playing Background (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Share details about your badminton journey, club affiliations, or achievements..."
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

              <div>
                <Input
                  label="Target Squad Size"
                  id="squadLimit"
                  type="number"
                  placeholder="12"
                  value={bidderForm.squadLimit}
                  onChange={updateBidder('squadLimit')}
                  helper="Target players in squad (Singles & Doubles shuttlers)"
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
              ? 'Register as Badminton Player'
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
