export const MAX_MOVES = 3;
export function simulate(route, guarded = false) {
  if (!Array.isArray(route) || route.length > MAX_MOVES) throw new Error('Use at most three moves.');
  let furthest = 0, remembered = 0, position = 0, lastRespawn = null, lost = 0;
  const steps = route.map(action => {
    if (Number.isInteger(action) && action >= 1 && action <= 4) {
      furthest = Math.max(furthest, action);
      remembered = guarded ? Math.max(remembered, action) : action;
      position = action;
    } else if (action === 'reset') {
      position = remembered;
      lastRespawn = position;
      lost = Math.max(lost, furthest - position);
    } else throw new Error('Unknown move.');
    return {action, furthest, remembered, position, lastRespawn, lost};
  });
  return {furthest, remembered, position, lastRespawn, lost, steps};
}
export const moveLabel = action => action === 'reset' ? 'Reset' : 'Touch ' + action;
