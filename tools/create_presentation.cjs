const fs = require('fs');
const path = require('path');
const deps = process.env.PRESENTATION_NODE_MODULES || path.join(process.env.TEMP, 'auto-paper-ppt', 'node_modules');
const PptxGenJS = require(path.join(deps, 'pptxgenjs'));
const { createCanvas, GlobalFonts } = require(path.join(deps, '@napi-rs/canvas'));
const root = path.resolve(__dirname, '..');
const VERSION = 'v7';
const out = path.join(root, `presentation_${VERSION}`);
fs.mkdirSync(out, { recursive: true });
GlobalFonts.registerFromPath('C:/Windows/Fonts/NotoSansKR-VF.ttf', 'Noto Sans KR');
const ctx = createCanvas(1600, 900).getContext('2d');
const FONT = 'Noto Sans KR';
const FS = { main: 60, emphasis: 40, body: 24, foot: 18, footLarge: 20 };
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
tx(p,'운전 상황에서 확인된 동승자 효과와 AI 설계 연구',92,461,1360,50,FS.body,false,C.sub);
rect(p,88,577,80,5,C.accent);
tx(p,'혼자 운전할 때도 동승자가 있을 때와 비슷한\n자기조절 경험을 만들 수 있는가?',88,620,1330,128,FS.emphasis,true,C.accent);
p.slide.addNotes('원제: 동승자 존재가 운전자 분노 조절에 미치는 영향과 차량 내 AI 인터페이스 설계 연구. 홍익대학교 일반대학원 산업디자인과 서종휘.');

p=page('01 · 발표 구성','연구의 전개 순서','연구 배경에서 예비조사 결과와 향후 연구계획으로 이어지는 구조다.');
rows(p,[['1. 연구 배경','운전 중 분노 경험과 동승자 존재에 따른 자기조절 현상'],['2. 조사 목적','해당 현상이 다른 운전자에게도 나타나는지 예비조사로 확인'],['3. 설문 개요','응답자 특성, 문항 구성, 분석 범위 정리'],['4. 설문 결과','분노 유발 상황, 반응 방식, 동승자 영향과 변화 이유 제시'],['5. 향후 연구계획','선행연구 보완, 본조사, AI 인터페이스 설계와 평가 방향 정리']],282,99);

p=page('01 · 연구 배경','관찰된 현상에서 출발한 문제의식','혼자 운전할 때와 누군가 함께 탈 때의 감정 표현 차이에 주목했다.');
tx(p,'운전 중 분노가 발생하는 상황에서도\n동승자가 있을 때는 감정 표현과 행동이\n상대적으로 조절되는 경험이 관찰되었다.',88,286,1424,210,FS.emphasis,true);
tx(p,'이 경험은 단순한 예절이나 체면의 문제가 아니라,\n차량 내부의 관계와 안전 책임이 운전자의 반응을 바꾸는 현상일 수 있다.',88,552,1424,96,FS.body,false,C.sub);
takeaway(p,'문제의식','이러한 변화가 다른 운전자에게도 나타나는지 예비조사를 통해 확인하고자 했다.');

p=page('01 · 연구 목적','혼자 운전할 때의 감정 조절을 어떻게 도울 수 있을까','동승자 효과를 차량 AI 경험으로 전환할 가능성을 탐색한다.');
rows(p,[['경험','동승자가 있으면 분노 표현과 위험한 반응을 줄이게 되는 순간이 있다.'],['질문','혼자 운전할 때도 비슷한 감정 조절 경험을 만들 수 있을까?'],['가능성','AI가 감시자가 아니라 동승자의 존재감과 책임감을 환기할 수 있을까?'],['기대','분노 표현과 위험 행동을 낮춰 사고 예방 가능성을 높일 수 있을까?']],300,96);
takeaway(p,'설계 방향','AI는 운전자를 꾸짖는 장치보다, 스스로 조절하게 돕는 동승자적 단서로 접근한다.');

p=page('01 · 조사 이유','동승자 효과를 예비조사로 확인했다','설문은 이론 검증보다 문제 발견과 방향 확인을 위한 예비조사로 진행했다.');
rows(p,[['확인 1','운전자들은 운전 중 분노를 경험하는가?'],['확인 2','분노는 어떤 상황에서 특히 강하게 나타나는가?'],['확인 3','분노가 발생했을 때 어떤 방식으로 반응하는가?'],['확인 4','동승자는 분노 표현을 낮추는가, 혹은 감정 동조를 통해 높이는가?'],['확인 5','그 변화의 이유가 시선 의식인지, 안전 책임감인지 확인할 수 있는가?']],282,99);

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
takeaway(p,'확인된 점','응답자들도 타인의 적대적 표현과 돌발 행동에서 강한 불쾌감을 경험했다.');

