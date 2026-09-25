/* 石頭少爺 V49 共用量價波段核心：盤後完成日K，不預測、不偷看未來；新增費波回撤「量尺」層，只量位置，不把比例當反轉保證。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShitouWaveCoreV48=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const MODEL='SHITOU_WAVE_CORE_V49_FIB_RETRACE';
const RELEASE='石頭少爺 Agent V49 正式版｜R5.3.2.4.22-R4.8｜量價波段＋費波回撤共振｜官方休市日曆修正版';
const FIB_RATIOS=Object.freeze([0,.236,.382,.5,.618,.786,1]);
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='string'?v.replace(/,/g,''):v);return Number.isFinite(n)?n:null;};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sma=(rows,key,n,end=rows.length)=>end>=n?avg(rows.slice(end-n,end).map(x=>num(x?.[key])).filter(Number.isFinite)):null;
const pct=(a,b)=>a!==null&&b>0?(a/b-1)*100:null;
const arrow=v=>v>0?'↑':v<0?'↓':'→';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalizeBars(source){if(!Array.isArray(source))return [];const out=[];for(const x of source){const open=num(x?.open),high=num(x?.high),low=num(x?.low),close=num(x?.close),volume=num(x?.volume);if(!(open>0&&high>0&&low>0&&close>0&&volume>=0))continue;out.push({date:String(x?.date||''),open,high,low,close,volume});}return out;}
function confirmedPivots(bars,left=3,right=3){
  const out=[];if(!Array.isArray(bars)||bars.length<left+right+3)return out;
  for(let i=left;i<bars.length-right;i++){
    const h=bars[i].high,l=bars[i].low;let ph=true,pl=true;
    for(let j=i-left;j<=i+right;j++){if(j===i)continue;if(bars[j].high>=h)ph=false;if(bars[j].low<=l)pl=false;}
    if(ph)out.push({type:'H',index:i,date:bars[i].date,price:h});
    if(pl)out.push({type:'L',index:i,date:bars[i].date,price:l});
  }
  out.sort((a,b)=>a.index-b.index||(a.type==='L'?-1:1));
  const clean=[];
  for(const p of out){
    const prev=clean.at(-1);
    if(prev&&prev.type===p.type){
      if((p.type==='H'&&p.price>prev.price)||(p.type==='L'&&p.price<prev.price))clean[clean.length-1]=p;
    }else clean.push(p);
  }
  return clean;
}
function selectCompletedSwing(bars){
  const pivots=confirmedPivots(bars,3,3);if(pivots.length<2)return null;
  for(let i=pivots.length-1;i>=1;i--){
    const a=pivots[i-1],b=pivots[i];if(a.type===b.type||b.index-a.index<2)continue;
    if(a.type==='L'&&b.type==='H'&&b.price>a.price)return {direction:'UP',start:a,end:b,pivots};
    if(a.type==='H'&&b.type==='L'&&a.price>b.price)return {direction:'DOWN',start:a,end:b,pivots};
  }
  return null;
}
function fibLevelPrice(swing,ratio){
  const span=Math.abs(swing.end.price-swing.start.price);if(!(span>0))return null;
  return swing.direction==='UP'?swing.end.price-span*ratio:swing.end.price+span*ratio;
}
function fibZone(direction,ratioPct){
  if(!Number.isFinite(ratioPct))return {key:'NA',label:'資料不足',risk:'unknown'};
  if(ratioPct<0)return direction==='UP'?{key:'BEYOND',label:'已突破前波高點',risk:'strong'}:{key:'BEYOND',label:'已跌破前波低點',risk:'weak'};
  if(ratioPct<=23.6)return {key:'VERY_SHALLOW',label:direction==='UP'?'回吐很淺':'反彈很淺',risk:'low'};
  if(ratioPct<=38.2)return {key:'SHALLOW',label:direction==='UP'?'淺度回檔':'淺度反彈',risk:'low'};
  if(ratioPct<=50)return {key:'NORMAL',label:direction==='UP'?'正常整理':'中等反彈',risk:'normal'};
  if(ratioPct<=61.8)return {key:'MID_DEEP',label:direction==='UP'?'回檔偏深':'反彈偏深',risk:'watch'};
  if(ratioPct<=78.6)return {key:'DEEP',label:direction==='UP'?'深度回檔':'深度反彈',risk:'watch'};
  if(ratioPct<=100)return {key:'STRUCTURE_RISK',label:direction==='UP'?'原波段優勢大多已回吐':'原跌勢大多已回補',risk:'high'};
  return {key:'BROKEN',label:direction==='UP'?'原上漲波段已完全回吐':'原下跌波段已被完全回補',risk:'high'};
}
function analyzeFib(bars,context={}){
  const swing=selectCompletedSwing(bars);if(!swing)return {ok:false,reason:'找不到已確認的完整波段高低點'};
  const close=bars.at(-1).close,span=Math.abs(swing.end.price-swing.start.price);if(!(span>0))return {ok:false,reason:'波段幅度為0'};
  const ratioPct=swing.direction==='UP'?(swing.end.price-close)/span*100:(close-swing.end.price)/span*100;
  const levels={};for(const r of FIB_RATIOS)levels[String(r)]=fibLevelPrice(swing,r);
  const z=fibZone(swing.direction,ratioPct);
  const bounded=clamp(ratioPct,0,100)/100;
  let lower=0,upper=.236;
  for(let i=0;i<FIB_RATIOS.length-1;i++){if(bounded>=FIB_RATIOS[i]&&bounded<=FIB_RATIOS[i+1]){lower=FIB_RATIOS[i];upper=FIB_RATIOS[i+1];break;}}
  const p1=fibLevelPrice(swing,lower),p2=fibLevelPrice(swing,upper);
  const zoneLow=Math.min(p1,p2),zoneHigh=Math.max(p1,p2);
  const priceConfirm=swing.direction==='UP'
    ?!!(context.threeBreakout||(context.ma8!==null&&close>context.ma8&&context.maSlope?.ma8>=0&&context.mvSlope?.mv5>0))
    :!!(context.threeBreakdown||(context.ma8!==null&&close<context.ma8&&context.maSlope?.ma8<=0));
  const ratioText=ratioPct<0?`${Math.abs(ratioPct).toFixed(1)}% 超越原波段端點`:`${ratioPct.toFixed(1)}%`;
  const bandText=`${(lower*100).toFixed(lower===0?0:1)}%～${(upper*100).toFixed(1)}%`;
  const directionText=swing.direction==='UP'?'上漲波段回吐':'下跌波段反彈回補';
  const plain=swing.direction==='UP'
    ?`前一段從 ${swing.start.price.toFixed(2)} 漲到 ${swing.end.price.toFixed(2)}，目前約回吐 ${ratioText}，屬於「${z.label}」。這只是量尺，不代表到某個比例就一定反彈。`
    :`前一段從 ${swing.start.price.toFixed(2)} 跌到 ${swing.end.price.toFixed(2)}，目前約反彈回補 ${ratioText}，屬於「${z.label}」。這只是量尺，不代表到某個比例就一定反轉。`;
  return {ok:true,direction:swing.direction,directionText,start:swing.start,end:swing.end,span,ratioPct,ratioText,zone:z,levels,band:{lower,upper,label:bandText,low:zoneLow,high:zoneHigh},priceConfirm,plain};
}
function fibTieRank(fib){
  if(!fib?.ok)return 6;if(fib.zone.key==='BROKEN')return 9;if(fib.zone.key==='STRUCTURE_RISK')return 7;
  if(fib.zone.key==='BEYOND')return fib.priceConfirm?0:2;
  if(['VERY_SHALLOW','SHALLOW'].includes(fib.zone.key))return 1;
  if(fib.zone.key==='NORMAL')return 2;if(fib.zone.key==='MID_DEEP')return 3;if(fib.zone.key==='DEEP')return 4;return 5;
}
function analyzeBars(source){const bars=normalizeBars(source);if(bars.length<60)return {ok:false,model:MODEL,reason:'完整日K少於60根，無法可靠計算8/21/55日線與5/13/34日量潮'};
 const i=bars.length-1,c=bars[i],p1=bars[i-1],p2=bars[i-2];
 const ma8=sma(bars,'close',8),ma21=sma(bars,'close',21),ma55=sma(bars,'close',55);
 const ma8p=sma(bars,'close',8,bars.length-1),ma21p=sma(bars,'close',21,bars.length-1),ma55p=sma(bars,'close',55,bars.length-1);
 const mv5=sma(bars,'volume',5),mv13=sma(bars,'volume',13),mv34=sma(bars,'volume',34);
 const mv5p=sma(bars,'volume',5,bars.length-1),mv13p=sma(bars,'volume',13,bars.length-1),mv34p=sma(bars,'volume',34,bars.length-1);
 const prior2High=Math.max(p1.high,p2.high),prior2Low=Math.min(p1.low,p2.low);
 const threeBreakout=c.close>prior2High,threeBreakdown=c.close<prior2Low;
 const priceStack=c.close>ma8&&ma8>ma21&&ma21>ma55;
 const volumeStack=c.volume>mv5&&mv5>mv13&&mv13>mv34;
 const maSlope={ma8:ma8-ma8p,ma21:ma21-ma21p,ma55:ma55-ma55p};
 const mvSlope={mv5:mv5-mv5p,mv13:mv13-mv13p,mv34:mv34-mv34p};
 const volumeStart=c.volume>p1.volume&&c.volume>bars[i-5].volume;
 const gap21=pct(c.close,ma21),gap55=pct(c.close,ma55);
 const fiveRet=pct(c.close,bars[i-5].close),fiveVol=pct(mv5,mv5p);
 const last5=bars.slice(-5);const ranges=last5.map(b=>(b.high-b.low)/b.close);const contraction=avg(ranges.slice(-3))<=avg(ranges.slice(0,2))*0.9;
 const closeNearHigh=c.high===c.low?0:(c.close-c.low)/(c.high-c.low);
 const healthyPullback=!threeBreakdown&&c.close>=ma21&&ma55>=ma55p&&mv5<mv5p&&c.volume<=p1.volume&&fiveRet!==null&&fiveRet>-8;
 const anomalyStrong=ma55<ma55p&&c.close>ma55&&threeBreakout;
 const anomalyWeak=ma55>ma55p&&c.close<ma21&&threeBreakdown;
 const fib=analyzeFib(bars,{threeBreakout,threeBreakdown,ma8,ma21,ma55,maSlope,mvSlope});
 let phase='WATCH',phaseLabel='等待更清楚的方向',tone='neutral';
 if(threeBreakdown&&(c.close<ma21||ma21<ma21p)){phase='WEAKENING';phaseLabel='轉弱／退潮';tone='risk';}
 else if(priceStack&&ma8>ma8p&&ma21>ma21p&&ma55>=ma55p&&(mv5>mv5p)&&(mv13>=mv13p||mv34>=mv34p)){phase='MAIN_ADVANCE';phaseLabel='主升延續';tone='strong';}
 else if(threeBreakout&&c.close>ma21&&ma8>=ma8p&&mv5>mv5p){phase='LAUNCH';phaseLabel='突破起漲';tone='strong';}
 else if(healthyPullback){phase='HEALTHY_PULLBACK';phaseLabel='量縮整理／等再攻';tone='watch';}
 else if(contraction&&Math.abs(gap21||0)<=5&&mv5<=mv5p){phase='BASE_BUILDING';phaseLabel='整理準備區';tone='watch';}
 const priceStrength=[c.close>ma8,ma8>ma21,ma21>ma55,ma8>ma8p,ma21>ma21p,ma55>=ma55p].filter(Boolean).length;
 const volumeStrength=[c.volume>mv5,mv5>mv13,mv13>mv34,mv5>mv5p,mv13>=mv13p,mv34>=mv34p].filter(Boolean).length;
 const score=Math.max(0,Math.min(100,Math.round(priceStrength*8+volumeStrength*6+(threeBreakout?18:0)+(volumeStart?8:0)+(closeNearHigh>=.7?6:0)+(healthyPullback?8:0)-(threeBreakdown?30:0)-((gap21||0)>18?15:0))));
 const supportCandidates=[ma8,ma21,ma55,prior2Low].filter(x=>x>0&&x<c.close).sort((a,b)=>b-a);const support=supportCandidates[0]||prior2Low;
 const trigger=prior2High;const risk=[];if((gap21||0)>18)risk.push('離21日線太遠，追高風險高');if(threeBreakdown)risk.push('出現三盤跌破');if(anomalyWeak)risk.push('該強不強：長線仍上揚，但價格先跌破短中期結構');if(mv5<mv5p&&mv13<mv13p)risk.push('短中期量潮一起退');if(fib?.ok&&fib.direction==='UP'&&fib.ratioPct>78.6)risk.push('前一段上漲已回吐超過78.6%，原波段優勢明顯變弱');
 const evidence=[];if(threeBreakout)evidence.push('三盤突破');if(priceStack)evidence.push('價格站在8／21／55日線之上且排列偏多');if(mv5>mv5p)evidence.push('5日攻擊量上揚');if(mv13>mv13p)evidence.push('13日潮汐量上揚');if(mv34>mv34p)evidence.push('34日趨勢量上揚');if(healthyPullback)evidence.push('回檔量縮且仍守21日線');if(anomalyStrong)evidence.push('該弱不弱：長線仍壓力中卻先三盤突破');if(fib?.ok)evidence.push(`波段量尺：${fib.zone.label}`);
 const maText=`短線抱單線 ${ma8.toFixed(2)}${arrow(maSlope.ma8)}｜強弱分界線 ${ma21.toFixed(2)}${arrow(maSlope.ma21)}｜趨勢方向線 ${ma55.toFixed(2)}${arrow(maSlope.ma55)}`;
 const mvText=`短線攻擊量 ${arrow(mvSlope.mv5)}｜中段潮汐量 ${arrow(mvSlope.mv13)}｜大方向趨勢量 ${arrow(mvSlope.mv34)}`;
 const plain=phase==='LAUNCH'?'剛出現三盤突破，量能也開始接上；先看突破後能不能守住。':phase==='MAIN_ADVANCE'?'價格與量能都維持偏多排列，屬於主升延續，但仍要避免追太高。':phase==='HEALTHY_PULLBACK'?'上漲後正在量縮整理，結構還沒壞；等重新放量再攻會比較安全。':phase==='WEAKENING'?'價格與量能開始轉弱，先把防守放前面，不要把反彈當成新主升。':phase==='BASE_BUILDING'?'目前在整理收斂，還沒有正式發動；等三盤突破與量能轉強再確認。':'訊號還不夠完整，先觀察，不急著下結論。';
 return {ok:true,model:MODEL,release:RELEASE,date:c.date,close:c.close,phase,phaseLabel,tone,plain,score,ma8,ma21,ma55,mv5,mv13,mv34,maSlope,mvSlope,maText,mvText,threeBreakout,threeBreakdown,prior2High,prior2Low,priceStack,volumeStack,volumeStart,healthyPullback,anomalyStrong,anomalyWeak,gap21Pct:gap21,gap55Pct:gap55,fiveDayReturnPct:fiveRet,fiveMvChangePct:fiveVol,closePosition:closeNearHigh,support,trigger,evidence,risk,fib,fibTieRank:fibTieRank(fib),bars};
}
function analyzeReport(report){return analyzeBars(report?.dailySeries||report?.bars||report?.history||[]);}
function grade(a){if(!a?.ok)return {key:'DATA',label:'資料不足'};if(a.phase==='WEAKENING')return {key:'REJECT',label:'轉弱排除'};if(a.score>=82&&(a.phase==='LAUNCH'||a.phase==='MAIN_ADVANCE'))return {key:'S',label:'強中強'};if(a.score>=68&&['LAUNCH','MAIN_ADVANCE','HEALTHY_PULLBACK'].includes(a.phase))return {key:'A',label:'條件完整'};if(a.score>=55&&a.phase!=='WEAKENING')return {key:'B',label:'可觀察'};return {key:'WATCH',label:'等待更完整'};}
function fibText(fib){if(!fib?.ok)return '波段量尺：找不到已確認的完整波段，這一層不硬算。';return `波段量尺：${fib.directionText} ${fib.ratioText}｜${fib.zone.label}｜📍目前落在 ${fib.band.label} 區間（約 ${fib.band.low.toFixed(2)}～${fib.band.high.toFixed(2)}）｜${fib.priceConfirm?'✅ 已有價格確認':'🟡 仍要等價格確認'}；比例只是量尺，不是反轉保證。`;}
function textBlock(a,title='量價波段白話判讀'){if(!a?.ok)return `【${title}】\n資料不足：${a?.reason||'無法計算'}`;const g=grade(a);return `【${title}】\n目前位置：${g.label}｜${a.phaseLabel}｜條件分 ${a.score}/100（不是勝率）\n白話：${a.plain}\n價格三線：${a.maText}\n量能三線：${a.mvText}\n三盤：${a.threeBreakout?'✅ 三盤突破':a.threeBreakdown?'⚠️ 三盤跌破':'尚未出現新的三盤轉折'}\n${fibText(a.fib)}\n🎯 觀察價：${a.trigger.toFixed(2)}｜🛡️ 防守參考：${a.support.toFixed(2)}\n依據：${a.evidence.length?a.evidence.join('、'):'目前沒有足夠的轉強證據'}${a.risk.length?`\n⚠️ 風險：${a.risk.join('、')}`:''}`;}
return Object.freeze({MODEL,RELEASE,FIB_RATIOS,num,sma,normalizeBars,confirmedPivots,selectCompletedSwing,fibLevelPrice,fibZone,analyzeFib,fibTieRank,analyzeBars,analyzeReport,grade,fibText,textBlock});
});
