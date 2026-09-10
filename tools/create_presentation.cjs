const fs = require('fs');
const path = require('path');
const deps = process.env.PRESENTATION_NODE_MODULES || path.join(process.env.TEMP, 'auto-paper-ppt', 'node_modules');
const PptxGenJS = require(path.join(deps, 'pptxgenjs'));
const { createCanvas, GlobalFonts } = require(path.join(deps, '@napi-rs/canvas'));
const root = path.resolve(__dirname, '..');
const VERSION = 'v10';
const out = path.join(root, `presentation_${VERSION}`);
fs.mkdirSync(out, { recursive: true });
GlobalFonts.registerFromPath('C:/Windows/Fonts/NotoSansKR-VF.ttf', 'Noto Sans KR');
const ctx = createCanvas(1600, 900).getContext('2d');
const FONT = 'Noto Sans KR';
const FS = { main: 60, emphasis: 40, body: 14 / 0.6, foot: 18, footLarge: 20 };
const C = { white: 'FFFFFF', ink: '202628', sub: '626D70', accent: '087E83', soft: 'EAF5F4', rule: 'DAE1E2', muted: 'A8B7B9', track: 'EDF1F2' };
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'RESEARCH', width: 13.333333, height: 7.5 });
pptx.layout = 'RESEARCH';
pptx.author = '서종휘';
pptx.title = '동승자 존재와 운전자 분노 조절 | 연구계획';
pptx.subject = '교수님 피드백용 연구계획';
pptx.lang = 'ko-KR';
pptx.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: 'ko-KR' };
const pages = [];
const checks = [];
const esc = t => String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function rect(p, x, y, w, h, fill) {
  p.slide.addShape(pptx.ShapeType.rect, { x:x/120, y:y/120, w:w/120, h:h/120, line:{color:fill, transparency:100}, fill:{color:fill} });
  p.svg.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#${fill}"/>`);
}
function line(p, x, y, w, color=C.rule) { rect(p,x,y,w,1.5,color); }
function wrap(text,w,size,bold) {
  ctx.font = `${bold ? 700 : 400} ${size}px "${FONT}"`;
  const result=[];
  for(const para of text.split('\n')) {
    let current='';
    for(const token of para.match(/\S+\s*|\s+/gu) || ['']) {
      if(ctx.measureText(current+token.trimEnd()).width <= w-8) { current+=token; continue; }
      if(current.trim()) { result.push(current.trimEnd()); current=''; }
      for(const ch of token) {
        if(ctx.measureText(current+ch).width > w-8 && current) { result.push(current.trimEnd()); current=''; }
        current+=ch;
      }
    }
    result.push(current.trimEnd());
  }
  return result;
}
// Measure the installed Korean font and share explicit line breaks between PPT and SVG.
function tx(p,text,x,y,w,h,size=30,bold=false,color=C.ink,align='left') {
  const rows=wrap(text,w,size,bold), lh=size*1.48;
  const actual=rows.length*lh;
  if(actual>h+0.1) throw new Error(`Slide ${p.number}: text height ${actual}>${h}: ${text}`);
  if(x<0 || y<0 || x+w>1600.1 || y+h>900.1) throw new Error(`Outside slide: ${text}`);
  rows.forEach((row,i)=> {
    if(!row) return;
    const yy=y+i*lh;
    p.slide.addText(row,{ x:x/120,y:yy/120,w:w/120,h:lh/120,fontFace:FONT,fontSize:size*0.6,bold,color,
      margin:0,breakLine:false,paraSpaceAfterPt:0,valign:'mid',align,lang:'ko-KR',charSpacing:0,
      lineSpacingMultiple:1.0,isTextBox:true });
    const anchor=align==='right'?'end':align==='center'?'middle':'start';
    const xx=align==='right'?x+w:align==='center'?x+w/2:x;
    p.svg.push(`<text x="${xx}" y="${yy+size*1.09}" font-family="Noto Sans KR" font-size="${size}" font-weight="${bold?700:400}" fill="#${color}" text-anchor="${anchor}" letter-spacing="0">${esc(row)}</text>`);
    checks.push({slide:p.number,text:row,x,y:yy,w,h:lh,size,width:ctx.measureText(row).width});
  });
  return actual;
}
function page(section,title,subtitle,source='연구계획서 초안 · 교수님 피드백용') {
  const slide=pptx.addSlide(); slide.background={color:C.white};
  const p={slide,svg:[],number:pages.length+1}; pages.push(p);
  rect(p,0,0,1600,900,C.white);
  tx(p,section,88,38,1350,36,FS.footLarge,true,C.accent);
  tx(p,title,88,91,1424,90,FS.main,true);
  if(subtitle) tx(p,subtitle,88,193,1424,48,FS.body,false,C.sub);
  line(p,88,253,1424);
  line(p,88,826,1424);
  tx(p,source,88,843,1320,35,FS.foot,false,C.sub);
  tx(p,String(p.number).padStart(2,'0'),1440,840,72,40,FS.footLarge,true,C.sub,'right');
  return p;
}
function takeaway(p,label,text) {
  rect(p,88,704,1424,94,C.soft);
  tx(p,label,112,721,214,64,FS.emphasis,true,C.accent);
  tx(p,text,356,729,1120,45,FS.body,true);
}
function columns(p,items,top=303) {
  const gap=56,w=(1424-gap*(items.length-1))/items.length;
  items.forEach(([title,body],i)=> {
    const x=88+i*(w+gap);
    tx(p,String(i+1).padStart(2,'0'),x,top,w,38,FS.footLarge,true,C.accent);
    tx(p,title,x,top+62,w,96,FS.emphasis,true);
    line(p,x,top+178,w);
    tx(p,body,x,top+204,w,185,FS.body,false);
  });
}
function rows(p,items,top=290,rowH=91) {
  items.forEach(([title,body],i)=>{
    const y=top+i*rowH;
    tx(p,title,88,y,302,rowH-15,FS.body,true,C.accent);
    tx(p,body,422,y,1090,rowH-15,FS.body);
    if(i<items.length-1) line(p,88,y+rowH-13,1424);
  });
}
function bars(p,data,{max=5,percent=false,top=300,step=61}={}) {
  const x=698,w=646;
  [0,max/2,max].forEach(v=>tx(p,String(v),x+w*v/max-20,top-47,50,34,FS.foot,false,C.sub,'center'));
  data.forEach(([label,v],i)=> {
    const y=top+i*step;
    tx(p,label,88,y-7,578,48,FS.body,i===0);
    rect(p,x,y+3,w,23,C.track);
    rect(p,x,y+3,w*v/max,23,i===0?C.accent:C.muted);
    tx(p,percent?`${v.toFixed(1)}%`:v.toFixed(2),1370,y-8,142,48,FS.body,true,i===0?C.accent:C.ink,'right');
  });
}
let p;
p=page('RESEARCH PROPOSAL · 2026.09','동승자 존재와 운전자 분노 조절',null,'홍익대학교 일반대학원 산업디자인과 · 서종휘 · 교수님 피드백용');
tx(p,'차량 내 AI 인터페이스 설계 연구',88,312,1424,72,FS.emphasis,true);
tx(p,'동승자에 따른 감정 표현 변화와 AI 활용 가능성 탐색',92,461,1360,50,FS.body,false,C.sub);
rect(p,88,577,80,5,C.accent);
tx(p,'혼자 운전할 때도 AI의 도움으로\n스스로 감정과 행동을 조절할 수 있는가?',88,620,1330,128,FS.emphasis,true,C.accent);
p.slide.addNotes('원제: 동승자 존재가 운전자 분노 조절에 미치는 영향과 차량 내 AI 인터페이스 설계 연구. 홍익대학교 일반대학원 산업디자인과 서종휘.');

