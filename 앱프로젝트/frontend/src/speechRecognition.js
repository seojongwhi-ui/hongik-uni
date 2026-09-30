export function setupSpeechRecognition({ onUtterance, onStop, onNeedsAttention = () => {} }) {
  const pane = document.getElementById('passenger-pane');
  const status = document.getElementById('speech-state');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let desired = false;
  let restartTimer = null;
  const unavailable = !window.isSecureContext ? 'HTTPS 연결 필요' : !Recognition ? '음성 인식 미지원' : null;

  function setStatus(text) {
    status.textContent = text;
    pane.dataset.speech = desired ? 'active' : 'off';
  }

  function stop(message = '일시 중지') {
    desired = false;
    clearTimeout(restartTimer);
    const current = recognition;
    recognition = null;
    current?.abort();
    setStatus(unavailable ?? message);
    onStop();
  }

  function start() {
    if (desired || unavailable) return;
    desired = true;
    const current = new Recognition();
    recognition = current;
    current.lang = 'ko-KR';
    current.continuous = true;
    current.interimResults = false;
    current.maxAlternatives = 1;
    current.onstart = () => {
      if (recognition === current && desired) setStatus('듣는 중');
    };
    current.onresult = (event) => {
      if (recognition !== current || !desired) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0]?.transcript?.trim();
        if (transcript) onUtterance(transcript);
      }
    };
    current.onerror = (event) => {
      if (recognition !== current || !desired || event.error === 'no-speech') return;
      desired = false;
      recognition = null;
      clearTimeout(restartTimer);
      const messages = {
        'not-allowed': '마이크 권한 거부됨',
        'service-not-allowed': '음성 인식 권한 거부됨',
        'audio-capture': '마이크를 찾을 수 없음',
        network: '음성 인식 연결 실패',
        'language-not-supported': '한국어 음성 인식 미지원',
      };
      setStatus(messages[event.error] ?? '음성 인식 중단됨');
      onStop();
      onNeedsAttention();
    };
    current.onend = () => {
      if (recognition !== current || !desired) return;
      setStatus('다시 연결 중');
      restartTimer = setTimeout(() => {
        if (recognition !== current || !desired) return;
        try {
          current.start();
        } catch {
          stop('음성 재연결 필요');
          onNeedsAttention();
        }
      }, 400);
    };
    setStatus('연결 중');
    try {
      current.start();
    } catch {
      stop('음성 인식 시작 실패');
      onNeedsAttention();
    }
  }

  setStatus(unavailable ?? '시작 전');

  return { start, stop };
}
