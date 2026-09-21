/* 強勢標股濾網 V47: isolated, closed-daily-bar strategy. No changes to existing scanners. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShitouStrongStockFilterV47 = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const MODEL = 'STRONG_STOCK_FILTER_V47_INDEPENDENT';
  const RULE = Object.freeze({lookback: 20, nearHighPct: 3, breakoutVolumeMultiple: 1.3,
    closePositionMin: 0.7, contractionMultiple: 0.9, maxMa20GapPct: 12,
    maxContinuationExtensionPct: 8, maxContinuationAge: 3, minTradeValue: 10000000});
  const invalid = reason => ({status:'DATA', eligible:false, reason});
  const number = value => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(typeof value === 'string' ? value.replace(/,/g,'') : value);
    return Number.isFinite(n) ? n : null;
  };
  function date(value) {
    const m = String(value ?? '').trim().match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
    if (!m) return null;
    const out=`${m[1]}-${m[2]}-${m[3]}`;
    const d=new Date(out+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===out ? out : null;
  }
  function dateSafe(value) {
    try { return date(value); } catch (_) { return null; }
  }
  function validateMarket(meta, marketRowCount, now = new Date()) {
    if (!meta || meta.marketCoverageReady !== true || meta.industryCoverageReady !== true)
      return {ok:false,reason:'上市、上櫃完整市場或官方產業覆蓋尚未確認'};
    const target=dateSafe(meta.targetTradeDate || meta.completedTradeDate),
      completed=dateSafe(meta.completedTradeDate || meta.targetTradeDate),
      twse=dateSafe(meta.twseQuoteDate),tpex=dateSafe(meta.tpexQuoteDate);
    if (!target || !completed || !twse || !tpex || new Set([target,completed,twse,tpex]).size !== 1)
      return {ok:false,reason:'市場、上市、上櫃交易日不一致或日期缺失'};
    const count=number(meta.total);
    if (count===null || count!==marketRowCount || count<1000)
      return {ok:false,reason:'市場快照筆數不足或與中繼資料不一致'};
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
    const get=k=>parts.find(p=>p.type===k)?.value;
    const today=`${get('year')}-${get('month')}-${get('day')}`;
    const minutes=Number(get('hour'))*60+Number(get('minute'));
    if (today===target && minutes<17*60+35)
      return {ok:false,reason:'當日盤後資料整理期間；建議 17:35 後再查詢'};
    if (target>today) return {ok:false,reason:'市場快照日期在未來'};
    // Do not silently reuse an old trading day when the current day's official close is due.
    if (target!==today && minutes>=15*60 && new Date(today+'T00:00:00Z').getUTCDay()>=1 && new Date(today+'T00:00:00Z').getUTCDay()<=5)
      return {ok:false,reason:`目前仍是 ${target} 舊市場快照，尚未取得 ${today} 最新盤後資料`};
    return {ok:true,date:target};
  }
  function officialIndustry(record) {
    const code=String(record?.industryCode ?? '').trim();
    const name=String(record?.industryName || record?.industry || '').trim();
    if (!code && !name) return {key:'UNKNOWN',reason:'官方產業別缺失'};
    if (code==='17'||/金融|銀行|保險|證券|金控/.test(name)) return {key:'FINANCIAL'};
    if (code==='22'||/生技|醫療|製藥|藥品|生物科技|醫材/.test(name)) return {key:'BIOTECH'};
    return {key:'OK'};
  }
  function normalize(report, snapshotDate, quote) {
    const source=report?.dailySeries;
    if (!Array.isArray(source) || source.length<42) return invalid('完整已收盤日K少於42根');
    const rows=[];
    let previous='';
    for(const item of source) {
      const d=dateSafe(item?.date),open=number(item?.open),high=number(item?.high),low=number(item?.low),close=number(item?.close),volume=number(item?.volume);
      if (!d || d<=previous || !(open>0 && high>0 && low>0 && close>0 && volume!==null && volume>=0) ||
          high<Math.max(open,low,close) || low>Math.min(open,high,close)) return invalid('日K日期、順序或OHLCV資料不完整／不合理');
      rows.push({date:d,open,high,low,close,volume});previous=d;
    }
    const final=rows.at(-1),reportDate=dateSafe(report?.closeDate),marketDate=dateSafe(snapshotDate);
    if (!reportDate || !marketDate || final.date!==reportDate || reportDate!==marketDate)
      return invalid(`市場／個股／日K資料日期不一致：${marketDate||'-'}／${reportDate||'-'}／${final.date}`);
    const displayed=number(report?.close),market=number(quote?.close),quoteDate=dateSafe(quote?.quoteDate);
    if (!(displayed>0 && market>0) || quoteDate!==marketDate ||
        Math.abs(displayed-final.close)>Math.max(0.02,final.close*0.0001) ||
        Math.abs(market-final.close)>Math.max(0.02,final.close*0.0001))
      return invalid('市場報價、個股收盤與日K收盤不同價／不同日');
    // Preserve historical OHLCV as-is. Never guess a 1,000x conversion from a ratio:
    // venue-specific lots/shares and asynchronous official updates require provenance.
    const dailyUnit=String(report?.dailySeriesMeta?.volumeUnit||'shares (legacy FIB dailySeries)').trim();
    const marketUnit=String(quote?.volumeUnit||'shares (Market Worker canonical)').trim();
    if(!/shares|股/i.test(dailyUnit)||!/shares|股/i.test(marketUnit))
      return invalid(`成交量單位不能確認：市場 ${marketUnit}／日K ${dailyUnit}；不自動乘除1000`);
    const quoteVolume=number(quote?.volume);
    if(!(quoteVolume>0) || !(final.volume>0))
      return invalid(`同日成交量缺失：${marketDate} 市場 ${quoteVolume??'-'} 股／日K ${final.volume??'-'} 股`);
    if(Math.abs(quoteVolume-final.volume)>Math.max(100,quoteVolume*.02)){
      const ratio=quoteVolume/final.volume;
      const hint=(ratio>950&&ratio<1050)||(ratio>.00095&&ratio<.00105)?'；疑似股／張單位差，需核對來源，未自動轉換':'';
      return invalid(`同日市場與個股日K成交量不一致：${marketDate} 市場 ${quoteVolume} 股／日K ${final.volume} 股（比值 ${ratio.toFixed(3)}）${hint}`);
    }
    return {status:'OK',rows,date:marketDate};
  }
  const average=(rows,key)=>rows.reduce((sum,row)=>sum+row[key],0)/rows.length;
  const high20=(rows,i)=>Math.max(...rows.slice(i-20,i).map(row=>row.high));
  const volume20=(rows,i)=>average(rows.slice(i-20,i),'volume');
  const barPosition=bar=>bar.high===bar.low?0:(bar.close-bar.low)/(bar.high-bar.low);
  function breakout(rows,i) {
    if(i<20) return null;
    const bar=rows[i],ref=high20(rows,i),mean=volume20(rows,i);
    if(!(mean>0))return null;
    const multiple=bar.volume/mean;
    return bar.close>ref && multiple>=RULE.breakoutVolumeMultiple && barPosition(bar)>=RULE.closePositionMin
      ? {date:bar.date,price:ref,close:bar.close,multiple,index:i} : null;
  }
  function detect(rows) {
    const i=rows.length-1,current=rows[i],prior=rows[i-1],twenty=rows.slice(i-20,i),ref=high20(rows,i),mean=volume20(rows,i);
    const ma20=average(rows.slice(-20),'close'),maPrev=average(rows.slice(-21,-1),'close');
    const gapPct=ma20>0?(current.close/ma20-1)*100:null;
    const currentMultiple=mean>0?current.volume/mean:null;
    if (!ma20 || currentMultiple===null) return {status:'DATA',reason:'近20日均價或均量缺失'};
    const shared={close:current.close,volume:current.volume,ma20,ma20GapPct:gapPct,ma20Slope:ma20-maPrev,
      referenceHigh:ref,volumeMultiple:currentMultiple,closePosition:barPosition(current)};
    if(gapPct>RULE.maxMa20GapPct) return {status:'REJECT',reason:'距20日均線過遠，追價風險過高',...shared};
    const nowB=breakout(rows,i);
    if(nowB){
      const priorSame=Array.from({length:5},(_,k)=>i-1-k).some(j=>breakout(rows,j));
      if(priorSame)return {status:'REJECT',reason:'前5根日K已發生有效突破，不屬首次起漲',...shared};
      return {status:'B',label:'首次起漲',breakout:nowB,breakoutPrice:nowB.price,breakoutDate:nowB.date,
        support:nowB.price,trigger:nowB.price,reason:'首次收盤突破前20日高點、量比達標且收盤靠近高點',...shared};
    }
    for(let age=1;age<=RULE.maxContinuationAge;age++){
      const j=i-age,b=breakout(rows,j);
      if(!b)continue;
      const valid=rows.slice(j+1,i+1).every(row=>row.close>=b.price);
      if(!valid)return {status:'REJECT',reason:'突破後曾收盤跌破原始突破價，續攻資格失效',breakoutPrice:b.price,breakoutDate:b.date,...shared};
      const extension=(current.close/b.close-1)*100;
      if(extension>RULE.maxContinuationExtensionPct)return {status:'REJECT',reason:'突破後漲幅過大，避免追高',breakoutPrice:b.price,breakoutDate:b.date,...shared};
      return {status:'C',label:'突破後續攻',breakout:b,breakoutPrice:b.price,breakoutDate:b.date,
        age,support:b.price,trigger:Math.max(prior.high,current.high),reason:`沿用 ${b.date} 原始突破價；突破後第${age}日收盤仍守住`,...shared};
    }
    const last5=rows.slice(i-4,i+1),prev15=rows.slice(i-19,i-4);
    const avgRange=list=>average(list.map(x=>({...x,spread:(x.high-x.low)/x.close})),'spread');
    const contraction=avgRange(last5)<=avgRange(prev15)*RULE.contractionMultiple;
    const near=current.close<ref && current.close>=ref*(1-RULE.nearHighPct/100);
    const volumeNormal=current.volume<=mean*RULE.breakoutVolumeMultiple;
    // A candle that pierced the level intraday and closed below is a possible failed breakout, not an early setup.
    const failedIntradayBreak=current.high>ref*1.005&&current.close<ref;
    if(near&&contraction&&volumeNormal&&!failedIntradayBreak&&current.close>=ma20){
      return {status:'A',label:'準備起漲',support:Math.min(...last5.map(x=>x.low)),trigger:ref,
        reason:'距前20日高點3%內、近5日振幅收斂且未異常放量',...shared};
    }
    return {status:'REJECT',reason:failedIntradayBreak?'盤中穿越前高但收盤跌回，疑似假突破':near?'接近壓力但量能／波動收斂條件未達標':'不符合A/B/C型態',...shared};
  }
  function evaluate(report,marketDate,quote) {
    const verified=normalize(report,marketDate,quote);
    if(verified.status!=='OK')return verified;
    const found=detect(verified.rows);
    if(!['A','B','C'].includes(found.status))return {eligible:false,...found};
    const near=found.referenceHigh>0 ? (found.close/found.referenceHigh-1)*100 : null;
    const quality=Math.min(99,Math.max(0,Math.round(({B:82,A:76,C:72}[found.status])+
      Math.min(8,Math.max(0,(found.volumeMultiple-1)*8))+
      Math.min(6,Math.max(0,found.closePosition-.5)*12)-
      Math.max(0,found.ma20GapPct-7)*2)));
    return {eligible:true,...found,score:quality,nearHighPct:near,model:MODEL,date:verified.date,
      code:String(report.stock||report.code||''),name:String(report.name||report.stock||report.code||''),
      report};
  }
  function compare(a,b) {
    const pri={B:0,A:1,C:2};
    return pri[a.status]-pri[b.status] || b.score-a.score || b.volumeMultiple-a.volumeMultiple || a.code.localeCompare(b.code);
  }
  // Research-only retrospective: next completed day's open; unfinished horizons are never wins/losses.
  function backtest(bars,signalIndex,horizon=5) {
    if(!Array.isArray(bars)||signalIndex<20||signalIndex>=bars.length-1||!(horizon>0))return {status:'UNAVAILABLE',reason:'缺少下一交易日開盤價'};
    if(signalIndex+1+horizon-1>=bars.length)return {status:'UNFINISHED',reason:'後續完整交易日未達觀察期間'};
    const entry=number(bars[signalIndex+1]?.open),exit=number(bars[signalIndex+horizon]?.close);
    if(!(entry>0&&exit>0))return {status:'UNAVAILABLE',reason:'進出場量價缺失'};
    return {status:'COMPLETE',entryDate:dateSafe(bars[signalIndex+1].date),entry,exit,
      horizon,returnPct:(exit/entry-1)*100,method:'訊號次一交易日開盤→第N交易日收盤；未含成本與滑價'};
  }
  return Object.freeze({MODEL,RULE,number,date:dateSafe,validateMarket,officialIndustry,normalize,detect,evaluate,compare,backtest});
});