p=page('01 · 발표 구성','연구의 전개 순서','연구 배경, 예비조사 결과, 선행연구를 통한 해석, 향후 연구계획 순으로 설명한다.');
rows(p,[['1. 연구 배경','동승자가 있을 때 운전자의 감정 표현과 행동이 달라지는 현상'],['2. 조사 목적','해당 현상이 다른 운전자에게도 나타나는지 예비조사로 확인'],['3. 설문 개요','응답자 특성, 문항 구성, 분석 범위 정리'],['4. 설문 결과','분노 유발 상황, 반응 방식, 동승자 영향과 변화 이유 제시'],['5. 선행연구와 해석','타인과의 관계, 타인의 평가, 개인의 감정 표현 성향으로 결과 해석'],['6. 향후 연구계획','본조사, 이론 보완, AI 인터페이스 설계와 평가 방향 정리']],282,84);

p=page('01 · 연구 배경','관찰된 현상에서 출발한 문제의식','혼자 운전할 때와 누군가 함께 탈 때의 감정 표현 차이에 주목했다.');
tx(p,'운전 중 분노가 발생하는 상황에서도\n동승자가 있을 때는 감정 표현과 행동이\n상대적으로 조절되는 경험이 관찰되었다.',88,286,1424,210,FS.emphasis,true);
tx(p,'이 변화에는 타인의 시선을 의식하는 마음과\n함께 탄 사람의 안전을 지켜야 한다는 책임감이 관련될 수 있다.',88,552,1424,96,FS.body,false,C.sub);
takeaway(p,'문제의식','이러한 변화가 다른 운전자에게도 나타나는지 예비조사를 통해 확인하고자 했다.');

