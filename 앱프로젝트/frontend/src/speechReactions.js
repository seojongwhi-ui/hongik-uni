const concernCues = ['짜증', '화나', '열받', '답답', '위험', '무섭', '불안', '미치겠'];
const surpriseCues = ['깜짝', '놀랐', '놀라', '헉', '어머'];
const warmCues = ['고마워', '괜찮', '좋아', '다행', '잘했어'];

export function reactionForUtterance(transcript) {
  const compact = transcript.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (!compact) return 'neutral';
  if (concernCues.some((cue) => compact.includes(cue))) return 'concerned';
  if (surpriseCues.some((cue) => compact.includes(cue))) return 'surprised';
  if (warmCues.some((cue) => compact.includes(cue))) return 'warm';
  return 'attentive';
}
