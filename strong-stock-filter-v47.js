/* 強勢飆股濾網 V49 R4.8：三盤＋價格三線＋量能三線為主軸，費波回撤只作位置量尺；
   日期 Gate 會辨識官方休市日，休市時沿用最近完成交易日，不再把星期一～五一律當成交易日。 */
(function(root,factory){const api=factory(root?.ShitouWaveCoreV48);if(typeof module==='object'&&module.exports){let W=null;try{W=require('./shitou-wave-core-v48.js');}catch(_){}module.exports=factory(W);}else if(root)root.ShitouStrongStockFilterV47=api;})(typeof globalThis!=='undefined'?globalThis:null,function(W){
'use strict';
const MODEL='STRONG_STOCK_FILTER_V49_WAVE_FIB';
const RULE=Object.freeze({minTradeValue:10000000,maxGap21Pct:18,minBars:60});
const invalid=reason=>({status:'DATA',eligible:false,reason});
const number=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='string'?v.replace(/,/g,''):v);return Number.isFinite(n)?n:null;};
function date(value){const m=String(value??'').trim().match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);if(!m)return null;const out=`${m[1]}-${m[2]}-${m[3]}`,d=new Date(out+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===out?out:null;}
const FALLBACK_TWSE_CLOSED_V49=Object.freeze({
  '2026-01-01':'中華民國開國紀念日','2026-02-12':'春節休市','2026-02-13':'春節休市',
  '2026-02-16':'農曆春節','2026-02-17':'農曆春節','2026-02-18':'農曆春節','2026-02-19':'農曆春節','2026-02-20':'農曆春節',
  '2026-02-27':'和平紀念日補假','2026-04-03':'兒童節補假','2026-04-06':'清明節補假','2026-05-01':'勞動節',
  '2026-06-19':'端午節','2026-09-25':'中秋節','2026-09-28':'教師節','2026-10-09':'國慶日補假',
  '2026-10-26':'臺灣光復暨金門古寧頭大捷紀念日補假','2026-12-25':'行憲紀念日'
});
function marketClosedStateV49(meta,today){
  const weekday=new Date(today+'T00:00:00Z').getUTCDay();
  if(weekday===0||weekday===6)return {closed:true,name:'週末'};
  if(meta?.todayMarketClosed===true)return {closed:true,name:String(meta?.marketClosureName||'官方休市日')};
  const name=FALLBACK_TWSE_CLOSED_V49[today];
  return name?{closed:true,name}:{closed:false,name:null};
}
function validateMarket(meta,marketRowCount,now=new Date()){
  if(!meta||meta.marketCoverageReady!==true||meta.industryCoverageReady!==true)return {ok:false,reason:'上市、上櫃完整市場或官方產業覆蓋尚未確認'};
  const target=date(meta.targetTradeDate||meta.completedTradeDate),completed=date(meta.completedTradeDate||meta.targetTradeDate),twse=date(meta.twseQuoteDate),tpex=date(meta.tpexQuoteDate);
  if(!target||!completed||!twse||!tpex||new Set([target,completed,twse,tpex]).size!==1)return {ok:false,reason:'市場、上市、上櫃交易日不一致或日期缺失'};
  const count=number(meta.total);if(count===null||count!==marketRowCount||count<1000)return {ok:false,reason:'市場快照筆數不足或與中繼資料不一致'};
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now),get=k=>parts.find(p=>p.type===k)?.value,today=`${get('year')}-${get('month')}-${get('day')}`,minutes=Number(get('hour'))*60+Number(get('minute'));
  const closed=marketClosedStateV49(meta,today);
  if(today===target&&minutes<17*60+35&&!closed.closed)return {ok:false,reason:'當日盤後資料整理期間；建議 17:35 後再查詢'};
  if(target>today)return {ok:false,reason:'市場快照日期在未來'};
  if(target!==today&&minutes>=15*60&&!closed.closed){
    const weekday=new Date(today+'T00:00:00Z').getUTCDay();
    if(weekday>=1&&weekday<=5)return {ok:false,reason:`目前仍是 ${target} 舊市場快照，尚未取得 ${today} 最新盤後資料`};
  }
  return {ok:true,date:target,marketClosed:closed.closed,marketClosureName:closed.name};
}
function officialIndustry(record){const code=String(record?.industryCode??'').trim(),name=String(record?.industryName||record?.industry||'').trim();if(!code&&!name)return {key:'UNKNOWN',reason:'官方產業別缺失'};if(code==='17'||/金融|銀行|保險|證券|金控/.test(name))return {key:'FINANCIAL'};if(code==='22'||/生技|醫療|製藥|藥品|生物科技|醫材/.test(name))return {key:'BIOTECH'};return {key:'OK'};}
function normalize(report,snapshotDate,quote){const source=report?.dailySeries;if(!Array.isArray(source)||source.length<RULE.minBars)return invalid(`完整已收盤日K少於${RULE.minBars}根`);const rows=[];let previous='';for(const item of source){const d=date(item?.date),open=number(item?.open),high=number(item?.high),low=number(item?.low),close=number(item?.close),volume=number(item?.volume);if(!d||d<=previous||!(open>0&&high>0&&low>0&&close>0&&volume!==null&&volume>=0)||high<Math.max(open,low,close)||low>Math.min(open,high,close))return invalid('日K日期、順序或OHLCV資料不完整／不合理');rows.push({date:d,open,high,low,close,volume});previous=d;}
 const final=rows.at(-1),reportDate=date(report?.closeDate),marketDate=date(snapshotDate);if(!reportDate||!marketDate||final.date!==reportDate||reportDate!==marketDate)return invalid(`市場／個股／日K資料日期不一致：${marketDate||'-'}／${reportDate||'-'}／${final.date}`);const displayed=number(report?.close),market=number(quote?.close),quoteDate=date(quote?.quoteDate);if(!(displayed>0&&market>0)||quoteDate!==marketDate||Math.abs(displayed-final.close)>Math.max(.02,final.close*.0001)||Math.abs(market-final.close)>Math.max(.02,final.close*.0001))return invalid('市場報價、個股收盤與日K收盤不同價／不同日');const qv=number(quote?.volume);if(!(qv>0)||!(final.volume>0))return invalid(`同日成交量缺失：${marketDate}`);if(Math.abs(qv-final.volume)>Math.max(100,qv*.02)){const ratio=qv/final.volume;return invalid(`同日市場與個股日K成交量不一致：市場 ${qv} 股／日K ${final.volume} 股（比值 ${ratio.toFixed(3)}）`);}return {status:'OK',rows,date:marketDate};}
