const gazeSegments = [
  { target: 'road', duration: 7200 },
  { target: 'driver', duration: 1800 },
  { target: 'road', duration: 9100 },
  { target: 'driver', duration: 2200 },
  { target: 'road', duration: 6600 },
  { target: 'driver', duration: 1600 },
];

const gazeCycleDuration = gazeSegments.reduce((total, segment) => total + segment.duration, 0);
const blinkEvents = [3200, 7600, 10600, 10920, 17100, 21000, 24900, 28400];
const blinkCycleDuration = 32000;

export function gazeCueAt(elapsedMs) {
  const cycleTime = ((elapsedMs % gazeCycleDuration) + gazeCycleDuration) % gazeCycleDuration;
  let cursor = 0;
  for (let index = 0; index < gazeSegments.length; index++) {
    const segment = gazeSegments[index];
    if (cycleTime < cursor + segment.duration) {
      const age = cycleTime - cursor;
      const lookingAtDriver = segment.target === 'driver';
      const previousWasDriver = index > 0 && gazeSegments[index - 1].target === 'driver';
      return {
        target: segment.target,
        eyeAttention: lookingAtDriver ? 1 : 0,
        headAttention: lookingAtDriver ? (age >= 180 ? 1 : 0)
          : previousWasDriver && age < 150 ? 1 : 0,
      };
    }
    cursor += segment.duration;
  }
  return { target: 'road', eyeAttention: 0, headAttention: 0 };
}

export function blinkScaleAt(elapsedMs, reducedMotion = false) {
  if (reducedMotion) return 1;
  const cycleTime = ((elapsedMs % blinkCycleDuration) + blinkCycleDuration) % blinkCycleDuration;
  for (const eventTime of blinkEvents) {
    const age = cycleTime - eventTime;
    if (age < 0 || age > 185) continue;
    if (age <= 75) return 1 - 0.88 * age / 75;
    return 0.12 + 0.88 * (age - 75) / 110;
  }
  return 1;
}

export const presenceMotionTiming = {
  gazeCycleDuration,
  blinkCycleDuration,
};
