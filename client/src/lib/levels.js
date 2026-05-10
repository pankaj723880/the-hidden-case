export const XP_ACTIONS = {
  post_published: 100,
  post_approved: 50,
  comment_received: 5,
  like_received: 2,
  follower_gained: 10,
  challenge_entered: 30,
  challenge_won: 500,
  coauthor_accepted: 80,
};

export const LEVELS = [
  { name: "Apprentice", minXP: 0, icon: "✒️" },
  { name: "Scribe", minXP: 200, icon: "📜" },
  { name: "Storyteller", minXP: 600, icon: "📖" },
  { name: "Chronicler", minXP: 1500, icon: "🗝️" },
  { name: "Wordsmith", minXP: 3000, icon: "⚡" },
  { name: "Master", minXP: 6000, icon: "🔮" },
  { name: "Legendary", minXP: 12000, icon: "👑" },
];
