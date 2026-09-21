'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../strong-stock-filter-v47.js');
let count=0;const check=(label,callback)=>{callback();count++;console.log('PASS '+label);};
const elements=new Map();const el=id=>{
 if(!elements.has(id))elements.set(id,{id,textContent:'',innerHTML:'',style:{},disabled:false,value:id==='strongStockDeepLimit'?'140':'',dataset:{}});
 return elements.get(id);
};
let imageCalls=[],clipboardText='';
const document={getElementById:el,fonts:{ready:Promise.resolve()},body:{appendChild(){},removeChild(){}},createElement(tag){
 if(tag==='canvas'){
  const c={width:0,height:0,dataset:{},toBlob(fn){fn(new Blob(['fake PNG'],{type:'image/png'}));},toDataURL(){return 'data:image/png;base64,AAA';}};
  const ctx={fillStyle:'',fillRect(){},fillText(){},measureText(text){return {width:String(text).length*9}},createLinearGradient(){return {addColorStop(){}}}};
  c.getContext=()=>ctx;return c;
 }
 return {style:{},click(){},remove(){},setAttribute(){},appendChild(){},dataset:{}};
}};
const rows=Array.from({length:44},(_,i)=>({date:new Date(Date.UTC(2026,7,9+i)).toISOString().slice(0,10),open:100,high:101,low:99,close:100,volume:1000}));
rows.at(-1).date='2026-09-21';Object.assign(rows.at(-1),{high:103,close:102,volume:1700});
const report={stock:'1101',name:'台泥',closeDate:'2026-09-21',close:102,dailySeries:rows};
const quote={code:'1101',close:102,open:100,high:103,low:99,volume:1700,tradeValue:30000000,closePos:.75,pct:1.1,quoteDate:'20260921'};
const bundle={snapshotRows:1800,meta:{marketCoverageReady:true,industryCoverageReady:true,targetTradeDate:'20260921',completedTradeDate:'20260921',twseQuoteDate:'20260921',tpexQuoteDate:'20260921',total:1800},
 map:new Map([['1101',quote],['2881',{...quote,code:'2881'}],['6547',{...quote,code:'6547'}]]),
 sectorMap:new Map([['1101',{industryCode:'01',industryName:'水泥工業'}],['2881',{industryCode:'17',industryName:'金融保險'}],['6547',{industryCode:'22',industryName:'生技醫療'}]])};
