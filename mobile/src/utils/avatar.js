const avatarColors = [
  '#7c3aed',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#e879f9',
];

export const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const getInitials = (name = '') => {
  if (!name) return '??';
  return name.slice(0, 2).toUpperCase();
};
