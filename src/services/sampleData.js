import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { registerPlayer } from './players';
import { registerTeam } from './teams';
import { createSportsAuction } from './sportsAuctions';

export const SAMPLE_PLAYERS = [
  {
    name: 'Virat Kohli',
    sport: 'Cricket',
    role: 'Top-Order Batsman',
    style: 'Right-hand bat',
    age: 35,
    bio: 'World-renowned batting master with over 13,000 ODI runs and aggressive on-field leadership.',
    photoUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=300&auto=format&fit=crop&q=80',
    basePrice: 20000,
    matches: 292,
    runsOrGoals: 13848,
    wicketsOrAssists: 5,
    highestScore: '183',
    average: '58.67',
    strikeRate: '93.58',
  },
  {
    name: 'Jasprit Bumrah',
    sport: 'Cricket',
    role: 'Fast Bowler',
    style: 'Right-arm fast yorker specialist',
    age: 30,
    bio: 'Premier death-overs bowler known for unplayable yorkers, sharp bouncers, and low economy rate.',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    basePrice: 18000,
    matches: 89,
    runsOrGoals: 45,
    wicketsOrAssists: 149,
    highestScore: '16*',
    average: '23.55',
    strikeRate: '4.63 Econ',
  },
  {
    name: 'Ben Stokes',
    sport: 'Cricket',
    role: 'All-Rounder',
    style: 'Left-hand bat / Right-arm fast medium',
    age: 33,
    bio: 'Clutch match-winner in critical situations with power hitting and high-impact breakthroughs.',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    basePrice: 16000,
    matches: 114,
    runsOrGoals: 3450,
    wicketsOrAssists: 74,
    highestScore: '182',
    average: '39.42',
    strikeRate: '96.20',
  },
  {
    name: 'Rashid Khan',
    sport: 'Cricket',
    role: 'Spin Bowler',
    style: 'Right-arm legbreak googly',
    age: 26,
    bio: 'T20 superstar spinner with lightning quick arm action and hard-hitting lower order batting.',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    basePrice: 15000,
    matches: 105,
    runsOrGoals: 1350,
    wicketsOrAssists: 185,
    highestScore: '69*',
    average: '19.22',
    strikeRate: '5.85 Econ',
  },
  {
    name: 'Kylian Mbappé',
    sport: 'Football',
    role: 'Forward / Winger',
    style: 'Right-footed explosive sprinter',
    age: 25,
    bio: 'World Cup winner celebrated for world-class sprint pace, clinical finishing, and dribbling wizardry.',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    basePrice: 22000,
    matches: 210,
    runsOrGoals: 191,
    wicketsOrAssists: 76,
    highestScore: '4 goals in a match',
    average: '0.91 Goals/Match',
    strikeRate: '36 km/h Top Speed',
  },
  {
    name: 'Jude Bellingham',
    sport: 'Football',
    role: 'Midfielder',
    style: 'Box-to-box playmaker',
    age: 21,
    bio: 'Dynamic central midfield orchestrator with late box arrivals, composure under pressure, and vision.',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    basePrice: 17000,
    matches: 145,
    runsOrGoals: 42,
    wicketsOrAssists: 38,
    highestScore: '2 goals in El Clasico',
    average: '88% Pass Acc',
    strikeRate: '11.8 km/Match',
  },
  {
    name: 'Virgil van Dijk',
    sport: 'Football',
    role: 'Center-Back Defender',
    style: 'Right-footed commanding defensive wall',
    age: 33,
    bio: 'Imposing defensive leader with supreme aerial presence, reading of the game, and pinpoint long passing.',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    basePrice: 14000,
    matches: 230,
    runsOrGoals: 21,
    wicketsOrAssists: 142, // Clean sheets
    highestScore: '89% Aerial Duels Won',
    average: '78 Tackles/Season',
    strikeRate: '91% Pass Acc',
  },
  {
    name: 'LeBron James',
    sport: 'Basketball',
    role: 'Small Forward / Point Forward',
    style: 'Right-handed versatile powerhouse',
    age: 39,
    bio: 'All-time leading scorer in NBA history, 4x NBA Champion, unstoppable transition locomotive.',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    basePrice: 20000,
    matches: 1492,
    runsOrGoals: 40474,
    wicketsOrAssists: 11009,
    highestScore: '61 Points',
    average: '27.1 PPG',
    strikeRate: '7.5 RPG / 7.4 APG',
  },
];

export const SAMPLE_TEAMS = [
  {
    teamName: 'Royal Strikers',
    teamShortCode: 'RS',
    teamLogo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Vikram Singhania',
    ownerEmail: 'vikram@royalstrikers.com',
    ownerPhone: '+94 77 111 2233',
    initialChips: 100000,
    squadLimit: 15,
  },
  {
    teamName: 'Titan Warriors',
    teamShortCode: 'TW',
    teamLogo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Sarah Jenkins',
    ownerEmail: 'sarah@titanwarriors.com',
    ownerPhone: '+94 71 444 5566',
    initialChips: 100000,
    squadLimit: 15,
  },
  {
    teamName: 'Bengal Tigers FC',
    teamShortCode: 'BT',
    teamLogo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Arjun Das',
    ownerEmail: 'arjun@bengaltigers.com',
    ownerPhone: '+94 76 777 8899',
    initialChips: 100000,
    squadLimit: 15,
  },
  {
    teamName: 'Coastal Kings',
    teamShortCode: 'CK',
    teamLogo: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&auto=format&fit=crop&q=80',
    ownerName: 'Devon Fernando',
    ownerEmail: 'devon@coastalkings.com',
    ownerPhone: '+94 70 222 3344',
    initialChips: 100000,
    squadLimit: 15,
  },
];

/**
 * Seed sample sports players and teams if the database is clean.
 */
export async function seedSampleSportsData(user = null, profile = null) {
  // Check if players already exist
  const existingPlayersSnap = await getDocs(collection(db, 'players'));
  if (existingPlayersSnap.empty) {
    for (const p of SAMPLE_PLAYERS) {
      await registerPlayer(p);
    }
  }

  // Check if teams already exist
  const existingTeamsSnap = await getDocs(collection(db, 'teams'));
  if (existingTeamsSnap.empty) {
    for (const t of SAMPLE_TEAMS) {
      await registerTeam(t);
    }
  }

  // Check if sports auctions already exist
  const existingAuctionsSnap = await getDocs(collection(db, 'auctions'));
  if (existingAuctionsSnap.empty && user) {
    await createSportsAuction(
      {
        title: 'Premier Cricket Super League 2026 Auction',
        sport: 'Cricket',
        description: 'Official player auction for the 2026 season. Team owners bid using allocated chip budgets.',
        imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
        minIncrement: 500,
        defaultChips: 100000,
        status: 'live',
      },
      user,
      profile
    );
  }
}
