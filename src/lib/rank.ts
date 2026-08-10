export const getRankScore = (profile: { wins?: number; tournaments_won?: number }) => {
  return (profile?.wins || 0) + (profile?.tournaments_won || 0);
};

export const getRankColor = (score: number) => {
  if (score >= 15) return 'text-amber-400';
  if (score >= 8) return 'text-purple-400';
  if (score >= 3) return 'text-blue-400';
  return 'text-green-400';
};

export const getRankTitle = (score: number) => {
  if (score >= 15) return 'Legend';
  if (score >= 8) return 'Elite';
  if (score >= 3) return 'Pro';
  return 'Rookie';
};

export const getRankBadgeColor = (score: number) => {
  if (score >= 15) return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
  if (score >= 8) return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
  if (score >= 3) return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
  return 'bg-green-500/15 text-green-400 border-green-500/25';
};