p=page('01 · 연구 목적','혼자 운전할 때의 감정 조절을 어떻게 도울 수 있을까','동승자가 있을 때 나타나는 감정·행동 조절을 AI로 도울 수 있는지 탐색한다.');
rows(p,[['관찰 현상','동승자가 있을 때 운전자가 감정 표현과 행동을 조절하는 현상에 주목한다.'],['연구 질문','혼자 운전할 때도 AI의 도움으로 자신의 감정과 행동을 조절할 수 있을까?'],['설계 가능성','AI의 말이나 반응이 주변 사람의 안전을 생각하는 데 도움이 될 수 있을까?'],['장기 목표','감정 조절과 위험 행동 감소를 검증하고, 이후 사고 예방 가능성을 살펴본다.']],300,96);
takeaway(p,'설계 방향','운전자가 주변 사람의 안전을 떠올리고 자신의 반응을 조절하도록 돕는 AI를 탐색한다.');

p=page('01 · 조사 이유','동승자에 따른 변화를 설문으로 확인했다','설문은 운전자의 경험을 파악하고 후속 연구 질문을 정하기 위한 예비조사로 진행했다.');
rows(p,[['확인 1','운전자들은 운전 중 분노를 경험하는가?'],['확인 2','분노는 어떤 상황에서 특히 강하게 나타나는가?'],['확인 3','분노가 발생했을 때 어떤 방식으로 반응하는가?'],['확인 4','동승자가 있으면 감정 표현을 줄이는가, 오히려 더 강하게 표현하는가?'],['확인 5','동승자의 영향을 받는 이유로 시선 의식과 안전 책임감 중 무엇을 선택하는가?']],282,99);

p=page('02 · 예비조사','설문조사 개요','운전 상황에서의 감정 및 행동 변화 조사 · 유효 응답 33명','출처: 설문결과_통계분석보고서 · N=33');
[['33명','유효 응답'],['69.7%','20대 비중'],['90.9%','동승 빈도: 가끔~항상'],['42.4%','주요 목적: 출퇴근']].forEach(([value,label],i)=>{
  const x=88+i*366; tx(p,value,x,312,326,90,FS.main,true,C.accent);tx(p,label,x,423,330,85,FS.body,false,C.sub);
});
line(p,88,530,1424);
tx(p,'여성 18명 · 남성 15명  |  최근 6개월 이내 운전 경험이 있는 성인',88,552,1424,60,FS.body);
tx(p,'DAS·K-DAS 참고 재구성 문항 / 5점 척도 / 유형·이유 선택 / 정성 경험',88,632,1424,62,FS.body);
tx(p,'원척도 전체를 그대로 적용한 검사가 아니며, 리워드용 개인정보는 분석과 분리한다.',88,739,1424,50,FS.body,false,C.sub);