function detect(rows){if(!W?.analyzeBars)return {status:'DATA',eligible:false,reason:'新版量價波段核心未載入'};const a=W.analyzeBars(rows);if(!a.ok)return {status:'DATA',eligible:false,reason:a.reason,wave:a};const g=W.grade(a);if(g.key==='REJECT')return {status:'REJECT',eligible:false,reason:a.risk.join('、')||'量價結構轉弱',wave:a};if((a.gap21Pct||0)>RULE.maxGap21Pct)return {status:'REJECT',eligible:false,reason:`離21日線 ${a.gap21Pct.toFixed(1)}%，位置過高，避免追價`,wave:a};if(g.key==='WATCH')return {status:'REJECT',eligible:false,reason:'目前仍在等待區，三盤／量潮／均線條件尚未同時成熟',wave:a};return {status:g.key,label:g.label,eligible:true,reason:a.plain,wave:a,score:a.score,close:a.close,trigger:a.trigger,support:a.support,referenceHigh:a.prior2High,volumeMultiple:a.mv5>0?a.bars.at(-1).volume/a.mv5:null,ma21GapPct:a.gap21Pct,ma20GapPct:a.gap21Pct,closePosition:a.closePosition,phase:a.phase,phaseLabel:a.phaseLabel,threeBreakout:a.threeBreakout,threeBreakdown:a.threeBreakdown,maText:a.maText,mvText:a.mvText,fib:a.fib,fibTieRank:a.fibTieRank,evidence:a.evidence,risk:a.risk};}
function evaluate(report,marketDate,quote){const verified=normalize(report,marketDate,quote);if(verified.status!=='OK')return verified;const found=detect(verified.rows);if(!found.eligible)return found;return {...found,model:MODEL,date:verified.date,code:String(report.stock||report.code||''),name:String(report.name||report.stock||report.code||''),report};}
function compare(a,b){const pri={S:0,A:1,B:2};return (pri[a.status]??9)-(pri[b.status]??9)||b.score-a.score||((b.wave?.volumeStart?1:0)-(a.wave?.volumeStart?1:0))||(a.fibTieRank??6)-(b.fibTieRank??6)||a.code.localeCompare(b.code);}
function backtest(bars,signalIndex,horizon=5){if(!Array.isArray(bars)||signalIndex<2||signalIndex>=bars.length-1||!(horizon>0))return {status:'UNAVAILABLE',reason:'缺少下一交易日開盤價'};if(signalIndex+1+horizon-1>=bars.length)return {status:'UNFINISHED',reason:'後續完整交易日未達觀察期間'};const entry=number(bars[signalIndex+1]?.open),exit=number(bars[signalIndex+horizon]?.close);if(!(entry>0&&exit>0))return {status:'UNAVAILABLE',reason:'進出場量價缺失'};return {status:'COMPLETE',entryDate:date(bars[signalIndex+1].date),entry,exit,horizon,returnPct:(exit/entry-1)*100,method:'訊號次一交易日開盤→第N交易日收盤；未含成本與滑價'};}
return Object.freeze({MODEL,RULE,number,date,validateMarket,marketClosedStateV49,officialIndustry,normalize,detect,evaluate,compare,backtest});
});