p=page('02 · 결과 2','분노가 발생했을 때 어떻게 반응하는가','표현 방식별 평균 · 5점 척도','출처: 설문결과_통계분석보고서 · N=33 · 기술통계');
bars(p,[['혼잣말',3.42],['욕설',2.61],['경적 사용',2.15],['공격적 운전 경험',1.97],['보복 행동',1.61]],{top:327,step:68});
takeaway(p,'확인된 점','분노는 실제 보복 행동보다 차량 내부의 혼잣말과 욕설로 먼저 나타나는 경향이 있었다.');

p=page('02 · 결과 3','동승자가 있으면 분노 표현을 조절하는가','동승자 존재에 따른 변화 · 5점 척도','출처: 설문결과_통계분석보고서 · N=33 · 자기보고 응답');
bars(p,[['감정 표현 조절',4.06],['화나는 상황에서 행동 참음',4.03],['운전 행동 변화 지각',3.52],['동승자 반응에 따른 행동 변화',2.79],['오히려 감정 표현 증가',1.97]],{top:327,step:68});
takeaway(p,'확인된 점','응답자 다수도 동승자가 있을 때 감정 표현과 행동을 조절한다고 응답했다.');

p=page('02 · 핵심 결과','왜 완화되는가: 시선보다 안전 책임감','초기 가정은 시선 의식이었으나, 예비조사에서는 안전 책임감이 더 크게 나타났다.','출처: 설문결과_통계분석보고서 · 영향 이유 단일 선택 · N=33');
tx(p,'동승자의 안전에 대한 책임감',88,306,920,67,FS.emphasis,true);
tx(p,'63.6%',88,414,880,100,FS.main,true,C.accent);
tx(p,'21명 / 33명',96,596,700,50,FS.body,false,C.sub);
rect(p,1040,308,2,354,C.rule);
tx(p,'시선·체면 관련 응답',1092,311,420,59,FS.body,true);
tx(p,'좋은 모습을 보이고 싶음\n9.1% · 3명',1092,395,420,104,FS.body);
tx(p,'다른 사람이 보고 있음\n6.1% · 2명',1092,543,420,104,FS.body);
takeaway(p,'핵심 전환','동승자는 감시하는 시선보다, 운전자가 보호해야 할 사람으로 경험될 가능성이 크다.');

p=page('02 · 결과 4','동승자가 영향을 미치는 이유 전체','가장 큰 이유를 선택한 응답 비율 · 합계는 반올림으로 100%와 다를 수 있음','출처: 설문결과_통계분석보고서 · N=33 · 단일 선택');
bars(p,[['안전 책임감 · 21명',63.6],['영향을 거의 받지 않음 · 4명',12.1],['좋은 모습을 보이고 싶음 · 3명',9.1],['다른 사람이 보고 있음 · 2명',6.1],['함께 감정을 공유함 · 2명',6.1],['동승자의 반응이나 말 · 1명',3.0]],{max:100,percent:true,top:314,step:60});
takeaway(p,'확인할 점','책임감은 가장 빈번한 응답이며, 인과적 기제는 후속 연구 과제다.');

p=page('02 · 결과 5','누가 탔을 때 가장 조절되는가','가족이 가장 많았고, 유형 차이를 느끼지 않는 응답도 나타났다.','출처: 설문결과_통계분석보고서 · N=33 · 단일 선택');
bars(p,[['가족 · 11명',33.3],['유형에 따른 차이 없음 · 9명',27.3],['낯선 사람 · 5명',15.2],['연인 · 4명',12.1],['직장 동료 · 3명',9.1],['친구 · 1명',3.0]],{max:100,percent:true,top:314,step:60});
takeaway(p,'후속 분석','관계의 친밀도와 보호 책임감이 어떻게 연결되는지 살펴본다.');

p=page('03 · 향후 연구계획','설문 결과 이후의 연구 진행 방향','결과 해석과 설계 제안은 후속 연구 단계에서 보완한다.');
rows(p,[['1. 선행연구 보완','인문학: 타자·책임·관계 / 심리: 분노 조절·상황 재평가 / 사회: 동승자·체면·감정 동조'],['2. 본조사 설계','예비조사 문항을 보완하고 표본 수, 연령대, 운전 경력 범위를 확대한다.'],['3. 분석 방향','동승자 유형, 안전 책임감, 시선 의식, 감정 표현 조절의 관계를 비교한다.'],['4. AI 설계 검토','혼자 운전할 때 동승자적 존재감과 안전 책임감을 환기하는 인터페이스 가능성을 탐색한다.']],288,104);
takeaway(p,'정리','현재 발표 범위는 예비조사 결과까지이며, 피드백 후 이론과 설계를 구체화한다.');

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
