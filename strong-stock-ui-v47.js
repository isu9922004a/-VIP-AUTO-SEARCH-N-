/* Strong Stock third strategy — UI, scan orchestration, independent report snapshot. */
(function(root){
  'use strict';
  const F=root.ShitouStrongStockFilterV47;
  if(!F)throw new Error('強勢標股濾網策略模組未載入');
  const BATCH=3,REQUEST_GAP=300,BATCH_GAP=700;
  let last=null,running=false,stopped=false;
  const id=key=>document.getElementById('strongStock'+key);
  const html=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=(value,digits=2)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value).toFixed(digits):'資料不足';
  const displayError=(text,type='error')=>{const el=id('Error');if(el){el.style.display='block';el.style.color=type==='warn'?'var(--yellow)':'var(--red)';el.textContent=text;}};
  const note=text=>{const el=id('Message');if(el)el.textContent=text;};
  function marketPool(bundle,limit){
    const audit={financial:0,biotech:0,unknown:0,invalidQuote:0,missingLiquidity:0,illiquid:0};const ready=[];
    for(const [code,q] of bundle.map){
      const industry=F.officialIndustry(bundle.sectorMap?.get(code));
      if(industry.key==='FINANCIAL'){audit.financial++;continue;}
      if(industry.key==='BIOTECH'){audit.biotech++;continue;}
      if(industry.key!=='OK'){audit.unknown++;continue;}
      if(!/^[1-9]\d{3}$/.test(code)||[q.open,q.high,q.low,q.close,q.volume].some(v=>!(v>0))){audit.invalidQuote++;continue;}
      if(F.number(q.tradeValue)===null){audit.missingLiquidity++;continue;}
      if(!(q.tradeValue>=F.RULE.minTradeValue)){audit.illiquid++;continue;}
      // This only chooses deep-analysis priority; no A/B/C eligibility is inferred from one daily quote.
      const stableRise=Math.min(5,Math.max(-5,Number(q.pct)||0));
      const priority=Math.log10(Math.max(1,q.tradeValue))*5 + (q.closePos||0)*5 + stableRise;
      ready.push({code,name:LOCAL_NAME_MAP?.[code]||code,q,priority});
    }
    ready.sort((a,b)=>b.priority-a.priority||(b.q.tradeValue||0)-(a.q.tradeValue||0)||a.code.localeCompare(b.code));
    return {deep:ready.slice(0,limit==='all'?ready.length:Number(limit)||140),deferred:ready.slice(limit==='all'?ready.length:Number(limit)||140),quick:ready.length,audit};
  }
  function evaluateResponse(item,x,marketDate){
    if(!x?.ok || !x.data)return {status:'FAILED',reason:String(x?.error||'深度分析未回傳完整個股資料')};
    const report=x.data,returned=String(report.stock||report.code||x.code||'');
    if(returned!==item.code)return {status:'DATA',reason:'回傳股票代號不符或缺失'};
    const result=F.evaluate(report,marketDate,item.q);
    if(result.eligible){result.code=item.code;result.name=LOCAL_NAME_MAP?.[item.code]||report.name||item.code;}
    return result;
  }
  const progress=(done,total,selected)=>{const t=id('ProgressText');if(t)t.textContent=`已分析 ${done}/${total}｜候選 ${selected}｜其餘合格快篩尚待深入分析`;const b=id('ProgressBar');if(b)b.style.width=`${total?Math.floor(done/total*100):0}%`;};
  function render(scan){
    const target=id('Result'),meta=id('Meta'),summary=id('Summary'),list=id('List');if(target)target.style.display='block';
    if(meta)meta.textContent=`市場日期 ${scan.dataDate}｜產生 ${scan.createdAt}｜來源：完整市場快照＋個股已收盤日K｜掃描範圍 ${scan.total} 檔`;
    if(summary){
      const a=scan.audit;
      summary.textContent=`完整市場 ${scan.universe}｜快篩合格 ${scan.quick}｜深入規劃 ${scan.total}｜實際分析 ${scan.done}｜範圍外未分析 ${scan.deferred}｜停止後未分析 ${scan.pending}｜金融排除 ${a.financial}｜生技排除 ${a.biotech}｜產業未知 ${a.unknown}｜無法解析行情 ${scan.unparsed}｜無效報價 ${a.invalidQuote}｜成交金額缺失 ${a.missingLiquidity}｜流動性不足 ${a.illiquid}｜資料不足 ${scan.data}｜服務失敗 ${scan.failed}｜實際未通過條件 ${scan.rejected}｜入選 ${scan.candidates.length}（A ${scan.counts.A}／B ${scan.counts.B}／C ${scan.counts.C}）｜${scan.completed?'預定範圍分析完畢':'部分分析未完成，不能宣稱全市場零候選'}。`;
    }
    if(list){
      if(!scan.candidates.length){list.textContent=scan.completed&&scan.deferred===0&&scan.data===0&&scan.failed===0&&scan.unparsed===0&&scan.audit.unknown===0&&scan.audit.invalidQuote===0&&scan.audit.missingLiquidity===0?'完整掃描範圍內沒有符合A／B／C的股票；不代表隔日不會上漲。':'目前沒有已確認候選；尚有未分析或資料異常股票，不能視為全市場零候選。';}
      else list.innerHTML=scan.candidates.map((c,i)=>`<div class="rule strong-stock-row"><div><strong>#${i+1}　${html(c.name)}（${html(c.code)}）｜${html(c.status)} ${html(c.label)}</strong><br>收盤 <b>${fmt(c.close)}</b>｜獨立篩選排序分 ${fmt(c.score,0)}（非勝率）｜${html(c.date)}<br>觀察價 ${fmt(c.trigger)}｜防守參考 ${fmt(c.support)}｜量比 ${fmt(c.volumeMultiple)} 倍｜MA20乖離 ${fmt(c.ma20GapPct)}%</div><div class="meta">${html(c.reason)}${c.breakoutDate?`｜原始突破日 ${html(c.breakoutDate)}／突破價 ${fmt(c.breakoutPrice)}`:''}。隔日仍需核對行情，並非直接開盤買進。</div></div>`).join('');
    }
    const top=id('TopImage'),all=id('AllImage');if(top)top.disabled=!scan.candidates.length;if(all)all.disabled=!scan.candidates.length;
  }
  function buildText(scan){
    const lines=['石頭少爺 Agent｜第三套「強勢標股濾網」完整盤後報告',`市場交易日：${scan.dataDate}｜產生：${scan.createdAt}`,
      '先記分，再按查詢；請確認市場及個股日期一致。僅供下一交易日觀察，不是進場或獲利保證。',
      `全市場${scan.universe}｜快篩${scan.quick}｜規劃深入${scan.total}｜完成${scan.done}｜範圍外${scan.deferred}｜停止後${scan.pending}`,
      `金融排除${scan.audit.financial}｜生技排除${scan.audit.biotech}｜產業不明${scan.audit.unknown}｜未解析行情${scan.unparsed}｜報價無效${scan.audit.invalidQuote}｜成交金額缺失${scan.audit.missingLiquidity}｜流動性不足${scan.audit.illiquid}`,
      `資料不足${scan.data}｜服務失敗${scan.failed}｜確定不符${scan.rejected}｜候選${scan.candidates.length}｜A${scan.counts.A}／B${scan.counts.B}／C${scan.counts.C}`,
      scan.completed?'所選深入分析範圍已完成；範圍外並未判讀。':'此次未完成：不能將資料缺失或未分析說成全市場零候選。',
      '篩選方法：A＝距前20日高點3%內、振幅收斂、未異常放量；B＝首次收盤突破前20日高點、量比≥1.3、收盤靠近高點；C＝1–3日內B後，仍守住原始突破價。',
      '僅使用完成日K；金融、生技依官方產業分類排除；資料不同日、缺漏或超限時如實標記；排序分不代表勝率。', '━━━━━━━━━━ 全部已入選股票 ━━━━━━━━━━'];
    scan.candidates.forEach((c,i)=>lines.push(`${i+1}. ${c.name}（${c.code}）｜${c.status} ${c.label}｜排序分 ${c.score}｜收盤 ${fmt(c.close)}｜日期 ${c.date}\n   觀察價 ${fmt(c.trigger)}｜防守參考 ${fmt(c.support)}｜前20日高點 ${fmt(c.referenceHigh)}｜今日量／20日均量 ${fmt(c.volumeMultiple)}倍｜距MA20 ${fmt(c.ma20GapPct)}%\n   突破日 ${c.breakoutDate||'未突破'}／原突破價 ${c.breakoutPrice?fmt(c.breakoutPrice):'未形成'}｜${c.reason}`));
    if(!scan.candidates.length)lines.push(scan.completed&&scan.deferred===0&&scan.data===0&&scan.failed===0&&scan.unparsed===0&&scan.audit.unknown===0&&scan.audit.invalidQuote===0&&scan.audit.missingLiquidity===0?'本次已分析股票均未入選。':'無已確認候選：尚有未分析／資料不足／服務失敗，禁止推論全市場不合格。');
    lines.push('━━━━━━━━━━ 失敗與資料不足（不計為淘汰） ━━━━━━━━━━');
    scan.issues.forEach(x=>lines.push(`${x.code} ${x.name}｜${x.status}｜${x.reason}`));
    if(scan.deferred)lines.push(`未深入分析：${scan.deferred} 檔，不能標記為不合格。`);
    if(scan.pending)lines.push(`掃描停止後未分析：${scan.pending} 檔。`);
    lines.push(`END-OF-STRONG-STOCK-REPORT-V47｜候選 ${scan.candidates.length}/${scan.candidates.length}`);
    return lines.join('\n');
  }
  async function run(){
    if(running||dayTradeScanRunningV1||momentumScanRunningV3762){displayError('已有選股任務執行中，請勿同時掃描。');return;}
    running=true;stopped=false;last=null;
    const button=id('ScanButton'),stop=id('StopButton'),result=id('Result'),err=id('Error'),limit=id('DeepLimit');
    // Disable original scan entry buttons only while this independent scan is running.
    const originalButtons=['momentumScanButton','dayTradeScanButton'].map(key=>document.getElementById(key)).filter(Boolean);
    const originalButtonState=originalButtons.map(element=>element.disabled);
    originalButtons.forEach(element=>element.disabled=true);
    if(button){button.disabled=true;button.textContent='取得正式盤後資料…';}if(stop)stop.disabled=false;if(limit)limit.disabled=true;
    if(result)result.style.display='none';if(err)err.style.display='none';note('');
    try{
      const bundle=await loadDayTradeMarketBundleV377736();
      const meta=bundle.meta||{},market=F.validateMarket(meta,bundle.snapshotRows,new Date());
      if(!market.ok)throw new Error(market.reason);
      const pool=marketPool(bundle,limit?.value||'140'),total=pool.deep.length;
      if(!total)throw new Error('無有效深度分析範圍；請檢查市場及產業資料');
      const candidates=[],issues=[];let done=0,data=0,failed=0,rejected=0;
      for(let from=0;from<total&&!stopped;from+=BATCH){
        const batch=pool.deep.slice(from,from+BATCH);
        if(button)button.textContent=`深度分析 ${done}/${total}…`;
        try{
          const payload=await fetchDeepBatchViaMarketWorkerV3768(batch,'FULL');
          const lookup=new Map((payload.results||[]).map(x=>[String(x.code||x.data?.stock||x.data?.code||''),x]));
          for(const item of batch){
            const x=lookup.get(item.code),c=evaluateResponse(item,x,market.date);done++;
            if(c.eligible)candidates.push(c);
            else if(c.status==='DATA'){data++;issues.push({code:item.code,name:item.name,...c});}
            else if(c.status==='FAILED'){failed++;issues.push({code:item.code,name:item.name,...c});}
            else rejected++;
          }
        }catch(error){
          for(const item of batch){done++;failed++;issues.push({code:item.code,name:item.name,status:'FAILED',reason:String(error?.message||error)});}
        }
        progress(done,total,candidates.length);
        if(!stopped && done<total)await new Promise(resolve=>setTimeout(resolve,from%12===0?BATCH_GAP:REQUEST_GAP));
      }
      candidates.sort(F.compare);
      const counts={A:0,B:0,C:0};candidates.forEach(x=>counts[x.status]++);
      last=Object.freeze({model:F.MODEL,dataDate:market.date,createdAt:taipeiStampV3762(),universe:bundle.snapshotRows,unparsed:bundle.snapshotDropped||0,
        quick:pool.quick,total,done,deferred:pool.deferred.length,pending:total-done,audit:pool.audit,
        data,failed,rejected,candidates,issues,counts,completed:!stopped&&done===total&&data===0&&failed===0,
        scopeFinished:!stopped&&done===total});
      render(last);
      if(!last.completed || last.deferred || last.unparsed || pool.audit.unknown || pool.audit.invalidQuote || pool.audit.missingLiquidity)displayError(`⚠️ 僅確認已分析 ${last.done}/${last.total} 檔｜範圍外 ${last.deferred}｜原行情未解析 ${last.unparsed}｜資料缺失／產業未知 ${pool.audit.missingLiquidity+pool.audit.unknown+pool.audit.invalidQuote}｜服務失敗 ${failed}｜個股資料不足 ${data}。不可當作全市場完整結論。`,'warn');
      else if(err){err.style.display='none';}
      note(`本次快照已固定（${last.dataDate}），所有文字及圖片均使用同一份結果。`);
      return last;
    }catch(error){last=null;displayError(`❌ 強勢標股掃描未產生有效結果：${error?.message||error}`);throw error;}
    finally{running=false;originalButtons.forEach((element,i)=>element.disabled=originalButtonState[i]);if(button){button.disabled=false;button.textContent='🔎 查詢強勢標股濾網';}if(stop)stop.disabled=true;if(limit)limit.disabled=false;}
  }
  function stop(){stopped=true;const button=id('ScanButton');if(button)button.textContent='停止請求中，保留已完成結果…';}
  function ensure(){if(!last)throw new Error('請先完成強勢標股濾網查詢');return last;}
  async function copyText(){try{const text=buildText(ensure());await navigator.clipboard.writeText(text);note(`✅ 已複製 ${last.candidates.length} 檔完整文字報告。`);}catch(e){note(`❌ 文字複製失敗：${e.message}`);}}
  function save(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);}
  function downloadText(){try{const s=ensure();save(new Blob(['\uFEFF',buildText(s)],{type:'text/plain;charset=utf-8'}),`強勢標股濾網_全部候選_${s.dataDate}.txt`);note('✅ 完整文字報告已開始下載。');}catch(e){note(`❌ ${e.message}`);}}
  const draw=(ctx,text,x,y,w,size=22,color='#1b344d',align='left')=>fitScanTextV3762(ctx,String(text??''),x,y,w,size,Math.max(11,size-9),850,color,align);
  function renderPage(scan,subset,pageIndex,totalPages,offset=0){
    const canvas=document.createElement('canvas');canvas.width=1284;canvas.height=2778;canvas.dataset.reportMode='strong-stock';
    const ctx=canvas.getContext('2d');ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,1284,2778);
    ctx.fillStyle='#123a5a';ctx.fillRect(0,0,1284,210);
    draw(ctx,'🔎 強勢標股濾網｜盤後候選圖片報告',30,58,1190,38,'#fff');
    draw(ctx,`${scan.dataDate}｜前八名／全部候選共用同一次掃描結果｜第 ${pageIndex}/${totalPages} 頁`,30,101,1190,21,'#e5f4ff');
    draw(ctx,`分析 ${scan.done}/${scan.total}｜範圍外 ${scan.deferred}｜缺資料 ${scan.data}｜服務失敗 ${scan.failed}｜全部已確認候選 ${scan.candidates.length}`,30,137,1190,19,'#fff4bb');
    draw(ctx,'提醒：先記分再查詢；盤後 A 準備／B 首破／C 續攻僅供隔日觀察，非進場保證。',30,176,1190,19,'#fff');
    subset.forEach((c,index)=>{
      const x=24,y=226+index*293,w=1236,h=282,col={A:'#26784d',B:'#24628a',C:'#a66e1e'}[c.status];
      ctx.fillStyle='#fff';ctx.fillRect(x,y,w,h);ctx.fillStyle=col;ctx.fillRect(x,y,8,h);
      draw(ctx,`#${offset+index+1} ${c.name}（${c.code}）`,x+24,y+39,715,34,'#18334d');
      draw(ctx,`收盤 ${fmt(c.close)} 元`,x+w-24,y+39,435,30,'#b52a34','right');
      draw(ctx,`${c.status}｜${c.label}｜獨立排序分 ${c.score}（非勝率）`,x+25,y+75,1165,23,col);
      const cells=[['今日量／20日均量',`${fmt(c.volumeMultiple)} 倍`],['距20日均線',`${fmt(c.ma20GapPct)}%`],['收盤在今日區間',`${fmt(c.closePosition*100,0)}%`]];
      cells.forEach((cell,k)=>{const cx=x+22+k*400;ctx.fillStyle='#f3f7fa';ctx.fillRect(cx,y+87,385,63);draw(ctx,cell[0],cx+12,y+109,355,17,'#5c6d80');draw(ctx,cell[1],cx+12,y+140,350,25,col);});
      draw(ctx,`🎯 觀察價 ${fmt(c.trigger)}｜🛡️ 防守參考 ${fmt(c.support)}｜前20日高 ${fmt(c.referenceHigh)}`,x+25,y+181,1160,22);
      draw(ctx,`📅 資料日 ${c.date}｜${c.breakoutDate?`原突破日 ${c.breakoutDate}／突破價 ${fmt(c.breakoutPrice)}`:'尚未確認有效突破'}`,x+25,y+211,1160,20);
      draw(ctx,`🧭 ${c.reason}`,x+25,y+239,1160,19,col);
      draw(ctx,'⚠️ 隔日須再驗證量價與防守，不可僅憑排名直接進場。',x+25,y+265,1160,17,'#765d1e');
    });
    if(!subset.length)draw(ctx,'本次沒有已確認候選。',40,400,1190,31,'#52647b');
    ctx.fillStyle='#123a5a';ctx.fillRect(0,2578,1284,200);
    draw(ctx,'A＝準備起漲　B＝首次突破　C＝突破後1–3日守住原價',28,2622,1230,20,'#fff');
    draw(ctx,`全數核對：本頁 ${subset.length} 檔｜全部 ${scan.candidates.length} 檔｜排序不會重新計算`,28,2660,1230,20,'#e9f5ff');
    draw(ctx,'資料不足和未深入分析不得當成淘汰；技術分析僅供研究參考。',28,2700,1230,18,'#fff3c2');
    canvas.dataset.strongStockAudit=encodeURIComponent(JSON.stringify({date:scan.dataDate,codes:subset.map(x=>x.code),page:pageIndex,pages:totalPages,offset,sourceCandidates:scan.candidates.length,size:'1284x2778'}));
    return canvas;
  }
  function images(scan,all=false){const list=all?scan.candidates:scan.candidates.slice(0,8),pages=[];for(let i=0;i<list.length;i+=8)pages.push(renderPage(scan,list.slice(i,i+8),pages.length+1,Math.ceil(list.length/8),i));return pages;}
  async function showImage(all=false,watermark=false){try{
    const scan=ensure();if(!scan.candidates.length)throw new Error('沒有候選可以產圖');
    if(document.fonts?.ready)await document.fonts.ready;
    const pages=images(scan,all);if(watermark)pages.forEach(p=>applyAntiTheftWatermarkV3761(p,'all'));
    const title=all?'強勢標股濾網｜全部候選圖片':'強勢標股濾網｜前八名圖片';
    await root.strongStockShowPagesV47(pages,{title,prefix:`強勢標股濾網_${all?'全部候選':'前八名'}${watermark?'_浮水印':''}`,date:scan.dataDate.replace(/\D/g,''),note:`同一份盤後快照｜${pages.length}頁｜全部 ${all?scan.candidates.length:Math.min(8,scan.candidates.length)} 檔｜8檔/頁｜完整無遺漏`,kind:'strong-stock'});
    note(`✅ 已產生 ${pages.length} 頁，含 ${all?scan.candidates.length:Math.min(8,scan.candidates.length)} 檔。${pages.length>1?'預覽視窗可一鍵下載全部 ZIP。':'可預覽或儲存 PNG。'}`);
    return pages;
  }catch(e){note(`❌ 圖片產生失敗：${e.message}`);throw e;}}
  async function copyImage(all=false){try{
    const scan=ensure(),pages=await showImage(all,false);
    if(pages.length!==1){note(`⚠️ 全部候選共 ${pages.length} 頁；剪貼簿無法保證保留全部頁面。請在預覽視窗下載完整 ZIP。`);return;}
    const blob=await new Promise((resolve,reject)=>pages[0].toBlob(x=>x?resolve(x):reject(new Error('PNG轉換失敗')),'image/png'));
    if(!navigator.clipboard?.write || typeof ClipboardItem==='undefined'){note('⚠️ 裝置不支援圖片直接複製，已開啟 PNG 預覽。');return;}
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);note(`✅ 已複製${all?'全部候選':'前八名'} PNG。`);
  }catch(e){note(`❌ 複製失敗：${e.message}`);}}
  root.runStrongStockScanV47=()=>run().catch(()=>{});
  root.stopStrongStockScanV47=stop;
  root.copyStrongStockTextV47=copyText;
  root.downloadStrongStockTextV47=downloadText;
  root.showStrongStockImageV47=(all=false,watermark=false)=>showImage(all,watermark).catch(()=>{});
  root.copyStrongStockImageV47=copyImage;
  root.STRONG_STOCK_TEST_API_V47=Object.freeze({marketPool,evaluateResponse,buildText,renderPage,images,getLast:()=>last,render});
})(window);