p=page('02 · 결과 1','운전자는 어떤 상황에서 분노를 경험하는가','상황별 평균 · 5점 척도','출처: 설문결과_통계분석보고서 · N=33 · 기술통계');
bars(p,[['적대적 표현: 경적·상향등·손짓',3.88],['갑작스러운 끼어들기',3.39],['타인의 교통법규 위반',3.36],['교통 체증·이동시간 지연',3.27],['뒤차의 안전거리 미확보',3.12],['앞차의 지나친 서행',3.03]],{top:314,step:60});
takeaway(p,'확인된 점','조사한 6개 상황 중, 경적·상향등·손짓으로 불만을 받는 상황의 평균이 가장 높았다.');

p=page('02 · 결과 2','분노가 발생했을 때 어떻게 반응하는가','표현 방식별 평균 · 5점 척도','출처: 설문결과_통계분석보고서 · N=33 · 기술통계');
bars(p,[['혼잣말',3.42],['욕설',2.61],['경적 사용',2.15],['공격적 운전 경험',1.97],['불만 표현 행동: 손짓·상향등 등',1.61]],{top:327,step:68});
takeaway(p,'확인된 점','혼잣말과 욕설의 평균 응답 점수가 공격적 운전 경험과 외부 불만 표현 행동보다 높았다.');

p=page('02 · 결과 3','동승자가 있으면 분노 표현을 조절하는가','동승자 존재에 따른 변화 · 5점 척도','출처: 설문결과_통계분석보고서 · N=33 · 자기보고 응답');
bars(p,[['감정 표현 조절',4.06],['화나는 상황에서 행동 참음',4.03],['운전 행동이 달라진다고 느낌',3.52],['동승자 반응에 따른 행동 변화',2.79],['오히려 감정 표현 증가',1.97]],{top:327,step:68});
takeaway(p,'확인된 점','감정 표현 조절은 평균 4.06점, 행동을 참는다는 응답은 4.03점으로 나타났다.');
p.slide.addNotes('이 설문은 운전자가 보고한 표현·행동 조절을 측정했다. 실제 분노 감정의 감소나 사고 감소를 직접 측정한 결과는 아니다.');

p=page('02 · 핵심 결과','동승자의 영향 이유: 안전 책임감이 최다','동승자의 영향을 받는 가장 큰 이유로, 시선 의식보다 안전 책임감이 많이 선택되었다.','출처: 설문결과_통계분석보고서 · 영향 이유 단일 선택 · N=33');
tx(p,'동승자의 안전에 대한 책임감',88,306,920,67,FS.emphasis,true);
tx(p,'63.6%',88,414,880,100,FS.main,true,C.accent);
tx(p,'21명 / 33명',96,596,700,50,FS.body,false,C.sub);
rect(p,1040,308,2,354,C.rule);
tx(p,'시선·체면 관련 응답',1092,311,420,59,FS.body,true);
tx(p,'좋은 모습을 보이고 싶음\n9.1% · 3명',1092,395,420,104,FS.body);
tx(p,'다른 사람이 보고 있음\n6.1% · 2명',1092,543,420,104,FS.body);
takeaway(p,'핵심 발견','33명 중 21명이 안전 책임감을 선택했다. 책임감이 행동 조절에 미치는 영향은 추가로 확인한다.');

p=page('02 · 결과 4','동승자가 영향을 미치는 이유 전체','가장 큰 이유를 선택한 응답 비율 · 합계는 반올림으로 100%와 다를 수 있음','출처: 설문결과_통계분석보고서 · N=33 · 단일 선택');
bars(p,[['안전 책임감 · 21명',63.6],['영향을 거의 받지 않음 · 4명',12.1],['좋은 모습을 보이고 싶음 · 3명',9.1],['다른 사람이 보고 있음 · 2명',6.1],['함께 감정을 공유함 · 2명',6.1],['동승자의 반응이나 말 · 1명',3.0]],{max:100,percent:true,top:314,step:60});
takeaway(p,'확인할 점','안전 책임감이 실제로 감정 표현과 행동을 바꾸는 원인인지는 후속 연구에서 확인한다.');

