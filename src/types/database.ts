export type UserRole = 'user' | 'admin' | 'referee';
export type GameType = 'codm' | 'fortnite' | 'fifa' | 'warzone' | 'apex' | 'valorant' | 'injustice' | 'mortal_kombat' | 'efootball' | 'pubg_mobile';
export type TournamentStatus = 'open' | 'live' | 'active' | 'completed' | 'cancelled';
export type TournamentFormat = 'solo' | 'duo' | 'squad';
export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin';
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'disputed';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved';
export type DisputeType = 'wrong_score' | 'cheating' | 'no_show' | 'technical_issue';
export type PayoutStatus = 'pending' | 'approved' | 'sent' | 'failed' | 'rejected';
export type TransactionType = 'credit' | 'debit' | 'withdrawal' | 'refund' | 'payout' | 'deposit' | 'tournament_win' | 'tournament_fee' | 'challenge_fee' | 'challenge_win';
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

// Game modes for each game
export type GameMode = 
  | 'codm_1v1' | 'codm_tdm' | 'codm_2v2' | 'codm_snd' | 'codm_br' | 'codm_domination' | 'codm_hardpoint' | 'codm_ffa'
  | 'fortnite_solo' | 'fortnite_duo' | 'fortnite_squad' | 'fortnite_arena' | 'fortnite_creative'
  | 'fifa_1v1' | 'fifa_2v2' | 'fifa_pro_clubs' | 'fifa_ultimate_team'
  | 'warzone_solo' | 'warzone_duo' | 'warzone_trio' | 'warzone_quad' | 'warzone_plunder'
  | 'apex_solo' | 'apex_duo' | 'apex_trio' | 'apex_arena'
  | 'valorant_5v5' | 'valorant_spike_rush' | 'valorant_deathmatch' | 'valorant_escalation'
  | 'injustice_1v1' | 'injustice_king_of_the_hill' | 'injustice_survivor' | 'injustice_tournament'
  | 'mortal_kombat_1v1' | 'mortal_kombat_king_of_the_hill' | 'mortal_kombat_tower' | 'mortal_kombat_tournament'
  | 'efootball_1v1'
  | 'pubg_mobile_solo' | 'pubg_mobile_duo' | 'pubg_mobile_squad';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  username: string;
  gamertag: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_games: GameType[];
  total_earnings: number;
  tournaments_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  current_streak: number;
  longest_streak: number;
  global_rank: number | null;
  tier: string;
  disputes_filed: number;
  disputes_won: number;
  is_suspended: boolean;
  suspension_until: string | null;
  last_seen_at?: string;
  location?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  // Wallet fields
  available_balance?: number;
  pending_balance?: number;
  currency?: string;
  stripe_customer_id?: string;
  stripe_connect_account_id?: string;
  // Arena Currency (Demo Mode)
  arena_currency?: number;
  feedback_submitted?: boolean;
  // Quick Match Rating
  rating?: number;
  twitch_handle?: string | null;
  efootball_id?: string | null;
  pubg_id?: string | null;
}

export interface Gamertag {
  id: string;
  user_id: string;
  game: GameType;
  gamertag: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  game: GameType;
  mode: GameMode | null;
  team_size: number;
  description: string | null;
  rules: string | null;
  format: TournamentFormat;
  bracket_type: BracketType;
  max_players: number;
  min_participants: number;
  current_players: number;
  entry_fee: number;
  prize_pool: number;
  creator_contribution: number;
  prize_distribution: Record<string, number>;
  platform_fee_percentage: number;
  status: TournamentStatus;
  start_time: string;
  check_in_window: number;
  match_time_limit: number;
  score_reporting_type: string;
  tie_break_rules: string | null;
  banned_items: string | null;
  rounds_to_win: number;
  created_by: string | null;
  featured: boolean;
  bracket: {
    rounds: Array<{
      matches: Array<{
        id: string;
        player1_id: string | null;
        player2_id: string | null;
        winner_id: string | null;
        score: { p1: number; p2: number } | null;
      }>;
    }>;
  };
  winner_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  team_id?: string | null;
  gamertag: string;
  bracket_seed: number | null;
  checked_in: boolean;
  eliminated: boolean;
  final_position: number | null;
  prize_won: number;
  paid_at: string;
  created_at: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_id: string;
  created_at: string;
}

export interface TournamentTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  player1_submitted: boolean;
  player2_submitted: boolean;
  winner_id: string | null;
  status: MatchStatus;
  decided_by: string;
  admin_note: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchMessage {
  id: string;
  match_id: string;
  user_id: string | null;
  message: string;
  is_system_message: boolean;
  attachments: string[];
  created_at: string;
}

