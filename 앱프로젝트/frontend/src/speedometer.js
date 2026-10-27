const EARTH_RADIUS_METERS = 6371000;
const STALE_AFTER_MS = 12000;

export function speedFromPosition(position, previous) {
  const direct = position.coords.speed;
  if (Number.isFinite(direct) && direct >= 0) {
    return { kmh: direct * 3.6, source: 'device' };
  }

  if (!previous) return null;
  const elapsed = position.timestamp - previous.timestamp;
  const accuracy = position.coords.accuracy;
  const previousAccuracy = previous.coords.accuracy;
  if (elapsed < 2000 || elapsed > 20000 ||
      !Number.isFinite(accuracy) || !Number.isFinite(previousAccuracy) ||
      accuracy > 35 || previousAccuracy > 35) return null;

  const radians = Math.PI / 180;
  const lat1 = previous.coords.latitude * radians;
  const lat2 = position.coords.latitude * radians;
  const dLat = lat2 - lat1;
  const dLon = (position.coords.longitude - previous.coords.longitude) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
  const noiseFloor = Math.max(8, (accuracy + previousAccuracy) / 2);
  return { kmh: distance <= noiseFloor ? 0 : distance / (elapsed / 1000) * 3.6, source: 'estimate' };
}

export function setupSpeedometer({ onNeedsAttention = () => {}, onSpeedChange = () => {} } = {}) {
  const meter = document.getElementById('speedometer');
  const value = document.getElementById('speed-value');
  const status = document.getElementById('speed-state');
  let watchId = null;
  let staleTimer = null;
  let previous = null;
  let lastFixAt = 0;
  let active = false;
  let simulated = false;
  const unavailable = !window.isSecureContext ? 'HTTPS 연결 필요' : !navigator.geolocation ? '위치 미지원' : null;

  function setStatus(message) {
    status.textContent = message;
    meter.dataset.state = simulated ? 'simulation' : active ? 'active' : 'off';
  }

  function stop(message = '일시 중지') {
    active = false;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    clearInterval(staleTimer);
    watchId = null;
    staleTimer = null;
    previous = null;
    lastFixAt = 0;
    value.textContent = '--';
    setStatus(unavailable ?? message);
    onSpeedChange(null);
  }

  function onPosition(position) {
    if (!active || simulated) return;
    lastFixAt = Date.now();
    const reading = speedFromPosition(position, previous);
    if (!previous || position.timestamp - previous.timestamp >= 2000) previous = position;
    if (!reading || !Number.isFinite(reading.kmh) || reading.kmh > 300) {
      value.textContent = '--';
      setStatus('속도 확인 중');
      onSpeedChange(null);
      return;
    }
    const displayedSpeed = Math.round(reading.kmh);
    value.textContent = String(displayedSpeed);
    setStatus(reading.source === 'estimate' ? '위치로 추정' : '측정 중');
    onSpeedChange(displayedSpeed);
  }

  function onError(error) {
    if (!active) return;
    if (error.code === 1) {
      stop('위치 권한 거부됨');
      onNeedsAttention();
      return;
    }
    value.textContent = '--';
    setStatus('GPS 신호 대기');
    onSpeedChange(null);
  }

  function start() {
    if (active || unavailable) return;
    active = true;
    lastFixAt = Date.now();
    setStatus('GPS 연결 중');
    try {
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      });
      staleTimer = setInterval(() => {
        if (Date.now() - lastFixAt > STALE_AFTER_MS) {
          value.textContent = '--';
          setStatus('GPS 신호 대기');
          onSpeedChange(null);
        }
      }, 1000);
    } catch {
      stop('속도 측정 시작 실패');
      onNeedsAttention();
    }
  }

  function setSimulatedSpeed(speed, message = '주행 시뮬레이션') {
    simulated = true;
    const displayedSpeed = Math.max(0, Math.round(speed));
    value.textContent = String(displayedSpeed);
    setStatus(message);
    onSpeedChange(displayedSpeed);
  }

  function clearSimulatedSpeed() {
    if (!simulated) return;
    simulated = false;
    value.textContent = '--';
    setStatus(active ? 'GPS 신호 대기' : unavailable ?? '시작 전');
    onSpeedChange(null);
  }

  setStatus(unavailable ?? '시작 전');

  return { start, stop, setSimulatedSpeed, clearSimulatedSpeed };
}
