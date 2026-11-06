export const getRankScore = (profile: { wins?: number; tournaments_won?: number }) => {
  return (profile?.wins || 0) + (profile?.tournaments_won || 0);
};

export const getRankColor = (score: number) => {
  if (score >= 15) return 'text-gold';
  if (score >= 8) return 'text-foreground';
  if (score >= 3) return 'text-primary-soft';
  return 'text-success';
};

export const getRankTitle = (score: number) => {
  if (score >= 15) return 'Legend';
  if (score >= 8) return 'Elite';
  if (score >= 3) return 'Pro';
  return 'Rookie';
};

export const getRankBadgeColor = (score: number) => {
  if (score >= 15) return 'bg-gold/15 text-gold border-transparent';
  if (score >= 8) return 'bg-white/10 text-foreground border-transparent';
  if (score >= 3) return 'bg-primary/15 text-primary-soft border-transparent';
  return 'bg-success/15 text-success border-transparent';
};