export interface Dispute {
  id: string;
  match_id: string;
  filed_by: string;
  dispute_type: DisputeType;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  admin_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  tournament_id: string | null;
  match_id: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: PayoutStatus;
  stripe_transfer_id: string | null;
  admin_id: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface PlatformSettings {
  id: string;
  is_demo_mode: boolean;
  maintenance_balance: number;
  updated_at: string;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  feedback_text: string;
  rating: number;
  submitted_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  tournament_id: string | null;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
  }>;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  image_url: string | null;
  sender?: Profile;
  receiver?: Profile;
}


export const GAME_INFO: Record<GameType, { name: string; shortName: string; icon: string; banner: string; logo: string }> = {
  codm: {
    name: 'CODM',
    shortName: 'CODM',
    icon: 'https://i.pinimg.com/736x/3a/dd/18/3add18f29fa91cf8e3db7662e5af1e1a.jpg',
    banner: 'https://i.pinimg.com/736x/75/f1/58/75f158764ab1ed4a511437f04f610e52.jpg',
    logo: 'https://i.pinimg.com/736x/3a/dd/18/3add18f29fa91cf8e3db7662e5af1e1a.jpg'
  },
  fortnite: {
    name: 'Fortnite',
    shortName: 'Fortnite',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9e8510c3-351b-459e-ad57-5727287b2eba.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_787d5c50-b7e0-4e82-b74f-94cccf7eaa69.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9e8510c3-351b-459e-ad57-5727287b2eba.jpg'
  },
  fifa: {
    name: 'FIFA',
    shortName: 'FIFA',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_66a27ded-4dea-494e-8e9b-a3a144e332a2.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8f82acd7-52c9-4aa2-9f60-9c1f1aa416bc.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_66a27ded-4dea-494e-8e9b-a3a144e332a2.jpg'
  },
  warzone: {
    name: 'COD Warzone',
    shortName: 'COD Warzone',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6e1aa5c9-fef3-4e36-8ada-b16b97b9ff28.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8bfd9e45-cb7c-4d2e-8e30-db8028225514.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6e1aa5c9-fef3-4e36-8ada-b16b97b9ff28.jpg'
  },
  apex: {
    name: 'Apex Legends',
    shortName: 'Apex',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_79a4c765-cec1-4389-9dc2-7f02352b8476.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_17414ab3-243b-41bb-b8de-7f6e7dc9ce13.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_79a4c765-cec1-4389-9dc2-7f02352b8476.jpg'
  },
  valorant: {
    name: 'Valorant',
    shortName: 'Valorant',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4d3d0075-819e-48e4-86a1-7dc893eed1d9.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_ef9cc42f-d28e-4d33-89a7-dcc34ff7b4b6.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4d3d0075-819e-48e4-86a1-7dc893eed1d9.jpg'
  },
  injustice: {
    name: 'Injustice 2',
    shortName: 'Injustice',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fd50bdf8-1631-4115-84bb-831314f53b6a.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9c4d9a95-3c62-4f63-9789-cb67c6a5d9a2.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fd50bdf8-1631-4115-84bb-831314f53b6a.jpg'
  },
  mortal_kombat: {
    name: 'Mortal Kombat 11',
    shortName: 'MK11',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4c46ec37-0672-43cf-8fb3-39f35a601cd7.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d03f9e80-744f-464b-8f3c-3a5be5a36ce9.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4c46ec37-0672-43cf-8fb3-39f35a601cd7.jpg'
  },
  efootball: {
    name: 'eFootball',
    shortName: 'eFootball',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5bc0a4db-f003-4cb3-8849-8a6ff22f41ef.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8f82acd7-52c9-4aa2-9f60-9c1f1aa416bc.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5bc0a4db-f003-4cb3-8849-8a6ff22f41ef.jpg'
  },
  pubg_mobile: {
    name: 'PUBG Mobile',
    shortName: 'PUBGM',
    icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_906443de-043e-45bc-bd1a-50e46c2c4da2.jpg',
    banner: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8982654b-2303-4200-b240-4e91852a6a2c.jpg',
    logo: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_906443de-043e-45bc-bd1a-50e46c2c4da2.jpg'
  }
};

