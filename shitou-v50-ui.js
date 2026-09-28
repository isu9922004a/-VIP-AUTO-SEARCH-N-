'use strict';

/* V50 共用 Render 層：所有畫面、文字與圖片只讀 ShitouV50Core 的同一份 analysisResult。 */
(function(root){
  const C=root.ShitouV50Core,V=root.ShitouReleaseV50;if(!C||!V)return;
  const RELEASE=V.release,FILE_VERSION=V.fileVersion;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const price=value=>Number.isFinite(Number(value))?(Number(value)>=1000?Number(value).toFixed(0):Number(value)>=100?Number(value).toFixed(1):Number(value).toFixed(2)):'資料不足';
  const versionize=value=>String(value??'')
    .replaceAll('石頭少爺 Agent V50 正式版｜R5.3.2.5.0｜盤後資料契約與研究證據整合版',RELEASE)
    .replaceAll('V50_R5.3.2.5.0_盤後資料契約與研究證據整合版',FILE_VERSION)
    .replaceAll('最新收盤','最新收盤');
  const get=input=>input?.v50AnalysisResult||C.analyze(input);
  const taipeiTime=value=>{try{return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}catch(_){return '資料不足';}};

  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('shitouV50Style'))return;
    const style=document.createElement('style');style.id='shitouV50Style';style.textContent=`
      .v50-panel{margin:14px 0;padding:18px;border:2px solid #9fc7bd;border-left:7px solid #176b57;border-radius:16px;background:linear-gradient(145deg,#f4fbf8,#fff);box-shadow:0 8px 22px rgba(26,72,65,.08);overflow-wrap:anywhere}
      .v50-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.v50-title{font-size:clamp(1.12rem,3.8vw,1.4rem);font-weight:950;color:#174d43}.v50-badge{padding:6px 10px;border-radius:999px;background:#e5f4ee;color:#176344;font-weight:900;white-space:nowrap}
      .v50-price-row{display:flex;align-items:baseline;gap:8px;margin:12px 0 5px}.v50-price-label{font-weight:850;color:#334155}.v50-close-value{color:#d32232;font-size:clamp(1.7rem,7vw,2.35rem);font-weight:1000;line-height:1;font-variant-numeric:tabular-nums}
      .v50-meta{color:#64748b;line-height:1.65;font-size:.92rem}.v50-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.v50-box{padding:12px 13px;border:1px solid #cfe0dc;border-radius:12px;background:#fff;line-height:1.65;min-width:0}.v50-box strong{display:block;color:#1d4e45;margin-bottom:4px}.v50-alert{margin-top:11px;padding:11px 13px;border-radius:11px;background:#fff6e6;border:1px solid #efcf8e;line-height:1.65}.v50-shadow-note{margin-top:10px;color:#657184;font-size:.9rem;line-height:1.6}
      @media(max-width:680px){.v50-panel{padding:14px;margin:12px 0}.v50-head{display:block}.v50-badge{display:inline-block;margin-top:8px}.v50-grid{grid-template-columns:1fr}.v50-close-value{font-size:1.85rem}}
    `;document.head?.appendChild(style);
  }

  function fibPlain(a){
    const fib=a?.fib?.linear;if(!fib?.available)return a?.fib?.reason||'目前沒有足夠已確認轉折點，不硬算。';
    return `${fib.direction==='UP'?'上漲波段回吐':'下跌波段回補'} ${fib.retracementPct.toFixed(1)}%｜${fib.zone.label}｜${fib.waveStart.date||'-'} ${price(fib.waveStart.price)} → ${fib.waveEnd.date||'-'} ${price(fib.waveEnd.price)}`;
  }
  function cardHtml(input,title='V50 盤後決策總覽',options={}){
    const a=get(input),opening=a.openingDecision,zone=a.confluence?.zones?.[0],risk=[...(a.wave?.risk||[])];
    if(a.quality.state==='DATE_MISMATCH')risk.unshift('市場與個股資料日期不一致；需要同日資料的項目已停止判讀');
    return `<section class="v50-panel" data-v50-quality="${esc(a.quality.state)}">
      <div class="v50-head"><div class="v50-title">${esc(title)}</div><span class="v50-badge">${esc(a.quality.label)}</span></div>
      <div class="v50-price-row"><span class="v50-price-label">最新完成交易日收盤</span><strong class="v50-close-value">${price(a.latestClose)}</strong></div>
      <div class="v50-meta">行情資料日期：${esc(a.dataDate||'資料不足')}｜報告產生：${esc(taipeiTime(a.generatedAt))}｜資料型態：盤後完成日K</div>
      <div class="v50-grid">
        <div class="v50-box"><strong>趨勢結構</strong>${esc(a.trend.label)}<br>${esc(a.trend.plain)}</div>
        <div class="v50-box"><strong>行情階段</strong>${esc(a.wave?.phaseLabel||'資料不足')}<br>${esc(a.wave?.plain||a.wave?.reason||'資料不足')}</div>
        <div class="v50-box"><strong>波段回撤量尺</strong>${esc(fibPlain(a))}<br><small>只描述回吐／回補幅度，不預言反轉。</small></div>
        <div class="v50-box"><strong>昨日高低點研究</strong>${esc(a.previousDay.label||a.previousDay.reason)}<br><small>${esc(a.previousDay.plain||'資料不足')}</small></div>
      </div>
      <div class="v50-alert"><strong>${esc(options.market?`大盤環境：${a.trend.label}`:(opening?.headline||'下一交易日：資料不足，先不要進場'))}</strong><br>${esc(options.market?'只依完成日K描述市場方向與風險，不作個股操作指示。':(opening?.plainText||'盤後資料不足時不補猜。'))}${zone?`<br>最近價位群聚：${price(zone.low)}～${price(zone.high)}（${esc(zone.side)}；${esc(zone.evidence.join('、'))}）`:''}${risk.length?`<br>最大風險：${esc(risk.slice(0,2).join('、'))}`:''}</div>
      <div class="v50-shadow-note">研究影子層：昨日高低點、K棒、缺口與對數回撤不改正式 Gate、條件分、排序、停損或觀察價。下一交易日仍須等完成價格與成交量確認。</div>
    </section>`;
  }

  function applyRelease(){
    if(typeof document==='undefined')return;
    document.title=RELEASE;document.documentElement.dataset.releaseVersion=RELEASE;document.documentElement.dataset.v50DataTiming='POST_CLOSE_ONLY';document.documentElement.dataset.v50Research='SHADOW_ONLY';
    document.querySelectorAll('.version-pill,footer strong').forEach(element=>{element.textContent=RELEASE+(element.classList?.contains('version-pill')?'｜盤後完成日K｜研究層不改正式核心':'');});
    const banner=document.querySelector('.r45-candidate-banner');if(banner)banner.textContent='📚 V50 盤後資料專用：收盤確認優先；趨勢、昨日高低點與波段回撤使用白話顯示，研究層不改正式 Gate、分數、排名或停損。';
  }

  function mountCard(input,id,title,targetIds,options={}){
    if(typeof document==='undefined')return;let box=document.getElementById(id);
    if(!box){box=document.createElement('div');box.id=id;const target=targetIds.map(key=>document.getElementById(key)).find(Boolean);target?.insertAdjacentElement('afterend',box);}
    if(box)box.innerHTML=cardHtml(input,title,options);
  }
  function wrapText(name,options={}){
    if(typeof root[name]!=='function')return;const base=root[name];root[name]=function(input,...rest){const analysis=get(input);return `${C.textBlock(analysis,undefined,options)}\n\n${versionize(base(input,...rest))}`;};
  }
  function attachScan(scan){for(const candidate of scan?.candidates||[])C.attach(candidate);return scan;}
  function scanSummary(scan,title){
    const list=(scan?.candidates||[]).slice(0,8).map(C.attach);if(!list.length)return `【${title}｜V50盤後結構】\n本次沒有可建立結構說明的候選。`;
    return `【${title}｜V50盤後結構】\n${list.map((candidate,index)=>{const a=candidate.v50AnalysisResult;return `${index+1}. ${candidate?.name||candidate?.report?.name||candidate?.code||candidate?.report?.stock||'-'}｜${a.trend.label}｜${a.openingDecision?.headline||'下一交易日資料不足'}`;}).join('\n')}\n定位：只整理完成日K與下一交易日需確認條件，不代表開盤可直接買進。`;
  }
  function wrapScanText(name,title){if(typeof root[name]!=='function')return;const base=root[name];root[name]=function(scan,...rest){attachScan(scan);return `${scanSummary(scan,title)}\n\n${versionize(base(scan,...rest))}`;};}

  function safeCanvasInsert(base,input,title,options={}){
    if(!base||typeof root.insertStageCanvasCardV53245!=='function')return base;const a=get(input),height=154;
    let insertY=Math.min(220,Math.max(112,Math.round((base.height||0)*.055)));
    try{const audit=base?.dataset?.layoutAudit?JSON.parse(decodeURIComponent(base.dataset.layoutAudit)):null;for(const card of audit?.stageCards||[]){const bottom=Number(card?.insertY)+Number(card?.height);if(Number.isFinite(bottom))insertY=Math.max(insertY,Math.round(bottom));}}catch(_){}
    insertY=Math.max(0,Math.min(Math.max(0,(base.height||height)-height),insertY));
    const opening=options.market?'大盤環境觀察':(a.openingDecision?.headline?.replace('明天開盤：','')||'資料不足，先不要進場'),stage={key:`V50_${a.trend.key}`,label:`${a.trend.label}｜${opening}`,headline:`最新收盤 ${price(a.latestClose)}｜${fibPlain(a)}`,plainText:`最新收盤 ${price(a.latestClose)}｜${fibPlain(a)}`,colorRole:a.trend.key==='BULL'?'early':a.trend.key==='BEAR'?'late':'unknown'};
    return root.insertStageCanvasCardV53245(base,stage,title,insertY,height);
  }

  function install(){
    if(root.__SHITOU_V50_UI_INSTALLED__)return;root.__SHITOU_V50_UI_INSTALLED__=true;ensureStyle();applyRelease();
    wrapText('buildReportText');wrapText('buildMarketWorkerReportText',{market:true});wrapScanText('buildMomentumScanTextReportV3763','主升候選');wrapScanText('buildMomentumScanCompactTextReportV377713','主升候選');wrapScanText('buildDayTradeTextReportV1','下一交易日短線觀察');
    if(typeof root.renderBeginnerCommandCenterV46==='function'){const base=root.renderBeginnerCommandCenterV46;root.renderBeginnerCommandCenterV46=function(report,...rest){const out=base(report,...rest);mountCard(report,'v50StockDecision','V50 個股盤後決策總覽',['beginnerCommandCenterV46','stockStageCardV53245']);return out;};}
    if(typeof root.renderMarketWorkerData==='function'){const base=root.renderMarketWorkerData;root.renderMarketWorkerData=function(report,...rest){const out=base(report,...rest);mountCard(report,'v50MarketDecision','V50 大盤盤後結構',['marketStatusBox','marketStageCardV53245'],{market:true});return out;};}
    for(const [name,hostId,boxId,title] of [['renderMomentumScanResultV3765','momentumList','v50MomentumSummary','V50 主升候選結構總覽'],['renderDayTradeScanResultV1','dayTradeList','v50DayTradeSummary','V50 下一交易日短線觀察總覽']]){
      if(typeof root[name]!=='function')continue;const base=root[name];root[name]=function(scan,...rest){attachScan(scan);const out=base(scan,...rest),host=document.getElementById(hostId);let box=document.getElementById(boxId);if(!box&&host){box=document.createElement('div');box.id=boxId;host.prepend(box);}const top=scan?.candidates?.[0];if(box)box.innerHTML=top?cardHtml(top,title):`<section class="v50-panel"><div class="v50-title">${esc(title)}</div><p>本次沒有候選可建立盤後結構說明。</p></section>`;return out;};
    }
    for(const name of ['renderStockInfographicV46','renderStockProfessionalInfographicV51']){if(typeof root[name]!=='function')continue;const base=root[name];root[name]=function(report,...rest){return safeCanvasInsert(base(report,...rest),report,'V50 盤後結構與下一步確認');};}
    if(typeof root.renderMarketInfographicV3328==='function'){const base=root.renderMarketInfographicV3328;root.renderMarketInfographicV3328=function(report,...rest){return safeCanvasInsert(base(report,...rest),report,'V50 大盤盤後結構',{market:true});};}
    if(typeof root.sanitizeFilenameV3328==='function'){const base=root.sanitizeFilenameV3328;root.sanitizeFilenameV3328=function(value){return base(versionize(value).replace(/V(?:40|47|48|49)_R[\w.\-]+_[^\s/\\]+/g,FILE_VERSION));};}
    root.R50_RELEASE_LABEL=RELEASE;root.R50_FILE_VERSION=FILE_VERSION;root.SHITOU_V50_ACCEPTANCE={release:RELEASE,dataTiming:'POST_CLOSE_ONLY',singleAnalysisResult:true,researchShadowOnly:true,formalGateChanged:false,scoreChanged:false,rankingChanged:false,stopChanged:false};
  }
  root.ShitouV50UI=Object.freeze({RELEASE,FILE_VERSION,versionize,get,fibPlain,cardHtml,safeCanvasInsert,install});
  install();
})(typeof window!=='undefined'?window:globalThis);
