import { AMMUNITION } from "../data/ammunition.js";
export function boxRounds(type, item) {
  const a = AMMUNITION[type];
  if (!a) return 0;
  const rounds = item?.rounds ?? a.rounds;
  return Number.isInteger(rounds) && rounds > 0 && rounds <= a.rounds
    ? rounds
    : 0;
}
export function storeItem(game, item) {
  const type = typeof item === "string" ? item : item.type;
  if (item?.rounds !== undefined && AMMUNITION[type]) {
    const total = (game.ammoRemainders[type] || 0) + boxRounds(type, item);
    game.stock[type] += Math.floor(total / AMMUNITION[type].rounds);
    game.ammoRemainders[type] = total % AMMUNITION[type].rounds;
  } else game.stock[type]++;
}
