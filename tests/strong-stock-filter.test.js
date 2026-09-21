'use strict';
const assert=require('node:assert/strict');
const S=require('../strong-stock-filter-v47.js');
let count=0;
function check(label,run){run();count++;console.log('PASS '+label);}
const dates=Array.from({length:70},(_,i)=>new Date(Date.UTC(2026,4,1+i)).toISOString().slice(0,10));
function bars(n=44){return dates.slice(0,n).map(date=>({date,open:100,high:101,low:99,close:100,volume:1000}));}
function report(rows){return {stock:'1234',name:'測試股票',closeDate:rows.at(-1).date,close:rows.at(-1).close,dailySeries:rows};}
function evaluate(rows){return S.evaluate(report(rows),rows.at(-1).date,{close:rows.at(-1).close,volume:rows.at(-1).volume,quoteDate:rows.at(-1).date});}
function bSetup(n=44){const rows=bars(n);rows[n-1]={...rows.at(-1),open:100,high:103,low:99,close:102,volume:1600};return rows;}
const meta={marketCoverageReady:true,industryCoverageReady:true,targetTradeDate:'20260921',completedTradeDate:'20260921',twseQuoteDate:'20260921',tpexQuoteDate:'20260921',total:1800};
check('official industry exclusion (no name heuristics)',()=>{
 assert.equal(S.officialIndustry({industryCode:'17',industryName:'金融保險業'}).key,'FINANCIAL');
 assert.equal(S.officialIndustry({industryCode:'22',industryName:'生技醫療業'}).key,'BIOTECH');
 assert.equal(S.officialIndustry({industryName:'科技業'}).key,'OK');
 assert.equal(S.officialIndustry({}).key,'UNKNOWN');
});
check('after close, aligned dates and full coverage',()=>{
 assert.equal(S.validateMarket(meta,1800,new Date('2026-09-21T10:00:00Z')).ok,true);
 assert.equal(S.validateMarket(meta,1800,new Date('2026-09-21T08:00:00Z')).ok,false);
 assert.equal(S.validateMarket({...meta,tpexQuoteDate:'20260918'},1800,new Date('2026-09-21T10:00:00Z')).ok,false);
 assert.equal(S.validateMarket({...meta,total:1500},1800,new Date('2026-09-21T10:00:00Z')).ok,false);
 assert.equal(S.validateMarket({...meta,industryCoverageReady:false},1800,new Date('2026-09-21T10:00:00Z')).ok,false);
 assert.equal(S.validateMarket({...meta,targetTradeDate:'20260918',completedTradeDate:'20260918',twseQuoteDate:'20260918',tpexQuoteDate:'20260918'},1800,new Date('2026-09-21T10:00:00Z')).ok,false);
});
check('reject incomplete, stale, unsorted and inconsistent daily bar inputs',()=>{
 let rows=bSetup();assert.equal(evaluate(rows).status,'B');
 let bad=rows.map(x=>({...x}));bad.at(-1).volume=null;assert.equal(evaluate(bad).status,'DATA');
 bad=rows.map(x=>({...x}));bad.at(-1).date=bad.at(-2).date;assert.equal(evaluate(bad).status,'DATA');
 bad=rows.map(x=>({...x}));assert.equal(S.evaluate(report(bad),'2026-09-20',{close:102,volume:1600,quoteDate:'2026-09-20'}).status,'DATA');
 bad=rows.map(x=>({...x}));assert.equal(S.evaluate(report(bad),bad.at(-1).date,{close:100,volume:1600,quoteDate:bad.at(-1).date}).status,'DATA');
 assert.equal(evaluate(rows.slice(-30)).status,'DATA');
});
check('market quote volume must match completed individual daily bars',()=>{
 const rows=bSetup(),r=report(rows);
 assert.equal(S.evaluate(r,rows.at(-1).date,{close:102,volume:3500,quoteDate:rows.at(-1).date}).status,'DATA');
});
check('intraday spike above prior high followed by failed close is not setup A',()=>{
 const rows=bars();for(let i=0;i<rows.length;i++){
  rows[i].high=i<rows.length-5?105:104.4;
  rows[i].low=i<rows.length-5?98:103.3;
  rows[i].open=i<rows.length-5?101:103.8;
  rows[i].close=i<rows.length-5?102:104;
 }
 rows.at(-1).high=106;
 const out=evaluate(rows);assert.equal(out.status,'REJECT');assert.match(out.reason,/假突破/);
});
check('first breakout compares preceding 20 bars, excludes signal bar',()=>{
 const rows=bSetup(),result=evaluate(rows);assert.equal(result.status,'B');assert.equal(result.breakoutPrice,101);
 assert.equal(result.breakoutDate,rows.at(-1).date);assert.ok(result.volumeMultiple>=1.3);
});
check('A is explicitly not labelled confirmed breakout',()=>{
 const rows=bars();for(let i=0;i<rows.length;i++){rows[i].high=i<rows.length-5?105:104.4;rows[i].low=i<rows.length-5?98:103.3;rows[i].open=i<rows.length-5?101:103.8;rows[i].close=i<rows.length-5?102:104;}
 const result=evaluate(rows);assert.equal(result.status,'A');assert.equal(result.breakoutDate,undefined);assert.equal(result.trigger,105);
});
check('C retains original breakout level and rejects intervening breakdown',()=>{
 const rows=bSetup(43),initial=evaluate(rows);assert.equal(initial.status,'B');
 rows.push({...rows.at(-1),date:dates[43],open:102.2,high:103.4,low:101.2,close:102.5,volume:1050});
 const follow=evaluate(rows);assert.equal(follow.status,'C');assert.equal(follow.breakoutDate,initial.breakoutDate);assert.equal(follow.breakoutPrice,initial.breakoutPrice);
 rows.push({...rows.at(-1),date:dates[44],open:102,high:103,low:99,close:100,volume:1000});
 const failed=evaluate(rows);assert.equal(failed.status,'REJECT');
});
check('earlier effective B in past five cannot be mislabelled first breakout',()=>{
 const rows=bSetup(43);rows.push({...rows.at(-1),date:dates[43],open:102,high:106,low:101,close:105,volume:2300});
 assert.equal(evaluate(rows).status,'REJECT');
});
check('backtest enters next day open; final unfinished horizon not classified',()=>{
 const rows=bSetup(43);rows.push({...rows.at(-1),date:dates[43],open:103,close:104,high:105,low:102});
 assert.equal(S.backtest(rows,42,5).status,'UNFINISHED');
 for(let i=44;i<48;i++)rows.push({...rows.at(-1),date:dates[i],open:104,close:106,high:107,low:103});
 const test=S.backtest(rows,42,5);assert.equal(test.status,'COMPLETE');assert.equal(test.entry,103);assert.equal(test.exit,106);
});
console.log(`TOTAL ${count}/${count}`);
