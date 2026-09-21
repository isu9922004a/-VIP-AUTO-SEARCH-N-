(async function(){
  const done=(result)=>{
    const el=document.createElement('pre');el.id='strongStockBrowserEvidence';el.textContent=JSON.stringify(result);document.body.append(el);
    document.documentElement.dataset.strongStockBrowser=result.ok?'PASS':'FAIL';
  };
  const checks=[];
  const assert=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
  try{
    const S=window.ShitouStrongStockFilterV47,U=window.STRONG_STOCK_TEST_API_V47;
    assert('Original scanners remain callable',typeof window.runMomentumScanV3769==='function'&&typeof window.runDayTradeScanV1==='function');
    assert('Original image rendering remains callable',typeof window.generateDayTradeImageV1==='function'&&typeof window.generateMomentumScanImageV3762==='function');
    assert('Third entry and output actions mounted',!!document.getElementById('strongStockScanButton')&&!!document.getElementById('strongStockAllImage')&&!!document.getElementById('strongStockTopImage'));
    assert('Third image pages use existing preview infrastructure',typeof window.strongStockShowPagesV47==='function');
    const finalDay='2026-09-21',rows=[];
    for(let i=0;i<44;i++){
      const date=new Date(Date.UTC(2026,7,9+i)).toISOString().slice(0,10);
      rows.push({date,open:100,high:101,low:99,close:100,volume:1000});
    }
    rows[43]={date:finalDay,open:100,high:103,low:99,close:102,volume:1700};
    const report={stock:'1101',code:'1101',name:'台泥',closeDate:finalDay,close:102,dailySeries:rows};
    const candidate=S.evaluate(report,finalDay,{close:102,volume:1700,quoteDate:finalDay});
    assert('Browser strategy detects confirmed B',candidate.eligible&&candidate.status==='B',candidate.status);
    const list=Array.from({length:9},(_,i)=>({...candidate,code:String(1101+i),name:'測試股票'+i}));
    const scan={dataDate:finalDay,createdAt:'2026/09/21 18:00',universe:1800,unparsed:0,quick:9,total:9,done:9,deferred:0,pending:0,data:0,failed:0,rejected:0,completed:true,audit:{financial:0,biotech:0,unknown:0,invalidQuote:0,missingLiquidity:0,illiquid:0},counts:{A:0,B:9,C:0},candidates:list,issues:[]};
    U.render(scan);
    assert('All nine candidates are rendered in text',document.querySelectorAll('#strongStockList .strong-stock-row').length===9);
    const top=U.images(scan,false),all=U.images(scan,true);
    assert('Top eight exactly eight',top.length===1&&JSON.parse(decodeURIComponent(top[0].dataset.strongStockAudit)).codes.length===8);
    const audits=all.map(page=>JSON.parse(decodeURIComponent(page.dataset.strongStockAudit)));
    assert('Full reports include all nine exactly once',all.length===2&&audits.flatMap(x=>x.codes).join(',')===list.map(x=>x.code).join(','));
    assert('Native iPhone 12 Pro Max page dimensions',all.every(page=>page.width===1284&&page.height===2778));
    assert('Canvas rasterization succeeds',top[0].toDataURL('image/png').startsWith('data:image/png;base64,'));
    assert('Image and text share immutable scan dates',U.buildText(scan).includes(finalDay)&&audits.every(a=>a.date===finalDay));
    const fakeBundle={snapshotRows:1800,meta:{marketCoverageReady:true,industryCoverageReady:true,targetTradeDate:'20260921',completedTradeDate:'20260921',twseQuoteDate:'20260921',tpexQuoteDate:'20260921',total:1800},
      map:new Map([['1101',{code:'1101',open:100,high:103,low:99,close:102,volume:1700,tradeValue:30000000,closePos:.75,pct:1.1,quoteDate:'20260921'}],['2881',{code:'2881',open:10,high:11,low:9,close:10,volume:20000,tradeValue:30000000,quoteDate:'20260921'}],['6547',{code:'6547',open:10,high:11,low:9,close:10,volume:20000,tradeValue:30000000,quoteDate:'20260921'}]]),
      sectorMap:new Map([['1101',{industryCode:'01',industryName:'水泥工業'}],['2881',{industryCode:'17',industryName:'金融保險'}],['6547',{industryCode:'22',industryName:'生技醫療'}]])};
    const pool=U.marketPool(fakeBundle,140);
    assert('Full-market pre-exclusion and accounting',pool.deep.length===1&&pool.audit.financial===1&&pool.audit.biotech===1);
    const RealDate=window.Date;
    window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-09-21T10:00:00Z']));}};
    const oldMarket=window.loadDayTradeMarketBundleV377736,oldDeep=window.fetchDeepBatchViaMarketWorkerV3768;
    window.loadDayTradeMarketBundleV377736=async()=>fakeBundle;
    window.fetchDeepBatchViaMarketWorkerV3768=async items=>({type:'MOMENTUM_DEEP_SCAN',results:items.map(item=>({code:item.code,ok:true,data:report}))});
    try{
      await window.runStrongStockScanV47();
      const result=U.getLast();
      assert('Mocked complete scanning yields one correctly classified stock',result&&result.candidates.length===1&&result.done===1&&result.completed===true);
      assert('Run uses identical snapshot in final audit',result?.dataDate===finalDay&&U.buildText(result).includes(finalDay));
      window.fetchDeepBatchViaMarketWorkerV3768=async()=>({type:'MOMENTUM_DEEP_SCAN',results:[]});
      await window.runStrongStockScanV47();
      const degraded=U.getLast();
      assert('Missing worker data never becomes market-wide zero candidates',degraded?.failed===1&&degraded.completed===false&&document.getElementById('strongStockSummary').textContent.includes('不能宣稱全市場零候選'));
    } finally {window.Date=RealDate;window.loadDayTradeMarketBundleV377736=oldMarket;window.fetchDeepBatchViaMarketWorkerV3768=oldDeep;}
    done({ok:checks.every(c=>c.pass),checks});
  }catch(error){done({ok:false,checks,error:String(error?.stack||error)});}
})();
