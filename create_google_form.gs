function myFunction() {
  createDrivingEmotionBehaviorSurvey();
}

function createDrivingEmotionBehaviorSurvey() {
  const title = '운전 상황에서의 감정 및 행동 변화 조사';
  const notice = [
    '【 연구 참여 안내 】',
    '',
    '안녕하세요.',
    '본 설문은 홍익대학교 일반대학원 산업디자인과 석사학위 졸업논문 연구를 위한 설문조사입니다.',
    '',
    '본 연구는 운전 상황에서 운전자가 경험하는 감정 변화(분노·짜증 등)와 행동 특성을 파악하고, 동승자의 유무 및 유형에 따른 영향을 분석하여 차량 환경에서 운전자의 경험을 효과적으로 지원할 수 있는 UX/HMI 방안을 탐색하는 데 목적이 있습니다.',
    '',
    '--------------------------------------------------',
    '📌 [응답 시 유의사항]',
    '• 응답 대상: 최근 6개월 이내 직접 운전한 경험이 있는 분',
    '• 정답이 없는 설문이므로, 평소 본인의 실제 운전 경험을 기준으로 솔직하게 응답해 주세요.',
    '• ⏱️ 예상 소요 시간: 약 7 ~ 10분',
    '',
    '--------------------------------------------------',
    '🎁 [참여 혜택 (커피 쿠폰 추첨)]',
    '• 설문을 완료해 주신 분들 중 추첨을 통해 모바일 커피 쿠폰을 선물로 보내드립니다.',
    '• 추첨 참여를 원하시는 경우 설문 마지막에 전화번호를 입력해 주세요.',
    '',
    '--------------------------------------------------',
    '🔒 [비밀 보장 및 데이터 보호]',
    '• 모든 응답은 통계법 제33조에 따라 순수 학술 연구 목적으로만 활용되며 익명성이 철저히 보장됩니다.',
    '• 전화번호는 쿠폰 발송 후 즉시 파기되며, 설문 분석 데이터와 완벽히 분리되어 안전하게 관리됩니다.',
    '',
    '연구 담당자: 홍익대학교 일반대학원 산업디자인과 서종휘'
  ].join('\n');

  const angerScale = [
    '전혀 느끼지 않는다',
    '약하게 느낀다',
    '보통 정도로 느낀다',
    '강하게 느낀다',
    '매우 강하게 느낀다'
  ];
  const frequencyScale = [
    '전혀 하지 않는다',
    '거의 하지 않는다',
    '가끔 한다',
    '자주 한다',
    '매우 자주 한다'
  ];
  const experienceScale = [
    '전혀 없다',
    '거의 없다',
    '가끔 있다',
    '자주 있다',
    '매우 자주 있다'
  ];
  const agreementScale = [
    '전혀 그렇지 않다',
    '그렇지 않다',
    '어느 쪽도 아니다',
    '그렇다',
    '매우 그렇다'
  ];

  const form = FormApp.create(title);
  const spreadsheet = SpreadsheetApp.create(title + ' 응답');

  form.setDescription(notice);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('설문에 참여해 주셔서 감사합니다.');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  addQuestionSheet_(spreadsheet);

  addPage_(form, '1. 운전 경험 및 기본 정보', '예상 시간: 2분');
  addMultipleChoice_(form, '1-1. 귀하의 성별은 무엇입니까?', ['남성', '여성'], true);
  addMultipleChoice_(form, '1-2. 귀하의 연령대는 어떻게 되십니까?', ['20대 이하', '30대', '40대', '50대', '60대 이상'], true);
  addMultipleChoice_(form, '1-3. 운전 경력은 얼마나 되십니까?', ['1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'], true);
  addMultipleChoice_(form, '1-4. 평소 운전 빈도는 어느 정도입니까?', ['월 1회 미만', '월 1~3회', '주 1~2회', '주 3~5회', '거의 매일'], true);
  addMultipleChoice_(form, '1-5. 평소 운전하는 주요 목적은 무엇입니까?', ['출퇴근', '학교/학업', '여가 및 여행', '가족 및 지인 이동'], true, true);
  addMultipleChoice_(form, '1-6. 평소 운전할 때 동승자가 함께 있는 경우가 얼마나 자주 있습니까?', ['거의 없다', '가끔 있다', '절반 정도이다', '자주 있다', '거의 항상 있다'], true);

  addPage_(form, '2. 운전 상황에서 발생하는 감정 반응', '예상 시간: 5분\n\n다음 상황에서 본인이 느끼는 화, 짜증 또는 불쾌감의 정도를 선택해주세요.');
  addMultipleChoice_(form, '2-1. 다른 차량이 갑자기 앞으로 끼어들 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);
  addMultipleChoice_(form, '2-2. 앞 차량이 지나치게 느리게 운전할 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);
  addMultipleChoice_(form, '2-3. 뒤 차량이 너무 가까이 따라올 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);
  addMultipleChoice_(form, '2-4. 다른 운전자가 교통 규칙을 지키지 않을 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);
  addMultipleChoice_(form, '2-5. 다른 운전자가 나를 향해 경적, 상향등, 손짓 등으로 불만을 표현할 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);
  addMultipleChoice_(form, '2-6. 교통 체증으로 이동 시간이 길어질 때 화, 짜증 또는 불쾌감을 느낀다.', angerScale, true);

  addPage_(form, '3. 운전 중 감정 표현 및 행동 특성', '예상 시간: 5분');
  addMultipleChoice_(form, '3-1. 운전 중 불쾌한 상황에서 혼잣말을 하는 빈도', frequencyScale, true);
  addMultipleChoice_(form, '3-2. 운전 중 욕설을 하는 빈도', frequencyScale, true);
  addMultipleChoice_(form, '3-3. 화가 나는 상황에서 경적을 사용하는 빈도', frequencyScale, true);
  addMultipleChoice_(form, '3-4. 다른 운전자에게 불만을 표현하는 행동을 하는 빈도', frequencyScale, true, false, '손짓, 상향등, 추월 등');
  addMultipleChoice_(form, '3-5. 운전 중 감정적으로 인해 평소보다 공격적으로 운전한 적이 있다.', experienceScale, true);

  addPage_(form, '4. 동승자 존재에 따른 변화', '예상 시간: 5분');
  addMultipleChoice_(form, '4-1. 다른 사람이 함께 탑승하면 운전 행동이 달라진다고 느낀다.', agreementScale, true);
  addMultipleChoice_(form, '4-2. 동승자가 있을 때 감정 표현을 조절하게 된다.', agreementScale, true);
  addMultipleChoice_(form, '4-3. 동승자가 있을 때 화가 나는 상황에서 행동을 참게 된다.', agreementScale, true);
  addMultipleChoice_(form, '4-4. 동승자가 있을 때 오히려 감정 표현이 커지는 경우가 있다.', agreementScale, true);
  addMultipleChoice_(form, '4-5. 동승자의 반응에 따라 나의 운전 행동이 달라진다.', agreementScale, true);

  addPage_(form, '5. 동승자 유형별 영향', '예상 시간: 3분');
  addMultipleChoice_(form, '5-1. 누구와 함께 탑승했을 때 운전 행동이 가장 달라집니까?', ['가족', '연인', '친구', '직장 동료', '낯선 사람', '동승자 유형에 따른 차이를 느끼지 않는다'], true);
  addMultipleChoice_(form, '5-2. 동승자가 있을 때 영향을 받는 가장 큰 이유는 무엇이라고 생각합니까?', ['다른 사람이 나를 보고 있다는 의식', '좋은 모습을 보여주고 싶은 마음', '동승자의 안전에 대한 책임감', '동승자의 반응이나 말', '함께 감정을 공유하기 때문', '동승자의 영향을 거의 받지 않음'], true, true);
  addParagraph_(form, '5-3. 동승자가 있을 때 감정이나 행동이 변화했던 경험을 작성해주세요.', true, '경험이 없다면 "없음"이라고 작성해주세요.');

  addPage_(form, '6. 커피쿠폰 추첨 참여', '전화번호는 커피쿠폰 랜덤 추첨 및 발송 목적으로만 수집되며, 연구 분석 시 설문 응답과 분리하여 사용합니다. 추첨 참여를 원하지 않으면 전화번호를 입력하지 않아도 됩니다.');
  addMultipleChoice_(form, '6-1. 커피쿠폰 랜덤 추첨 참여를 위해 전화번호 제공에 동의하십니까?', ['동의하고 전화번호를 입력한다', '동의하지 않는다'], true);
  addShortText_(form, '6-2. 커피쿠폰 발송을 위한 전화번호를 입력해주세요.', false, '추첨 참여자만 입력해주세요. 예: 010-1234-5678');

  Logger.log('응답자용 설문 링크: ' + form.getPublishedUrl());
  Logger.log('편집용 설문 링크: ' + form.getEditUrl());
  Logger.log('응답 구글시트 링크: ' + spreadsheet.getUrl());
}

function addPage_(form, title, helpText) {
  const item = form.addPageBreakItem().setTitle(title);
  if (helpText) {
    item.setHelpText(helpText);
  }
}

function addMultipleChoice_(form, title, choices, required, hasOther, helpText) {
  const item = form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(choices)
    .setRequired(required);

  if (helpText) {
    item.setHelpText(helpText);
  }

  if (hasOther) {
    item.showOtherOption(true);
  }
}

function addCheckbox_(form, title, choices, required, hasOther, helpText) {
  const item = form.addCheckboxItem()
    .setTitle(title)
    .setChoiceValues(choices)
    .setRequired(required);

  if (helpText) {
    item.setHelpText(helpText);
  }

  if (hasOther) {
    item.showOtherOption(true);
  }
}

function addParagraph_(form, title, required, helpText) {
  const item = form.addParagraphTextItem()
    .setTitle(title)
    .setRequired(required);

  if (helpText) {
    item.setHelpText(helpText);
  }
}

function addShortText_(form, title, required, helpText) {
  const item = form.addTextItem()
    .setTitle(title)
    .setRequired(required);

  if (helpText) {
    item.setHelpText(helpText);
  }
}

function addQuestionSheet_(spreadsheet) {
  const rows = [
    ['섹션', '문항번호', '문항', '응답유형', '필수여부', '선택지', '비고'],
    ['연구 참여 안내', '', '운전 상황에서의 감정 및 행동 변화 조사 연구 참여 안내', '안내문', '해당 없음', '', '최근 6개월 운전 경험 기준, 예상 소요 시간: 약 7~10분, 커피쿠폰 추첨 제공'],
    ['1. 운전 경험 및 기본 정보', '1-1', '귀하의 성별은 무엇입니까?', '객관식', '필수', '남성 | 여성', '예상 시간: 2분'],
    ['1. 운전 경험 및 기본 정보', '1-2', '귀하의 연령대는 어떻게 되십니까?', '객관식', '필수', '20대 이하 | 30대 | 40대 | 50대 | 60대 이상', ''],
    ['1. 운전 경험 및 기본 정보', '1-3', '운전 경력은 얼마나 되십니까?', '객관식', '필수', '1년 미만 | 1~3년 | 3~5년 | 5~10년 | 10년 이상', ''],
    ['1. 운전 경험 및 기본 정보', '1-4', '평소 운전 빈도는 어느 정도입니까?', '객관식', '필수', '월 1회 미만 | 월 1~3회 | 주 1~2회 | 주 3~5회 | 거의 매일', ''],
    ['1. 운전 경험 및 기본 정보', '1-5', '평소 운전하는 주요 목적은 무엇입니까?', '객관식', '필수', '출퇴근 | 학교/학업 | 여가 및 여행 | 가족 및 지인 이동 | 기타', '기타 직접 입력'],
    ['1. 운전 경험 및 기본 정보', '1-6', '평소 운전할 때 동승자가 함께 있는 경우가 얼마나 자주 있습니까?', '객관식', '필수', '거의 없다 | 가끔 있다 | 절반 정도이다 | 자주 있다 | 거의 항상 있다', ''],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-1', '다른 차량이 갑자기 앞으로 끼어들 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', '예상 시간: 5분'],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-2', '앞 차량이 지나치게 느리게 운전할 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', ''],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-3', '뒤 차량이 너무 가까이 따라올 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', ''],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-4', '다른 운전자가 교통 규칙을 지키지 않을 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', ''],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-5', '다른 운전자가 나를 향해 경적, 상향등, 손짓 등으로 불만을 표현할 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', ''],
    ['2. 운전 상황에서 발생하는 감정 반응', '2-6', '교통 체증으로 이동 시간이 길어질 때 화, 짜증 또는 불쾌감을 느낀다.', '5점 객관식', '필수', '전혀 느끼지 않는다 | 약하게 느낀다 | 보통 정도로 느낀다 | 강하게 느낀다 | 매우 강하게 느낀다', ''],
    ['3. 운전 중 감정 표현 및 행동 특성', '3-1', '운전 중 불쾌한 상황에서 혼잣말을 하는 빈도', '5점 객관식', '필수', '전혀 하지 않는다 | 거의 하지 않는다 | 가끔 한다 | 자주 한다 | 매우 자주 한다', '예상 시간: 5분'],
    ['3. 운전 중 감정 표현 및 행동 특성', '3-2', '운전 중 욕설을 하는 빈도', '5점 객관식', '필수', '전혀 하지 않는다 | 거의 하지 않는다 | 가끔 한다 | 자주 한다 | 매우 자주 한다', ''],
    ['3. 운전 중 감정 표현 및 행동 특성', '3-3', '화가 나는 상황에서 경적을 사용하는 빈도', '5점 객관식', '필수', '전혀 하지 않는다 | 거의 하지 않는다 | 가끔 한다 | 자주 한다 | 매우 자주 한다', ''],
    ['3. 운전 중 감정 표현 및 행동 특성', '3-4', '다른 운전자에게 불만을 표현하는 행동을 하는 빈도', '5점 객관식', '필수', '전혀 하지 않는다 | 거의 하지 않는다 | 가끔 한다 | 자주 한다 | 매우 자주 한다', '손짓, 상향등, 추월 등'],
    ['3. 운전 중 감정 표현 및 행동 특성', '3-5', '운전 중 감정적으로 인해 평소보다 공격적으로 운전한 적이 있다.', '5점 객관식', '필수', '전혀 없다 | 거의 없다 | 가끔 있다 | 자주 있다 | 매우 자주 있다', ''],
    ['4. 동승자 존재에 따른 변화', '4-1', '다른 사람이 함께 탑승하면 운전 행동이 달라진다고 느낀다.', '5점 객관식', '필수', '전혀 그렇지 않다 | 그렇지 않다 | 어느 쪽도 아니다 | 그렇다 | 매우 그렇다', '예상 시간: 5분'],
    ['4. 동승자 존재에 따른 변화', '4-2', '동승자가 있을 때 감정 표현을 조절하게 된다.', '5점 객관식', '필수', '전혀 그렇지 않다 | 그렇지 않다 | 어느 쪽도 아니다 | 그렇다 | 매우 그렇다', ''],
    ['4. 동승자 존재에 따른 변화', '4-3', '동승자가 있을 때 화가 나는 상황에서 행동을 참게 된다.', '5점 객관식', '필수', '전혀 그렇지 않다 | 그렇지 않다 | 어느 쪽도 아니다 | 그렇다 | 매우 그렇다', ''],
    ['4. 동승자 존재에 따른 변화', '4-4', '동승자가 있을 때 오히려 감정 표현이 커지는 경우가 있다.', '5점 객관식', '필수', '전혀 그렇지 않다 | 그렇지 않다 | 어느 쪽도 아니다 | 그렇다 | 매우 그렇다', ''],
    ['4. 동승자 존재에 따른 변화', '4-5', '동승자의 반응에 따라 나의 운전 행동이 달라진다.', '5점 객관식', '필수', '전혀 그렇지 않다 | 그렇지 않다 | 어느 쪽도 아니다 | 그렇다 | 매우 그렇다', ''],
    ['5. 동승자 유형별 영향', '5-1', '누구와 함께 탑승했을 때 운전 행동이 가장 달라집니까?', '객관식', '필수', '가족 | 연인 | 친구 | 직장 동료 | 낯선 사람 | 동승자 유형에 따른 차이를 느끼지 않는다', '예상 시간: 3분'],
    ['5. 동승자 유형별 영향', '5-2', '동승자가 있을 때 영향을 받는 가장 큰 이유는 무엇이라고 생각합니까?', '객관식', '필수', '다른 사람이 나를 보고 있다는 의식 | 좋은 모습을 보여주고 싶은 마음 | 동승자의 안전에 대한 책임감 | 동승자의 반응이나 말 | 함께 감정을 공유하기 때문 | 동승자의 영향을 거의 받지 않음 | 기타', '단일 선택, 기타 직접 입력'],
    ['5. 동승자 유형별 영향', '5-3', '동승자가 있을 때 감정이나 행동이 변화했던 경험을 작성해주세요.', '장문형', '필수', '', '경험이 없다면 "없음"이라고 작성'],
    ['6. 커피쿠폰 추첨 참여', '6-1', '커피쿠폰 랜덤 추첨 참여를 위해 전화번호 제공에 동의하십니까?', '객관식', '필수', '동의하고 전화번호를 입력한다 | 동의하지 않는다', '전화번호는 추첨 및 발송 목적으로만 수집, 연구 분석 시 설문 응답과 분리'],
    ['6. 커피쿠폰 추첨 참여', '6-2', '커피쿠폰 발송을 위한 전화번호를 입력해주세요.', '단답형', '선택', '', '예: 010-1234-5678']
  ];

  const sheet = spreadsheet.insertSheet('설문 문항표');
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, rows[0].length);
}