// Game modes configuration
export const GAME_MODES: Record<GameType, Array<{ value: GameMode; label: string; icon: string }>> = {
  codm: [
    { value: 'codm_1v1', label: '1v1', icon: '⚔️' },
    { value: 'codm_tdm', label: 'Team Deathmatch', icon: '💀' },
    { value: 'codm_2v2', label: '2v2', icon: '👥' },
    { value: 'codm_snd', label: 'Search & Destroy', icon: '💣' },
    { value: 'codm_br', label: 'Battle Royale', icon: '🎯' },
    { value: 'codm_domination', label: 'Domination', icon: '🏴' },
    { value: 'codm_hardpoint', label: 'Hardpoint', icon: '📍' },
    { value: 'codm_ffa', label: 'Free For All', icon: '🔥' }
  ],
  fortnite: [
    { value: 'fortnite_solo', label: 'Solo', icon: '🎮' },
    { value: 'fortnite_duo', label: 'Duo', icon: '👥' },
    { value: 'fortnite_squad', label: 'Squad', icon: '👨‍👩‍👦‍👦' },
    { value: 'fortnite_arena', label: 'Arena', icon: '🏆' },
    { value: 'fortnite_creative', label: 'Creative', icon: '🎨' }
  ],
  fifa: [
    { value: 'fifa_1v1', label: '1v1', icon: '⚽' },
    { value: 'fifa_2v2', label: '2v2', icon: '👥' },
    { value: 'fifa_pro_clubs', label: 'Pro Clubs', icon: '🏟️' },
    { value: 'fifa_ultimate_team', label: 'Ultimate Team', icon: '⭐' }
  ],
  warzone: [
    { value: 'warzone_solo', label: 'Solo', icon: '🎯' },
    { value: 'warzone_duo', label: 'Duo', icon: '👥' },
    { value: 'warzone_trio', label: 'Trio', icon: '👨‍👩‍👦' },
    { value: 'warzone_quad', label: 'Quad', icon: '👨‍👩‍👦‍👦' },
    { value: 'warzone_plunder', label: 'Plunder', icon: '💰' }
  ],
  apex: [
    { value: 'apex_solo', label: 'Solo', icon: '🎮' },
    { value: 'apex_duo', label: 'Duo', icon: '👥' },
    { value: 'apex_trio', label: 'Trio', icon: '👨‍👩‍👦' },
    { value: 'apex_arena', label: 'Arena', icon: '🏆' }
  ],
  valorant: [
    { value: 'valorant_5v5', label: '5v5 Competitive', icon: '⚔️' },
    { value: 'valorant_spike_rush', label: 'Spike Rush', icon: '⚡' },
    { value: 'valorant_deathmatch', label: 'Deathmatch', icon: '💀' },
    { value: 'valorant_escalation', label: 'Escalation', icon: '📈' }
  ],
  injustice: [
    { value: 'injustice_1v1', label: '1v1 Ranked', icon: '⚔️' },
    { value: 'injustice_king_of_the_hill', label: 'King of the Hill', icon: '👑' },
    { value: 'injustice_survivor', label: 'Survivor', icon: '🛡️' },
    { value: 'injustice_tournament', label: 'Tournament', icon: '🏆' }
  ],
  mortal_kombat: [
    { value: 'mortal_kombat_1v1', label: '1v1 Ranked', icon: '⚔️' },
    { value: 'mortal_kombat_king_of_the_hill', label: 'King of the Hill', icon: '👑' },
    { value: 'mortal_kombat_tower', label: 'Tower Challenge', icon: '🗼' },
    { value: 'mortal_kombat_tournament', label: 'Tournament', icon: '🏆' }
  ],
  efootball: [
    { value: 'efootball_1v1', label: '1v1', icon: '⚽' }
  ],
  pubg_mobile: [
    { value: 'pubg_mobile_solo', label: 'Solo', icon: '🎯' },
    { value: 'pubg_mobile_duo', label: 'Duo', icon: '👥' },
    { value: 'pubg_mobile_squad', label: 'Squad', icon: '👨‍👩‍👦‍👦' }
  ]
};

// Map game modes to team sizes
export const MODE_TEAM_SIZES: Record<GameMode, number> = {
  // CODM
  codm_1v1: 1,
  codm_tdm: 5,
  codm_2v2: 2,
  codm_snd: 5,
  codm_br: 4,
  codm_domination: 5,
  codm_hardpoint: 5,
  codm_ffa: 1,
  // Fortnite
  fortnite_solo: 1,
  fortnite_duo: 2,
  fortnite_squad: 4,
  fortnite_arena: 1,
  fortnite_creative: 1,
  // FIFA
  fifa_1v1: 1,
  fifa_2v2: 2,
  fifa_pro_clubs: 11,
  fifa_ultimate_team: 1,
  // Warzone
  warzone_solo: 1,
  warzone_duo: 2,
  warzone_trio: 3,
  warzone_quad: 4,
  warzone_plunder: 3,
  // Apex
  apex_solo: 1,
  apex_duo: 2,
  apex_trio: 3,
  apex_arena: 3,
  // Valorant
  valorant_5v5: 5,
  valorant_spike_rush: 5,
  valorant_deathmatch: 1,
  valorant_escalation: 5,
  // Injustice
  injustice_1v1: 1,
  injustice_king_of_the_hill: 1,
  injustice_survivor: 1,
  injustice_tournament: 1,
  // Mortal Kombat
  mortal_kombat_1v1: 1,
  mortal_kombat_king_of_the_hill: 1,
  mortal_kombat_tower: 1,
  mortal_kombat_tournament: 1,
  efootball_1v1: 1,
  pubg_mobile_solo: 1,
  pubg_mobile_duo: 2,
  pubg_mobile_squad: 4
};


export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: Profile;
}