const DateFixed=class extends Date{constructor(...args){super(...(args.length?args:['2026-09-21T10:00:00Z']));}};
const ctx={document,Date:DateFixed,Intl,Blob,URL:{createObjectURL:()=>'/test-blob',revokeObjectURL(){}},navigator:{clipboard:{writeText:async value=>{clipboardText=value;},write:async()=>{}}},ClipboardItem:class {},
 setTimeout:callback=>{callback();return 1;},clearTimeout(){},console,
 ShitouStrongStockFilterV47:F,LOCAL_NAME_MAP:{1101:'台泥',2881:'國泰金',6547:'高端疫苗'},
 dayTradeScanRunningV1:false,momentumScanRunningV3762:false,taipeiStampV3762:()=> '2026/09/21 18:00',
 loadDayTradeMarketBundleV377736:async()=>bundle,
 fetchDeepBatchViaMarketWorkerV3768:async items=>({type:'MOMENTUM_DEEP_SCAN',results:items.map(item=>({code:item.code,ok:true,data:report}))}),
 strongStockShowPagesV47:async (pages,options)=>{imageCalls.push({pages,options});return {pages};},
 applyAntiTheftWatermarkV3761:()=>{},fitScanTextV3762:()=>{},
};
ctx.window=ctx;vm.runInNewContext(fs.readFileSync('strong-stock-ui-v47.js','utf8'),ctx,{filename:'strong-stock-ui-v47.js'});
(async()=>{
 check('original industry exclusions yield only real eligible deep scans',()=>{
  const p=ctx.STRONG_STOCK_TEST_API_V47.marketPool(bundle,140);
  assert.equal(p.deep.length,1);assert.equal(p.audit.financial,1);assert.equal(p.audit.biotech,1);
  const noValue={...bundle,map:new Map([['1101',{...quote,tradeValue:null}]])};
  const missing=ctx.STRONG_STOCK_TEST_API_V47.marketPool(noValue,140);assert.equal(missing.audit.missingLiquidity,1);assert.equal(missing.audit.illiquid,0);
 });
 await ctx.runStrongStockScanV47();const scan=ctx.STRONG_STOCK_TEST_API_V47.getLast();
 check('complete scan classifies B and retains source date',()=>{
  assert.equal(scan.candidates.length,1);assert.equal(scan.candidates[0].status,'B');assert.equal(scan.completed,true);assert.equal(scan.dataDate,'2026-09-21');
  assert.equal(el('momentumScanButton').disabled,false);assert.equal(el('dayTradeScanButton').disabled,false);
 });
 check('full funnel counts do not invent whole-market coverage',()=>{
  assert.equal(scan.universe,1800);assert.equal(scan.quick,1);assert.equal(scan.total,1);assert.equal(scan.audit.financial+scan.audit.biotech,2);
  assert.match(el('strongStockSummary').textContent,/完整市場 1800/);
 });
 await ctx.copyStrongStockTextV47();
 check('text clipboard includes full candidate and matching source date',()=>{
  assert.match(clipboardText,/1101/);assert.match(clipboardText,/2026-09-21/);assert.match(clipboardText,/END-OF-STRONG-STOCK-REPORT-V47/);
 });
 const candidates=Array.from({length:9},(_,i)=>({...scan.candidates[0],code:String(1101+i),name:i===0?'<img src=x onerror=alert(1)>':'測試'+i}));
 const whole={...scan,candidates,counts:{A:0,B:9,C:0}};
 ctx.STRONG_STOCK_TEST_API_V47.render(whole);
 check('rendered names are HTML-escaped and all nine appear',()=>{
  assert.match(el('strongStockList').innerHTML,/&lt;img/);
  assert.equal((el('strongStockList').innerHTML.match(/strong-stock-row/g)||[]).length,9);
 });
 const pages=ctx.STRONG_STOCK_TEST_API_V47.images(whole,true);
 check('all candidate pages cover nine codes exactly once',()=>{
  assert.equal(pages.length,2);
  const audits=pages.map(x=>JSON.parse(decodeURIComponent(x.dataset.strongStockAudit)));
  assert.equal(audits.flatMap(a=>a.codes).join(","),candidates.map(c=>c.code).join(","));
  assert.ok(pages.every(p=>p.width===1284&&p.height===2778));
 });
 await ctx.showStrongStockImageV47(false,false);
 check('actual image action invokes common R45 preview',()=>{
  assert.equal(imageCalls.length,1);assert.equal(imageCalls[0].pages.length,1);assert.match(imageCalls[0].options.title,/前八名/);
 });
 ctx.fetchDeepBatchViaMarketWorkerV3768=async()=>({type:'MOMENTUM_DEEP_SCAN',results:[]});
 await ctx.runStrongStockScanV47();const partial=ctx.STRONG_STOCK_TEST_API_V47.getLast();
 check('missing worker report counted FAILED, no fabricated zero-market conclusion',()=>{
  assert.equal(partial.failed,1);assert.equal(partial.completed,false);
  assert.match(el('strongStockSummary').textContent,/不能宣稱全市場零候選/);
 });
 let releaseBundle;ctx.loadDayTradeMarketBundleV377736=()=>new Promise(resolve=>{releaseBundle=()=>resolve(bundle);});
 const inFlight=ctx.runStrongStockScanV47();
 check('third scan temporarily disables other scan buttons',()=>{
  assert.equal(el('momentumScanButton').disabled,true);assert.equal(el('dayTradeScanButton').disabled,true);
 });
 releaseBundle();await inFlight;
 check('other scan buttons restored after third scan',()=>{
  assert.equal(el('momentumScanButton').disabled,false);assert.equal(el('dayTradeScanButton').disabled,false);
 });
 console.log(`TOTAL ${count}/${count}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
