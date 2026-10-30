import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { registerPlayer } from './players';
import { registerTeam } from './teams';
import { createSportsAuction } from './sportsAuctions';

export const SAMPLE_PLAYERS = [
  {
    name: 'Viktor Axelsen',
    sport: 'Badminton',
    role: "Men's Singles",
    style: 'Right-handed / Power Smasher & Steep Angle Dominance',
    age: 30,
    bio: 'Two-time Olympic Gold Medalist and World Champion known for towering smash height, steep angle trajectory, and impenetrable defense.',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    basePrice: 25000,
    matches: 520,
    runsOrGoals: 442, // Wins
    wicketsOrAssists: 78, // Losses
    highestScore: 'Smash: 419 km/h',
    average: '85.0% Win Rate',
    strikeRate: 'Rank #1 (BWF World)',
  },
  {
    name: 'P. V. Sindhu',
    sport: 'Badminton',
    role: "Women's Singles",
    style: 'Right-handed / Aggressive Attacking & Deep Court Reach',
    age: 29,
    bio: 'First Indian to become Badminton World Champion and two-time Olympic Medalist celebrated for clutch tournament performances and steep smashes.',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    basePrice: 22000,
    matches: 615,
    runsOrGoals: 438,
    wicketsOrAssists: 177,
    highestScore: 'Smash: 349 km/h',
    average: '71.2% Win Rate',
    strikeRate: 'Rank #7 (BWF World)',
  },
  {
    name: 'Satwiksairaj Rankireddy',
    sport: 'Badminton',
    role: "Men's Doubles (Back Court / Smasher)",
    style: 'Right-handed / Heavy Artillery Jump Smasher',
    age: 24,
    bio: 'Guinness World Record holder for the fastest recorded badminton smash (565 km/h). Asian Games Gold Medalist and World No. 1 pair.',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    basePrice: 20000,
    matches: 340,
    runsOrGoals: 258,
    wicketsOrAssists: 82,
    highestScore: 'Smash: 565 km/h (World Record)',
    average: '75.8% Win Rate',
    strikeRate: 'Rank #1 (BWF Doubles)',
  },
  {
    name: 'Chirag Shetty',
    sport: 'Badminton',
    role: "Men's Doubles (Front Court / Net Playmaker)",
    style: 'Right-handed / Rapid Front-Court Interceptions & Flat Drives',
    age: 27,
    bio: 'World No. 1 doubles mastermind known for lightning-quick net reflex kills, flat drive exchanges, and match tactician abilities.',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    basePrice: 19000,
    matches: 350,
    runsOrGoals: 265,
    wicketsOrAssists: 85,
    highestScore: 'Smash: 395 km/h',
    average: '75.7% Win Rate',
    strikeRate: 'Rank #1 (BWF Doubles)',
  },
  {
    name: 'Tai Tzu-ying',
    sport: 'Badminton',
    role: "Women's Singles",
    style: 'Right-handed / Queen of Deception & Hairpin Net Shots',
    age: 30,
    bio: 'Legendary Taiwanese shuttler renowned as the most deceptive player in badminton history, combining wrist wizardry with effortless court movement.',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
    basePrice: 23000,
    matches: 680,
    runsOrGoals: 512,
    wicketsOrAssists: 168,
    highestScore: 'Smash: 360 km/h',
    average: '75.3% Win Rate',
    strikeRate: 'Rank #3 (Former #1)',
  },
  {
    name: 'Lakshya Sen',
    sport: 'Badminton',
    role: "Men's Singles",
    style: 'Right-handed / High Stamina Counter-Attacker & Acrobatic Retrieval',
    age: 23,
    bio: 'Commonwealth Games Gold Medalist and Olympic semifinalist known for fearless diving retrievals, rapid footwork, and high-speed baseline counter-punches.',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    basePrice: 17000,
    matches: 285,
    runsOrGoals: 198,
    wicketsOrAssists: 87,
    highestScore: 'Smash: 420 km/h',
    average: '69.5% Win Rate',
    strikeRate: 'Rank #14 (BWF World)',
  },
  {
    name: 'Carolina Marín',
    sport: 'Badminton',
    role: "Women's Singles",
    style: 'Left-handed / Relentless High-Tempo Left-Arm Smasher',
    age: 31,
    bio: 'Olympic Champion and 3x World Champion known as one of the fiercest competitors in badminton, dominating rallies with left-handed angles and relentless speed.',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    basePrice: 21000,
    matches: 580,
    runsOrGoals: 440,
    wicketsOrAssists: 140,
    highestScore: 'Smash: 356 km/h',
    average: '75.8% Win Rate',
    strikeRate: 'Rank #4 (Former #1)',
  },
  {
    name: 'Lee Zii Jia',
    sport: 'Badminton',
    role: "Men's Singles",
    style: 'Right-handed / Explosive Backhand Smash Specialist',
    age: 26,
    bio: 'All England Champion and Olympic Bronze Medalist celebrated for having the most destructive backhand smash and explosive jump smashes on tour.',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    basePrice: 18000,
    matches: 310,
    runsOrGoals: 212,
    wicketsOrAssists: 98,
    highestScore: 'Smash: 426 km/h',
    average: '68.4% Win Rate',
    strikeRate: 'Rank #6 (BWF World)',
  },
];

export const SAMPLE_TEAMS = [
  {
    teamName: 'Hyderabad Smashers',
    teamShortCode: 'HS',
    teamLogo: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Vikram Singhania',
    ownerEmail: 'vikram@hyderabadsmashers.com',
    ownerPhone: '+94 77 111 2233',
    initialChips: 100000,
    squadLimit: 12,
  },
  {
    teamName: 'Bangalore Blasters',
    teamShortCode: 'BB',
    teamLogo: 'https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Sarah Jenkins',
    ownerEmail: 'sarah@bangaloreblasters.com',
    ownerPhone: '+94 71 444 5566',
    initialChips: 100000,
    squadLimit: 12,
  },
  {
    teamName: 'Chennai Shuttlers',
    teamShortCode: 'CS',
    teamLogo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Arjun Das',
    ownerEmail: 'arjun@chennaishuttlers.com',
    ownerPhone: '+94 76 777 8899',
    initialChips: 100000,
    squadLimit: 12,
  },
  {
    teamName: 'Mumbai Aces',
    teamShortCode: 'MA',
    teamLogo: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Devon Fernando',
    ownerEmail: 'devon@mumbaiaces.com',
    ownerPhone: '+94 70 222 3344',
    initialChips: 100000,
    squadLimit: 12,
  },
];

/**
 * Seed sample sports players and teams if the database is clean.
 */
export async function seedSampleSportsData(user = null, profile = null) {
  const existingPlayersSnap = await getDocs(collection(db, 'players'));
  if (existingPlayersSnap.empty) {
    for (const p of SAMPLE_PLAYERS) {
      await registerPlayer(p);
    }
  }

  const existingTeamsSnap = await getDocs(collection(db, 'teams'));
  if (existingTeamsSnap.empty) {
    for (const t of SAMPLE_TEAMS) {
      await registerTeam(t);
    }
  }

  const existingAuctionsSnap = await getDocs(collection(db, 'auctions'));
  if (existingAuctionsSnap.empty && user) {
    await createSportsAuction(
      {
        title: 'Premier Badminton League 2026 Player Auction',
        sport: 'Badminton',
        description: 'Official auction for the 2026 Badminton League season. Franchise team owners bid using chip purses to build balanced singles & doubles squads.',
        imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
        minIncrement: 500,
        defaultChips: 100000,
        status: 'live',
      },
      user,
      profile
    );
  }
}
