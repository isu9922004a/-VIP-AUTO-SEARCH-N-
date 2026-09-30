'use strict';

/* 蕭明道課程量價判讀層
 * 來源是使用者提供的上、下集字幕。字幕有辨識錯字，因此只採用可由完成日 K
 * 客觀重算的原則：量、價、時間、角度、相對強弱、三盤與風險先行。
 */
(function(root,factory){
  let wave=root?.ShitouWaveCoreV48||null;
  if(typeof module==='object'&&module.exports)try{wave=require('./shitou-wave-core-v48.js');}catch(_){}
  const api=factory(wave);if(root)root.ShitouXiaoMingDaoV52=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(W){
  const MODEL='XIAOMINGDAO_VOLUME_PRICE_V52';
  const ROLE='SELECTION_TIE_RANK_AND_EXPLANATION';
  const SOURCE_EVIDENCE=Object.freeze([
    Object.freeze({file:'蕭明道上.srt',time:'00:49:28–00:50:14',principle:'三盤是日線風險保險；遇到風險可先退出，之後再買回。'}),
    Object.freeze({file:'蕭明道上.srt',time:'01:11:55–01:12:21',principle:'型態突破或跌破要靠量，突破前常先量縮整理。'}),
    Object.freeze({file:'蕭明道上.srt',time:'01:00:38–01:00:52',principle:'角度平緩、量能不配合的突破要防假突破。'}),
    Object.freeze({file:'蕭明道下.srt',time:'00:00:04–00:00:32',principle:'個股要和產業、大盤比較相對強弱。'}),
    Object.freeze({file:'蕭明道下.srt',time:'00:35:09–00:35:22',principle:'不要只把前低或均線當支撐，必須回到量價結構。'}),
    Object.freeze({file:'蕭明道下.srt',time:'01:14:51–01:15:23',principle:'判讀由量、價、時間、角度共同組成。'}),
    Object.freeze({file:'蕭明道下.srt',time:'00:41:08–00:41:29',principle:'先避免套牢；可控制的小損失優先於硬等反彈。'})
  ]);
  const num=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const reportOf=input=>input?.report||input||{};
  function relativeStrengthOf(input){
    const report=reportOf(input),values=[input?.industryContext?.relativeStrength,report?.industryContext?.relativeStrength,input?.relativeStrength,report?.relativeStrength];
    return values.map(num).find(value=>value!==null)??null;
  }
  function threePanState(w){
    const ratio=w?.threePanVolumeRatio;
    if(w?.threeBreakoutConfirmed)return {key:'BREAKOUT_CONFIRMED',icon:'✅',label:'三盤突破＋量價確認',plain:`今天收盤高過前兩天最高價，今日量約為前5日均量 ${ratio.toFixed(2)} 倍，且收盤靠近日高；可列入明日盤中確認，但不是開盤直接買。`};
    if(w?.threeBreakout)return {key:'BREAKOUT_UNCONFIRMED',icon:'🟠',label:'價格過關、量價未確認',plain:`今天收盤雖高過前兩天最高價，但量比 ${ratio?.toFixed(2)??'-'} 倍或收盤位置沒有配合；先當疑似假突破，不追價。`};
    if(w?.threeBreakdownConfirmed)return {key:'BREAKDOWN_CONFIRMED',icon:'🔴',label:'帶量三盤跌破',plain:`今天收盤低過前兩天最低價，而且帶量弱收；風險已確認，空手不進場，持股先依防守價處理。`};
    if(w?.threeBreakdown)return {key:'BREAKDOWN_UNCONFIRMED',icon:'🟠',label:'三盤跌破、先防守',plain:'今天收盤低過前兩天最低價；即使量能尚未完整確認，也先把防守放前面，不賭立即反彈。'};
    return {key:'NO_TURN',icon:'⚪',label:'三盤尚未轉折',plain:'最近三個完成交易日還沒有形成新的收盤突破或跌破；現在以等待為主。'};
  }
  function component(key,label,earned,max,plain,available=true){return {key,label,earned:available?clamp(Math.round(earned),0,max):null,max,available,plain};}
  function analyze(input,waveAnalysis=null){
    const report=reportOf(input),w=waveAnalysis?.ok?waveAnalysis:W?.analyzeReport?.(report);
    if(!w?.ok)return {ok:false,model:MODEL,role:ROLE,score:null,label:'資料不足',reason:w?.reason||'量價核心未載入',components:[],sourceEvidence:SOURCE_EVIDENCE};
    const pan=threePanState(w),positiveSlopes=[w.maSlope?.ma8>0,w.maSlope?.ma21>0,w.maSlope?.ma55>=0].filter(Boolean).length;
    const trendEarned=(w.priceStack?13:0)+positiveSlopes*3+(w.fiveDayReturnPct>0?3:0);
    const panEarned=pan.key==='BREAKOUT_CONFIRMED'?25:pan.key==='BREAKOUT_UNCONFIRMED'?8:pan.key==='NO_TURN'?11:pan.key==='BREAKDOWN_UNCONFIRMED'?4:0;
    const ratio=num(w.threePanVolumeRatio),volumeEarned=ratio===null?0:(ratio>=1.1&&ratio<=3?12:ratio>=.9?8:ratio>=.7?5:2)+[w.mvSlope?.mv5>0,w.mvSlope?.mv13>=0].filter(Boolean).length*4;
    const gap=Math.abs(num(w.gap21Pct)??99),positionEarned=gap<=6?15:gap<=10?12:gap<=15?7:gap<=18?3:0;
    const relative=relativeStrengthOf(input),relativeAvailable=relative!==null,relativeEarned=!relativeAvailable?0:relative>=2?15:relative>0?12:relative>=-2?7:2;
    const components=[
      component('TREND_ANGLE','趨勢與角度',trendEarned,25,w.priceStack?'價格與均線方向偏多。':'價格與均線方向仍未完全同步。'),
      component('THREE_PAN','三盤轉折',panEarned,25,pan.plain),
      component('VOLUME','成交量確認',volumeEarned,20,ratio===null?'成交量資料不足。':`今日量約為前5日均量 ${ratio.toFixed(2)} 倍；突破要有量，量大價不動也要降級。`),
      component('POSITION','位置與追價距離',positionEarned,15,gap<=10?`離21日線約 ${gap.toFixed(1)}%，位置仍可管理。`:`離21日線約 ${gap.toFixed(1)}%，追價容錯偏低。`),
      component('RELATIVE','產業相對強弱',relativeEarned,15,relativeAvailable?`產業相對大盤約 ${relative>=0?'+':''}${relative.toFixed(1)} 個百分點。`:'產業相對強弱資料不足；本項不加分也不扣分。',relativeAvailable)
    ];
    const available=components.filter(item=>item.available),earned=available.reduce((sum,item)=>sum+item.earned,0),max=available.reduce((sum,item)=>sum+item.max,0),score=max?Math.round(earned/max*100):0;
    const hardRisk=w.threeBreakdownConfirmed||w.phase==='WEAKENING'||gap>18||(w.fib?.direction==='UP'&&w.fib?.zone?.key==='BROKEN');
    let key='WAIT',icon='🟠',label='現在先等，不適合急著進場';
    if(hardRisk){key='AVOID';icon='🔴';label='目前不適合進場';}
    else if(pan.key==='BREAKOUT_CONFIRMED'&&score>=75){key='CONDITIONAL';icon='🟢';label='可列入明日盤中條件確認';}
    else if(score>=60){key='WATCH';icon='🟡';label='可以觀察，但還不能直接進場';}
    const defense=num(w.support),trigger=num(w.trigger);
    const openingChecklist=[
      trigger?`價格：開盤後要能站穩 ${trigger.toFixed(2)}，只碰到不算確認。`:'價格：等待盤中建立可驗證的突破關卡。',
      `成交量：突破時要有量；爆量卻推不動，立即降級為不追。`,
      defense?`風險：跌破 ${defense.toFixed(2)}，停止新買並重新檢查。`:'風險：尚無可靠防守價，不建立新部位。'
    ];
    return {ok:true,model:MODEL,role:ROLE,score,key,icon,label,coverageMax:max,coveragePct:Math.round(max/100*100),threePan:pan,components,openingChecklist,trigger,defense,relativeStrength:relative,rankingUse:'同一正式等級內的次排序；不能繞過原 Gate',notWinRate:true,sourceEvidence:SOURCE_EVIDENCE};
  }
  function textBlock(input){
    const a=input?.model===MODEL?input:analyze(input);if(!a.ok)return `【量價判讀】\n資料不足：${a.reason}`;
    return [`【量價判讀｜明日開盤適合度】`,`${a.icon} ${a.label}｜${a.score}/100（條件完整度，不是勝率）`,`三盤白話：${a.threePan.plain}`,'五項量化：',...a.components.map(item=>`- ${item.label}：${item.available?`${item.earned}/${item.max}`:'資料不足'}｜${item.plain}`),'明日開盤只看：',...a.openingChecklist.map((item,index)=>`${index+1}. ${item}`),`定位：${a.rankingUse}。`].join('\n');
  }
  return Object.freeze({MODEL,ROLE,SOURCE_EVIDENCE,num,relativeStrengthOf,threePanState,analyze,textBlock});
});
