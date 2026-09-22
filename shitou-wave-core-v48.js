/* 石頭少爺 V48 共用量價波段核心：盤後完成日K，不預測、不偷看未來。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShitouWaveCoreV48=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const MODEL='SHITOU_WAVE_CORE_V48';
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='string'?v.replace(/,/g,''):v);return Number.isFinite(n)?n:null;};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sma=(rows,key,n,end=rows.length)=>end>=n?avg(rows.slice(end-n,end).map(x=>num(x?.[key])).filter(Number.isFinite)):null;
const pct=(a,b)=>a!==null&&b>0?(a/b-1)*100:null;
const arrow=v=>v>0?'↑':v<0?'↓':'→';
function dateKey(value){const m=String(value??'').trim().match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);if(!m)return null;const out=`${m[1]}-${m[2]}-${m[3]}`,d=new Date(out+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===out?out:null;}
function normalizeBars(source){if(!Array.isArray(source))return [];const out=[];let previous='';for(const x of source){const date=dateKey(x?.date),open=num(x?.open),high=num(x?.high),low=num(x?.low),close=num(x?.close),volume=num(x?.volume);if(!date||date<=previous||!(open>0&&high>0&&low>0&&close>0&&volume!==null&&volume>=0)||high<Math.max(open,low,close)||low>Math.min(open,high,close))return [];out.push({date,open,high,low,close,volume});previous=date;}return out;}
function analyzeBars(source){const bars=normalizeBars(source);if(bars.length!==source?.length)return {ok:false,model:MODEL,reason:'日K日期、順序或OHLCV資料不完整／不合理'};if(bars.length<60)return {ok:false,model:MODEL,reason:'完整日K少於60根，無法可靠計算8/21/55日線與5/13/34日量潮'};
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
 const trigger=prior2High;const risk=[];if((gap21||0)>18)risk.push('離21日線太遠，追高風險高');if(threeBreakdown)risk.push('出現三盤跌破');if(anomalyWeak)risk.push('該強不強：長線仍上揚，但價格先跌破短中期結構');if(mv5<mv5p&&mv13<mv13p)risk.push('短中期量潮一起退');
 const evidence=[];if(threeBreakout)evidence.push('三盤突破');if(priceStack)evidence.push('價格站在8／21／55日線之上且排列偏多');if(mv5>mv5p)evidence.push('5日攻擊量上揚');if(mv13>mv13p)evidence.push('13日潮汐量上揚');if(mv34>mv34p)evidence.push('34日趨勢量上揚');if(healthyPullback)evidence.push('回檔量縮且仍守21日線');if(anomalyStrong)evidence.push('該弱不弱：長線仍壓力中卻先三盤突破');
 const maText=`8日線 ${ma8.toFixed(2)}${arrow(maSlope.ma8)}｜21日線 ${ma21.toFixed(2)}${arrow(maSlope.ma21)}｜55日線 ${ma55.toFixed(2)}${arrow(maSlope.ma55)}`;
 const mvText=`5日量潮 ${arrow(mvSlope.mv5)}｜13日量潮 ${arrow(mvSlope.mv13)}｜34日量潮 ${arrow(mvSlope.mv34)}`;
 const plain=phase==='LAUNCH'?'剛出現三盤突破，量能也開始接上；先看突破後能不能守住。':phase==='MAIN_ADVANCE'?'價格與量能都維持偏多排列，屬於主升延續，但仍要避免追太高。':phase==='HEALTHY_PULLBACK'?'上漲後正在量縮整理，結構還沒壞；等重新放量再攻會比較安全。':phase==='WEAKENING'?'價格與量能開始轉弱，先把防守放前面，不要把反彈當成新主升。':phase==='BASE_BUILDING'?'目前在整理收斂，還沒有正式發動；等三盤突破與量能轉強再確認。':'訊號還不夠完整，先觀察，不急著下結論。';
 return {ok:true,model:MODEL,date:c.date,close:c.close,phase,phaseLabel,tone,plain,score,ma8,ma21,ma55,mv5,mv13,mv34,maSlope,mvSlope,maText,mvText,threeBreakout,threeBreakdown,prior2High,prior2Low,priceStack,volumeStack,volumeStart,healthyPullback,anomalyStrong,anomalyWeak,gap21Pct:gap21,gap55Pct:gap55,fiveDayReturnPct:fiveRet,fiveMvChangePct:fiveVol,closePosition:closeNearHigh,support,trigger,evidence,risk,bars};
}
function analyzeReport(report){const result=analyzeBars(report?.dailySeries||report?.bars||report?.history||[]);if(!result.ok)return result;const statedDate=report?.closeDate||report?.reportDate;if(statedDate){const reportDate=dateKey(statedDate);if(reportDate!==result.date)return {ok:false,model:MODEL,reason:`報告日期 ${reportDate||statedDate} 與最後完成日K ${result.date} 不一致`};}return result;}
function grade(a){if(!a?.ok)return {key:'DATA',label:'資料不足'};if(a.phase==='WEAKENING')return {key:'REJECT',label:'轉弱排除'};if(a.score>=82&&(a.phase==='LAUNCH'||a.phase==='MAIN_ADVANCE'))return {key:'S',label:'強中強'};if(a.score>=68&&['LAUNCH','MAIN_ADVANCE','HEALTHY_PULLBACK'].includes(a.phase))return {key:'A',label:'條件完整'};if(a.score>=55&&a.phase!=='WEAKENING')return {key:'B',label:'可觀察'};return {key:'WATCH',label:'等待更完整'};}
function textBlock(a,title='量價波段白話判讀'){if(!a?.ok)return `【${title}】\n資料不足：${a?.reason||'無法計算'}`;const g=grade(a);return `【${title}】\n目前位置：${g.label}｜${a.phaseLabel}｜條件分 ${a.score}/100（不是勝率）\n白話：${a.plain}\n均線：${a.maText}\n量能：${a.mvText}\n三盤：${a.threeBreakout?'✅ 三盤突破':a.threeBreakdown?'⚠️ 三盤跌破':'尚未出現新的三盤轉折'}｜觀察價 ${a.trigger.toFixed(2)}｜防守參考 ${a.support.toFixed(2)}\n依據：${a.evidence.length?a.evidence.join('、'):'目前沒有足夠的轉強證據'}${a.risk.length?`\n風險：${a.risk.join('、')}`:''}`;}
return Object.freeze({MODEL,num,sma,normalizeBars,analyzeBars,analyzeReport,grade,textBlock});
});