p=page('02 · 결과 5','누구와 탈 때 운전 행동이 가장 달라지는가','가족이 가장 많았다. 이 문항은 변화의 방향이나 안전성 향상을 직접 묻지는 않았다.','출처: 설문결과_통계분석보고서 · N=33 · 단일 선택');
bars(p,[['가족 · 11명',33.3],['유형에 따른 차이 없음 · 9명',27.3],['낯선 사람 · 5명',15.2],['연인 · 4명',12.1],['직장 동료 · 3명',9.1],['친구 · 1명',3.0]],{max:100,percent:true,top:314,step:60});
takeaway(p,'후속 질문','동승자와의 관계에 따라 책임감과 운전 행동이 어떻게 달라지는지 살펴본다.');

p=page('03 · 설문에서 얻은 시사점','설문 결과를 바탕으로 정한 연구 질문','이번 33명의 응답을 바탕으로, 안전 책임감과 감정·행동 조절의 관계에 주목한다.');
rows(p,[['발견 1','조사한 상황 중 타인의 경적·상향등·손짓에 대한 분노 평균이 가장 높았다.'],['발견 2','혼잣말과 욕설의 평균 점수가 공격적 운전과 외부 불만 표현 행동보다 높았다.'],['발견 3','동승자가 있을 때 표현을 조절하고 행동을 참는다는 응답 평균은 약 4점이었다.'],['발견 4','동승자의 영향을 받는 이유로 안전 책임감이 가장 많이 선택되었다(63.6%).']],286,96);
takeaway(p,'연구 질문','동승자의 안전을 지켜야 한다는 책임감은 운전자의 감정 표현과 행동 조절에 어떤 영향을 주는가?');

p=page('04 · 선행연구','동승자에 따른 변화를 이해하는 세 관점','타인과의 관계, 평가받는다는 의식, 감정 표현 성향을 함께 살펴본다.','출처: Goffman(1959), Cottrell(1972), 윤보영·이순철(2011) · 연구자 해석 포함');
columns(p,[['인문·사회적 관점','Goffman(1959)\n타인에게 어떤 모습으로 보이고 싶은가? 함께 있는 사람에 따라 말과 행동을 달리하는 이유를 살펴본다.'],['사회심리학적 관점','Cottrell(1972)\n다른 사람이 내 행동을 평가한다고 느끼는가? 평가받는다는 의식이 반응을 바꾸는지 살펴본다.'],['개인심리학적 관점','윤보영·이순철(2011)\n감정을 드러내기 어려운 이유는 무엇인가? 감정 표현 성향과 난폭운전의 관련성을 살펴본다.']],300);
takeaway(p,'해석 방향','세 관점으로 동승자에 따른 변화를 해석하고, 안전 책임감을 설명할 선행연구를 보완한다.');
p.slide.addNotes('세 관점은 연구 질문을 정리하는 틀이며, 검증된 3단계 인과관계가 아니다. 고프먼은 사회학자이고, 여기서는 타인과의 관계 속 행동을 이해하는 인문·사회적 관점으로 활용한다. 세 이론만으로 안전 책임감을 충분히 설명할 수는 없으므로 관련 문헌을 보완한다.');

p=page('04 · 인문·사회적 관점','자아 연출 이론: 타인 앞에서 달라지는 행동','Goffman(1959)은 사람들이 타인에게 보이는 자신의 모습을 조절한다고 설명한다.','출처: Goffman, The Presentation of Self in Everyday Life, 1959 · 운전 상황 적용은 연구자 해석');
rows(p,[['핵심 개념','사람은 함께 있는 상대와 상황에 맞춰 자신의 말투, 표정, 행동을 조절한다.'],['전면 영역','관객 앞의 무대처럼, 타인에게 보이고 싶은 모습에 맞춰 행동하는 상황이다.'],['후면 영역','그 관객에게서 벗어나, 앞에서 유지하던 말투나 태도를 내려놓을 수 있는 상황이다.'],['운전 상황에 적용','혼자 있을 때보다 동승자가 있을 때 자신의 말과 행동이 어떻게 보일지 더 의식할 수 있다.']],294,96);
takeaway(p,'적용 해석','동승자가 있으면 운전자는 다른 사람을 의식해 자신의 말과 행동을 조절할 수 있다.');
p.slide.addNotes('전면과 후면은 건물이나 차의 물리적 위치가 아니라, 특정 관객과의 관계에 따라 구분된다. 혼자 탄 차가 반드시 후면 영역이거나 동승자가 있으면 반드시 전면 영역인 것은 아니다. 친한 동승자와 함께 거친 말을 할 수도 있다. 고프먼의 이론은 타인을 의식한 행동 변화를 해석하는 데 활용하며, 안전 책임감을 직접 입증하는 근거로 사용하지 않는다. 참고: https://books.google.com/books/about/The_Presentation_of_Self_in_Everyday_Lif.html?id=Sdt-cDkV8pQC');

p=page('04 · 사회심리학','평가 불안: 다른 사람의 판단을 의식하는 마음','Cottrell(1972)은 타인에게 평가받을 수 있다는 예상이 수행에 영향을 준다고 설명했다.','출처: Cottrell, Social Facilitation, 1972; Cottrell et al., 1968 · 운전 적용은 가설');
rows(p,[['핵심 개념','평가 불안은 다른 사람이 자신의 행동이나 능력을 어떻게 판단할지 신경 쓰는 마음이다.'],['관련 실험','Cottrell 등(1968)의 과제 실험에서는 관찰하는 관객이 있을 때와 단순히 타인이 있을 때의 반응이 달랐다.'],['운전 상황에 적용','동승자가 운전 태도를 나쁘게 볼까 신경 쓰여 거친 말이나 행동을 줄이는지 확인할 수 있다.'],['설문과의 연결','이번 설문에서는 평가와 관련된 이유보다 안전 책임감이 많이 선택되었다. 두 이유를 구분해 살펴본다.']],286,99);
takeaway(p,'검토할 점','평가받는다는 의식이 운전 중 분노 표현을 줄이는지는 별도로 검증해야 한다.');
p.slide.addNotes('이 이론과 관련 실험은 사회적 상황에서의 수행과 우세 반응을 다룬다. 타인의 평가가 언제나 규범 준수나 분노 감소를 만든다는 뜻은 아니다. 1968년 실험과 1972년 이론 정리를 구분한다. 운전 중 표현 조절에 대한 설명은 본 연구의 가설이다. 실험 논문: https://doi.org/10.1037/h0025902');

p=page('04 · 개인심리학','정서표현갈등: 감정을 드러낼 때의 망설임','윤보영·이순철(2011)은 익명상황의 난폭운전과 감정 표현 성향의 관련성을 조사했다.','출처: 윤보영·이순철(2011), 익명상황의 운전행동과 운전분노 및 정서표현갈등과의 관계');
rows(p,[['정서표현갈등','감정을 드러내고 싶지만, 표현해도 괜찮을지 걱정하며 망설이는 상태를 뜻한다.'],['자기방어적 양가성','감정을 표현하고 싶은 마음과 거절당하거나 상처받을까 걱정하는 마음이 함께 있는 성향이다.'],['선행연구 결과','익명상황에서 난폭운전을 많이 보고한 집단은 운전분노와 정서표현갈등, 자기방어적 양가성 수준도 높았다.'],['후속 연구 질문','평소 감정 표현을 어려워하는 정도에 따라, 동승자가 있을 때의 표현·행동 변화도 달라지는가?']],282,102);
takeaway(p,'해석 범위','선행연구는 관련성을 보여준다. 감정을 억누르면 난폭운전을 하게 된다고 단정할 수는 없다.');
p.slide.addNotes('해당 논문은 연구 1에서 200명, 연구 2에서 384명을 조사했다. 익명상황에서 난폭운전을 많이 보고한 집단의 심리적 특성이 높게 나타난 결과이며, 평가 불안 해제나 동승자의 조절 효과를 직접 입증한 결과는 아니다. 이번 예비조사에서도 정서표현갈등을 직접 측정하지 않았으므로 후속 연구 질문으로 둔다. KCI 초록 확인: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001581557');

p=page('04 · 선행연구 종합','동승자가 행동을 바꾸는 이유를 어떻게 확인할까','선행연구의 설명과 설문의 안전 책임감 응답을 연결해 후속 연구 질문을 정리한다.','출처: 선행연구 및 예비조사 결과를 바탕으로 한 연구자 제안 · 검증 전');
rows(p,[['비교할 상황','혼자 운전할 때와 동승자가 있을 때, 감정과 행동이 어떻게 달라지는지 비교한다.'],['구분할 두 이유','타인에게 나쁘게 보이고 싶지 않은 마음과, 함께 탄 사람의 안전을 지키려는 책임감을 구분한다.'],['함께 살필 개인차','평소 감정을 표현할 때 느끼는 갈등이 동승자에 따른 변화와 관련되는지 확인한다.'],['구분할 결과','실제로 느끼는 화의 정도, 말로 표현하는 정도, 위험한 운전 행동을 각각 측정한다.']],286,99);
takeaway(p,'핵심 가설','동승자의 안전에 대한 책임감이 높을수록 감정 표현과 위험 행동을 더 조절할 것이다.');
p.slide.addNotes('핵심 가설은 검증 전이다. 기존 자료로 익명성, 평가 불안, 정서표현갈등이 순서대로 작동하는 매개 경로를 입증할 수 없으므로, 확인할 상황·이유·개인차·결과로 정리했다. 혼자 운전하는 것과 도로에서 상대에게 익명인 것은 다른 조건이다. 안전 책임감에 대한 선행연구를 보완하고, 가족 등 관계에 따른 차이와 감정 표현 증가 사례도 분석한다.');

p=page('05 · 향후 연구계획','설문 결과 이후의 연구 진행 방향','안전 책임감이 작용하는 이유를 보완하고, 본조사와 AI 설계로 이어간다.');
rows(p,[['1. 선행연구 보완','타인을 돌볼 책임, 분노 조절, 함께 화를 내는 현상, AI를 사회적 상대로 대하는 반응을 검토한다.'],['2. 본조사 설계','표본을 확대하고 책임감, 시선 의식, 분노의 정도, 감정 표현, 운전 행동을 구분해 묻는다.'],['3. 분석 방향','동승자와의 관계와 개인의 감정 표현 성향에 따라, 조절되는 이유와 정도가 다른지 비교한다.'],['4. AI 설계·평가','AI가 안전 책임감을 떠올리게 하는지, 감정·행동 조절에 도움이 되는지, 주의를 방해하는지 평가한다.']],288,104);
takeaway(p,'현재 단계','예비조사 결과와 선행연구에 근거한 해석을 제시하며, 원인과 AI 효과는 후속 연구에서 검증한다.');

async function main(){
  await pptx.writeFile({fileName:path.join(root,`research_plan_professor_feedback_${VERSION}.pptx`)});
  const wrapSvg=(body,w=1600,h=900)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  pages.forEach(p=>fs.writeFileSync(path.join(out,`slide-${String(p.number).padStart(2,'0')}.svg`),wrapSvg(p.svg.join('\n'))));
  const all=pages.map((p,i)=>`<g id="slide-${String(p.number).padStart(2,'0')}" transform="translate(${(i%2)*1680},${Math.floor(i/2)*980})">${p.svg.join('\n')}</g>`).join('\n');
  const combined=wrapSvg(all,3280,Math.ceil(pages.length/2)*980-80);
  fs.writeFileSync(path.join(root,'research_plan_figma_editable.svg'),combined);
  fs.writeFileSync(path.join(out,`research_plan_figma_editable_${VERSION}.svg`),combined);
  fs.writeFileSync(path.join(out,'layout-check.json'),JSON.stringify({slides:pages.length,font:FONT,textLines:checks.length,overflow:checks.filter(c=>c.width>c.w),palette:C},null,2));
  fs.writeFileSync(path.join(out,'preview.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><title>연구계획 발표 ${VERSION}</title><style>body{margin:0;background:#e5e9ea;font-family:'Noto Sans KR',sans-serif}main{max-width:1440px;margin:24px auto}img{display:block;width:100%;height:auto;margin:0 0 24px;background:white}@media print{body{background:white}main{margin:0}img{break-after:page;margin:0}}</style><main>${pages.map(p=>`<img alt="슬라이드 ${p.number}" src="slide-${String(p.number).padStart(2,'0')}.svg">`).join('')}</main></html>`);
  console.log(JSON.stringify({slides:pages.length,textLines:checks.length,out}));
}
main().catch(e=>{console.error(e);process.exit(1)});
