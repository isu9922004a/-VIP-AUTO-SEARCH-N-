'use strict';

/* V50 共用 Render 層：所有畫面、文字與圖片只讀 ShitouV50Core 的同一份 analysisResult。 */
(function(root){
  const C=root.ShitouV50Core,V=root.ShitouReleaseV50;if(!C||!V)return;
  const RELEASE=V.release,FILE_VERSION=V.fileVersion;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const price=value=>Number.isFinite(Number(value))?(Number(value)>=1000?Number(value).toFixed(0):Number(value)>=100?Number(value).toFixed(1):Number(value).toFixed(2)):'資料不足';
  const versionize=value=>String(value??'')
    .replaceAll('石頭少爺 Agent V50 正式版｜R5.3.2.5.2｜蕭明道量價與新手開盤整合版',RELEASE)
    .replaceAll('V50_R5.3.2.5.2_蕭明道量價與新手開盤整合版',FILE_VERSION)
    .replaceAll('最新收盤','最新收盤');
  const get=input=>input?.v50AnalysisResult||C.analyze(input);
  const taipeiTime=value=>{try{return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}catch(_){return '資料不足';}};
  const concise=(value,max=86)=>{const text=String(value??'').replace(/\s+/g,' ').trim();return text.length>max?`${text.slice(0,max-1)}…`:text;};
  const unique=items=>[...new Set((items||[]).filter(Boolean))];
  const beginnerPlain=value=>String(value??'')
    .replace(/等待新\s*A\s*[／/]\s*A[→～~]B/gi,'新的上漲結構還沒建立完整')
    .replace(/等待新的?起漲轉折點\s*A\s*建立/g,'等待新的起漲點先確認')
    .replace(/A、B、C依序建立/g,'起漲點、前波高點、回檔低點依序確認')
    .replace(/新ABC尚未建立/g,'新的上漲結構尚未建立')
    .replace(/ABC／N字/g,'上漲結構')
    .replace(/A[→～~]B/g,'起漲到前高的波段')
    .replace(/B點/g,'前波高點')
    .replace(/Gate/gi,'進場檢查');

  function ensureStyle(){
    if(typeof document==='undefined'||document.getElementById('shitouV50Style'))return;
    const style=document.createElement('style');style.id='shitouV50Style';style.textContent=`
      .v50-panel{margin:14px 0;padding:18px;border:2px solid #9fc7bd;border-left:7px solid #176b57;border-radius:16px;background:linear-gradient(145deg,#f4fbf8,#fff);box-shadow:0 8px 22px rgba(26,72,65,.08);overflow-wrap:anywhere}
      .v50-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.v50-title{font-size:clamp(1.12rem,3.8vw,1.4rem);font-weight:950;color:#174d43}.v50-badge{padding:6px 10px;border-radius:999px;background:#e5f4ee;color:#176344;font-weight:900;white-space:nowrap}
      .v50-price-row{display:flex;align-items:baseline;gap:8px;margin:12px 0 5px}.v50-price-label{font-weight:850;color:#334155}.v50-close-value{color:#d32232;font-size:clamp(1.7rem,7vw,2.35rem);font-weight:1000;line-height:1;font-variant-numeric:tabular-nums}
      .v50-meta{color:#64748b;line-height:1.65;font-size:.92rem}.v50-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.v50-box{padding:12px 13px;border:1px solid #cfe0dc;border-radius:12px;background:#fff;color:#26364a;line-height:1.65;min-width:0}.v50-box strong{display:block;color:#1d4e45;margin-bottom:4px}
      .v50-buy-call{margin:13px 0;padding:14px 15px;border:2px solid #d8a64c;border-left-width:8px;border-radius:13px;background:#fffaf0;color:#2f2a20;line-height:1.65}.v50-buy-call[data-tone="red"]{border-color:#cf6a72;background:#fff3f3}.v50-buy-call[data-tone="green"]{border-color:#46a577;background:#effaf4}.v50-buy-call[data-tone="gray"]{border-color:#94a3b8;background:#f8fafc}.v50-buy-call strong{display:block;color:#243349;font-size:1.12rem}.v50-buy-call p{margin:5px 0}.v50-buy-call ul{margin:7px 0 0;padding-left:1.3rem}.v50-buy-call li{margin:3px 0}
      .v50-score-row{display:flex;align-items:center;gap:12px;margin:9px 0;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.72);border:1px solid rgba(71,85,105,.18)}.v50-score-number{font-size:clamp(1.65rem,7vw,2.25rem);line-height:1;font-weight:1000;color:#9a5208;white-space:nowrap}.v50-buy-call[data-tone="green"] .v50-score-number{color:#137447}.v50-buy-call[data-tone="red"] .v50-score-number{color:#b4232f}.v50-score-copy{font-weight:850;color:#334155}.v50-score-copy small{display:block;font-weight:650;color:#64748b}
      .v50-alert{margin-top:11px;padding:11px 13px;border-radius:11px;background:#fff6e6;border:1px solid #d9a63f;color:#3d2b0b;line-height:1.65}.v50-alert strong{color:#603c00}.v50-shadow-note{margin-top:10px;color:#536174;font-size:.9rem;line-height:1.6}
      @media(max-width:680px){.v50-panel{padding:14px;margin:12px 0}.v50-head{display:block}.v50-badge{display:inline-block;margin-top:8px}.v50-grid{grid-template-columns:1fr}.v50-close-value{font-size:1.85rem}}
    `;document.head?.appendChild(style);
  }

  function fibPlain(a){
    const fib=a?.fib?.linear;if(!fib?.available)return a?.fib?.reason||'目前沒有足夠已確認轉折點，不硬算。';
    return `${fib.direction==='UP'?'上漲波段回吐':'下跌波段回補'} ${fib.retracementPct.toFixed(1)}%｜${fib.zone.label}｜${fib.waveStart.date||'-'} ${price(fib.waveStart.price)} → ${fib.waveEnd.date||'-'} ${price(fib.waveEnd.price)}`;
  }
  function beginnerDecision(input,analysis=null){
    const a=analysis||get(input),report=input?.report||input||{},course=a.course?.ok?a.course:null;let layer=null,flow=null;
    try{layer=typeof root.buildEducationLayerV46==='function'?root.buildEducationLayerV46(report):null;}catch(_){layer=null;}
    try{flow=layer&&typeof root.v46ActionFlowV511==='function'?root.v46ActionFlowV511(report,layer):null;}catch(_){flow=null;}
    const risk=layer?.decisionRiskState||{},context=layer?.sourceExecutionContext||{},levels=layer?.supportResistanceConfluence||{},opening=a.openingDecision||{};
    const dataBlocked=['DATE_MISMATCH'].includes(a.quality?.state)||!a.dataDate;
    const failed=context.failed===true||risk.key==='FAILED'||(!layer&&a.trend?.key==='BEAR');
    const allowed=risk.displayActionAllowed===true&&layer?.executionAllowed===true;
    let key='WAIT',icon='🟠',tone='orange',verdict='目前不適合急著買，先等條件';
    if(dataBlocked){key='DATA';icon='⚪';tone='gray';verdict='資料不足，暫時不要買';}
    else if(failed){key='AVOID';icon='🔴';tone='red';verdict='目前不適合買進';}
    else if(risk.key==='PROTECT'){key='NO_CHASE';icon='🔴';tone='red';verdict='目前不適合新買，也不要追價';}
    else if(risk.key==='WAIT_TIME'){key='WAIT_TIME';icon='🟠';tone='orange';verdict='目前先不要買，等待站穩確認';}
    else if(allowed&&(!course||course.score>=70)&&course?.key!=='AVOID'){key='CONDITIONAL';icon='🟢';tone='green';verdict='條件已通過，可列入盤中分批評估';}
    else if(allowed&&course){key='COURSE_WAIT';icon='🟡';tone='orange';verdict='正式條件雖通過，量價仍要再確認';}
    else if(!layer&&opening?.decision?.key==='PRIORITY_WATCH'&&a.trend?.key==='BULL'){key='WATCH';icon='🟡';tone='orange';verdict='可以優先觀察，但還不能直接買';}
    else if(!layer&&a.trend?.key==='SIDEWAYS'){key='WAIT_DIRECTION';icon='🟠';tone='orange';verdict='方向還沒確認，現在不適合急著買';}
    const fallbackReason=dataBlocked?'行情日期或完成日K資料不完整；資料不足時不補猜。':a.trend?.plain||opening?.plainText||'正式進場條件尚未完整。';
    const reason=concise(beginnerPlain(risk.primary||fallbackReason),130);
    const fallbackWait=a.trend?.key==='SIDEWAYS'?'先等方向變清楚，並確認價格守住支撐、成交量配合。':opening?.plainText||'等待價格、成交量與風險條件一起完成後再評估。';
    const wait=concise(beginnerPlain(flow?.wait||fallbackWait),150);
    const levelPrice=value=>Number.isFinite(Number(value))&&Number(value)>0?price(value):null;
    const observation=levelPrice(levels.observation),supportLow=levelPrice(levels.supportLow),supportHigh=levelPrice(levels.supportHigh),defense=levelPrice(levels.coreDefense),planFailure=levelPrice(levels.planFailure),structuralInvalid=levelPrice(levels.structuralInvalid);
    const support=supportLow?(supportHigh&&supportHigh!==supportLow?`${supportLow}～${supportHigh}`:supportLow):null;
    const priceWatch=course?.openingChecklist?.[0]|| (observation?`價格：看 ${observation} 附近能否守穩；到價不等於可以直接買。`:support?`價格：看支撐 ${support} 附近能否止穩；不要猜最低點。`:'價格：等待完成日K形成可驗證的支撐或突破。');
    const volumePlain=concise(beginnerPlain(course?.openingChecklist?.[1]?.replace(/^成交量：/,'')||layer?.volumeContextState?.warning||layer?.volumeContextState?.label||'成交量要和價格同方向；量大卻漲不動要提高警覺。'),88);
    const riskLine=defense?`風險：收盤失守 ${defense}，先停止新買並重新檢查。`:planFailure?`風險：跌破 ${planFailure}，本次計畫回到等待。`:structuralInvalid?`風險：跌破 ${structuralInvalid}，原結構失效。`:'風險：還沒有可靠防守價時，不建立新部位。';
    let holder='已有持股：依既有防守價管理，不因單一訊號主動加碼。';
    try{if(layer?.exitManagementState&&typeof root.v46HolderActionCopy==='function')holder=`已有持股：${root.v46HolderActionCopy(layer.exitManagementState)}。`; }catch(_){/* 沿用保守預設。 */}
    const rawScore=Number.isFinite(Number(course?.score))?Number(course.score):null;
    let suitabilityScore=rawScore===null?(allowed?70:45):rawScore;
    if(dataBlocked)suitabilityScore=Math.min(suitabilityScore,20);else if(failed)suitabilityScore=Math.min(suitabilityScore,29);else if(risk.key==='PROTECT')suitabilityScore=Math.min(suitabilityScore,34);else if(risk.key==='WAIT_TIME'||!allowed)suitabilityScore=Math.min(suitabilityScore,59);
    suitabilityScore=Math.max(0,Math.min(100,Math.round(suitabilityScore)));
    const suitabilityLabel=suitabilityScore>=75?'條件較完整':suitabilityScore>=60?'可觀察、仍等盤中確認':suitabilityScore>=40?'條件不足、先等':'目前不適合進場';
    return {key,icon,tone,verdict,reason,wait,watch:unique([priceWatch,`成交量：${volumePlain}`,riskLine]),holder,formalExecutionAllowed:allowed,suitabilityScore,suitabilityLabel,course};
  }
  function beginnerTextBlock(input){
    const d=beginnerDecision(input),lines=['【新手先看｜現在適不適合買？】',`空手結論：${d.icon} ${d.verdict}`,`明日開盤適合度：${d.suitabilityScore}/100｜${d.suitabilityLabel}（條件完整度，不是勝率）`,d.course?.threePan?.plain?`三盤白話：${d.course.threePan.plain}`:null,`為什麼：${d.reason}`,`等什麼再看：${d.wait}`,'要觀察的三件事：',...d.watch.map((item,index)=>`${index+1}. ${item}`),d.holder,'提醒：這是盤後條件整理，不是保證獲利；正式進場仍以原有 Gate 與風險條件為準。'].filter(Boolean);
    return lines.join('\n');
  }
  function cardHtml(input,title='V50 盤後決策總覽',options={}){
    const a=get(input),decision=options.market?null:beginnerDecision(input,a),zone=a.confluence?.zones?.[0],risk=[...(a.wave?.risk||[])];
    if(a.quality.state==='DATE_MISMATCH')risk.unshift('市場與個股資料日期不一致；需要同日資料的項目已停止判讀');
    return `<section class="v50-panel" data-v50-quality="${esc(a.quality.state)}">
      <div class="v50-head"><div class="v50-title">${esc(title)}</div><span class="v50-badge">${esc(a.quality.label)}</span></div>
      ${options.market?'':`<div class="v50-buy-call" data-tone="${esc(decision.tone)}"><strong>新手先看｜空手結論：${esc(decision.icon)} ${esc(decision.verdict)}</strong><div class="v50-score-row"><span class="v50-score-number">${decision.suitabilityScore}/100</span><span class="v50-score-copy">明日開盤適合度：${esc(decision.suitabilityLabel)}<small>條件完整度，不是上漲機率或勝率</small></span></div>${decision.course?.threePan?.plain?`<p><b>三盤白話：</b>${esc(decision.course.threePan.plain)}</p>`:''}<p><b>為什麼：</b>${esc(decision.reason)}</p><p><b>等什麼再看：</b>${esc(decision.wait)}</p><b>要觀察的三件事：</b><ul>${decision.watch.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><p>${esc(decision.holder)}</p></div>`}
      <div class="v50-price-row"><span class="v50-price-label">最新完成交易日收盤</span><strong class="v50-close-value">${price(a.latestClose)}</strong></div>
      <div class="v50-meta">行情資料日期：${esc(a.dataDate||'資料不足')}｜報告產生：${esc(taipeiTime(a.generatedAt))}｜資料型態：盤後完成日K</div>
      <div class="v50-grid">
        <div class="v50-box"><strong>趨勢結構</strong>${esc(a.trend.label)}<br>${esc(a.trend.plain)}</div>
        <div class="v50-box"><strong>行情階段</strong>${esc(a.wave?.phaseLabel||'資料不足')}<br>${esc(a.wave?.plain||a.wave?.reason||'資料不足')}</div>
        <div class="v50-box"><strong>波段回撤量尺</strong>${esc(fibPlain(a))}<br><small>只描述回吐／回補幅度，不預言反轉。</small></div>
        <div class="v50-box"><strong>昨日高低點研究</strong>${esc(a.previousDay.label||a.previousDay.reason)}<br><small>${esc(a.previousDay.plain||'資料不足')}</small></div>
      </div>
      <div class="v50-alert"><strong>${esc(options.market?`大盤環境：${a.trend.label}`:'接下來只看這三件事')}</strong><br>${options.market?esc('只依完成日K描述市場方向與風險，不作個股操作指示。'):decision.watch.map(esc).join('<br>')}${zone?`<br>最近價位群聚：${price(zone.low)}～${price(zone.high)}（${esc(zone.side)}；${esc(zone.evidence.join('、'))}）`:''}${risk.length?`<br>最大風險：${esc(risk.slice(0,2).join('、'))}`:''}</div>
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
    if(typeof root[name]!=='function')return;const base=root[name];root[name]=function(input,...rest){const analysis=get(input),beginner=options.market?'':`${beginnerTextBlock(input)}\n\n`;return `${beginner}${C.textBlock(analysis,undefined,options)}\n\n${versionize(base(input,...rest))}`;};
  }
  function attachScan(scan){for(const candidate of scan?.candidates||[])C.attach(candidate);return scan;}
  function scanSummary(scan,title){
    const list=(scan?.candidates||[]).slice(0,8).map(C.attach);if(!list.length)return `【${title}｜V50盤後結構】\n本次沒有可建立結構說明的候選。`;
    return `【${title}｜V50盤後結構】\n${list.map((candidate,index)=>{const a=candidate.v50AnalysisResult;return `${index+1}. ${candidate?.name||candidate?.report?.name||candidate?.code||candidate?.report?.stock||'-'}｜${a.trend.label}｜${a.openingDecision?.headline||'下一交易日資料不足'}`;}).join('\n')}\n定位：只整理完成日K與下一交易日需確認條件，不代表開盤可直接買進。`;
  }
  function wrapScanText(name,title){if(typeof root[name]!=='function')return;const base=root[name];root[name]=function(scan,...rest){attachScan(scan);return `${scanSummary(scan,title)}\n\n${versionize(base(scan,...rest))}`;};}

  const IPHONE_REPORT_WIDTH=1284,IPHONE_REPORT_HEIGHT=2778;
  function canvasAudit(canvas){try{return canvas?.dataset?.layoutAudit?JSON.parse(decodeURIComponent(canvas.dataset.layoutAudit)):null;}catch(_){return null;}}
  function copyCanvasData(source,target){for(const [key,value] of Object.entries(source?.dataset||{}))target.dataset[key]=value;for(const key of ['_scanImageLayoutAuditR44','_momentumTop8AuditV532412','_dayTradeRenderedCodesV1','_momentumAllCandidatesAuditV377715'])if(source?.[key]!==undefined)target[key]=source[key];}
  function compactPreviousCards(base){
    const audit=canvasAudit(base),raw=Array.isArray(audit?.stageCards)?audit.stageCards:[];
    const ranges=raw.map(card=>({top:Math.max(0,Math.round(Number(card?.insertY)||0)),bottom:Math.min(base.height,Math.round((Number(card?.insertY)||0)+(Number(card?.height)||0)))})).filter(range=>range.bottom>range.top).sort((a,b)=>a.top-b.top);
    if(!ranges.length)return base;
    const merged=[];for(const range of ranges){const last=merged.at(-1);if(last&&range.top<=last.bottom)last.bottom=Math.max(last.bottom,range.bottom);else merged.push({...range});}
    const removed=merged.reduce((sum,range)=>sum+range.bottom-range.top,0),canvas=document.createElement('canvas');if(typeof canvas.getContext!=='function')return base;canvas.width=base.width;canvas.height=Math.max(1,base.height-removed);const ctx=canvas.getContext('2d');ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,canvas.width,canvas.height);
    let sourceY=0,targetY=0;for(const range of merged){if(range.top>sourceY){const height=range.top-sourceY;ctx.drawImage(base,0,sourceY,base.width,height,0,targetY,base.width,height);targetY+=height;}sourceY=Math.max(sourceY,range.bottom);}if(sourceY<base.height)ctx.drawImage(base,0,sourceY,base.width,base.height-sourceY,0,targetY,base.width,base.height-sourceY);
    copyCanvasData(base,canvas);canvas.dataset.layoutAudit=encodeURIComponent(JSON.stringify({...audit,size:`${canvas.width}x${canvas.height}`,stageCards:[],compactedStageCards:raw.map(card=>({title:card.title,height:card.height}))}));return canvas;
  }
  function iphoneFullCanvas(base){
    if(!base||typeof document==='undefined')return base;const canvas=document.createElement('canvas');if(typeof canvas.getContext!=='function')return base;canvas.width=IPHONE_REPORT_WIDTH;canvas.height=IPHONE_REPORT_HEIGHT;const ctx=canvas.getContext('2d'),scale=Math.min(canvas.width/base.width,canvas.height/base.height),drawWidth=Math.round(base.width*scale),drawHeight=Math.round(base.height*scale),x=Math.round((canvas.width-drawWidth)/2),y=Math.round((canvas.height-drawHeight)/2);
    ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';ctx.drawImage(base,0,0,base.width,base.height,x,y,drawWidth,drawHeight);copyCanvasData(base,canvas);const audit=canvasAudit(base)||{};canvas.dataset.layoutAudit=encodeURIComponent(JSON.stringify({...audit,size:`${canvas.width}x${canvas.height}`,iphoneFullScreen:{width:canvas.width,height:canvas.height,sourceWidth:base.width,sourceHeight:base.height,scale,offsetX:x,offsetY:y,noCrop:true}}));canvas.dataset.iphoneFullScreen='1284x2778';return canvas;
  }
  function compactVerticalWhitespace(base){
    if(!base||typeof document==='undefined'||typeof base.getContext!=='function')return base;const targetHeight=Math.round(base.width*IPHONE_REPORT_HEIGHT/IPHONE_REPORT_WIDTH);if(base.height<=targetHeight+8)return base;
    const source=base.getContext('2d'),pixels=source.getImageData(0,0,base.width,base.height).data,quiet=[];let start=null;
    for(let y=96;y<base.height-80;y++){
      let ink=0;for(let x=12;x<base.width-12;x+=4){const i=(y*base.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];if(a>0&&(r<205||g<205||b<205)){ink++;if(ink>=7)break;}}
      if(ink<7&&start===null)start=y;else if(ink>=7&&start!==null){if(y-start>=72)quiet.push({top:start,bottom:y});start=null;}
    }
    if(start!==null&&base.height-80-start>=72)quiet.push({top:start,bottom:base.height-80});
    let excess=base.height-targetHeight;const cuts=[];for(const gap of [...quiet].sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))){if(excess<=0)break;const removable=Math.max(0,gap.bottom-gap.top-36),take=Math.min(removable,excess);if(take>0){const center=(gap.top+gap.bottom)/2;cuts.push({top:Math.round(center-take/2),bottom:Math.round(center+take/2)});excess-=take;}}
    if(!cuts.length)return base;cuts.sort((a,b)=>a.top-b.top);const removed=cuts.reduce((sum,cut)=>sum+cut.bottom-cut.top,0),canvas=document.createElement('canvas');if(typeof canvas.getContext!=='function')return base;canvas.width=base.width;canvas.height=base.height-removed;const ctx=canvas.getContext('2d');ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,canvas.width,canvas.height);let sourceY=0,targetY=0;for(const cut of cuts){if(cut.top>sourceY){const height=cut.top-sourceY;ctx.drawImage(base,0,sourceY,base.width,height,0,targetY,base.width,height);targetY+=height;}sourceY=cut.bottom;}if(sourceY<base.height)ctx.drawImage(base,0,sourceY,base.width,base.height-sourceY,0,targetY,base.width,base.height-sourceY);copyCanvasData(base,canvas);const audit=canvasAudit(base)||{};canvas.dataset.layoutAudit=encodeURIComponent(JSON.stringify({...audit,size:`${canvas.width}x${canvas.height}`,verticalWhitespaceRemoved:removed,verticalWhitespaceCuts:cuts}));return canvas;
  }

  function safeCanvasInsert(base,input,title,options={}){
    if(!base||typeof root.insertStageCanvasCardV53245!=='function')return base;const compactBase=compactPreviousCards(base),a=get(input),decision=options.market?null:beginnerDecision(input,a),height=options.market?190:286;
    let insertY=Math.min(220,Math.max(112,Math.round((compactBase.height||0)*.055)));
    try{const audit=canvasAudit(compactBase);for(const card of audit?.stageCards||[]){const bottom=Number(card?.insertY)+Number(card?.height);if(Number.isFinite(bottom))insertY=Math.max(insertY,Math.round(bottom));}}catch(_){}
    insertY=Math.max(0,Math.min(Math.max(0,(compactBase.height||height)-height),insertY));
    const opening=options.market?'大盤環境觀察':decision.verdict,stage={key:options.market?`V50_${a.trend.key}`:`V50_BUY_${decision.key}`,label:options.market?`${a.trend.label}｜${opening}`:`${decision.icon} ${decision.suitabilityScore}/100｜${opening}`,headline:options.market?`最新收盤 ${price(a.latestClose)}｜${fibPlain(a)}`:`為什麼：${decision.reason}`,plainText:options.market?`最新收盤 ${price(a.latestClose)}｜${fibPlain(a)}`:`等什麼：${decision.wait}`,beginnerLines:options.market?null:[`明日開盤適合度：${decision.suitabilityScore}/100（不是勝率）`,decision.course?.threePan?.label?`三盤：${decision.course.threePan.label}`:null,`為什麼：${decision.reason}`,`等什麼：${decision.wait}`],colorRole:options.market?(a.trend.key==='BULL'?'early':a.trend.key==='BEAR'?'late':'unknown'):(decision.tone==='green'?'early':decision.tone==='red'?'danger':decision.tone==='gray'?'unknown':'main')};
    return iphoneFullCanvas(compactVerticalWhitespace(root.insertStageCanvasCardV53245(compactBase,stage,title,insertY,height)));
  }

  function install(){
    if(root.__SHITOU_V50_UI_INSTALLED__)return;root.__SHITOU_V50_UI_INSTALLED__=true;ensureStyle();applyRelease();
    wrapText('buildReportText');wrapText('buildMarketWorkerReportText',{market:true});wrapScanText('buildMomentumScanTextReportV3763','主升候選');wrapScanText('buildMomentumScanCompactTextReportV377713','主升候選');wrapScanText('buildDayTradeTextReportV1','下一交易日短線觀察');
    if(typeof root.renderBeginnerCommandCenterV46==='function'){const base=root.renderBeginnerCommandCenterV46;root.renderBeginnerCommandCenterV46=function(report,...rest){const out=base(report,...rest);mountCard(report,'v50StockDecision','V50 個股盤後決策總覽',['beginnerCommandCenterV46','stockStageCardV53245']);return out;};}
    if(typeof root.renderMarketWorkerData==='function'){const base=root.renderMarketWorkerData;root.renderMarketWorkerData=function(report,...rest){const out=base(report,...rest);mountCard(report,'v50MarketDecision','V50 大盤盤後結構',['marketStatusBox','marketStageCardV53245'],{market:true});return out;};}
    for(const [name,hostId,boxId,title] of [['renderMomentumScanResultV3765','momentumList','v50MomentumSummary','V50 主升候選結構總覽'],['renderDayTradeScanResultV1','dayTradeList','v50DayTradeSummary','V50 下一交易日短線觀察總覽']]){
      if(typeof root[name]!=='function')continue;const base=root[name];root[name]=function(scan,...rest){attachScan(scan);const out=base(scan,...rest),host=document.getElementById(hostId);let box=document.getElementById(boxId);if(!box&&host){box=document.createElement('div');box.id=boxId;host.prepend(box);}const top=scan?.candidates?.[0];if(box)box.innerHTML=top?cardHtml(top,title):`<section class="v50-panel"><div class="v50-title">${esc(title)}</div><p>本次沒有候選可建立盤後結構說明。</p></section>`;return out;};
    }
    for(const name of ['renderStockInfographicV46','renderStockProfessionalInfographicV51']){if(typeof root[name]!=='function')continue;const base=root[name];root[name]=function(report,...rest){return safeCanvasInsert(base(report,...rest),report,'新手先看｜現在適不適合買？');};}
    if(typeof root.renderMarketInfographicV3328==='function'){const base=root.renderMarketInfographicV3328;root.renderMarketInfographicV3328=function(report,...rest){return safeCanvasInsert(base(report,...rest),report,'V50 大盤盤後結構',{market:true});};}
    if(typeof root.sanitizeFilenameV3328==='function'){const base=root.sanitizeFilenameV3328;root.sanitizeFilenameV3328=function(value){return base(versionize(value).replace(/V(?:40|47|48|49)_R[\w.\-]+_[^\s/\\]+/g,FILE_VERSION));};}
    root.R50_RELEASE_LABEL=RELEASE;root.R50_FILE_VERSION=FILE_VERSION;root.SHITOU_V50_ACCEPTANCE={release:RELEASE,dataTiming:'POST_CLOSE_ONLY',singleAnalysisResult:true,researchShadowOnly:true,formalGateChanged:false,scoreChanged:false,rankingChanged:false,stopChanged:false};
  }
  root.ShitouV50UI=Object.freeze({RELEASE,FILE_VERSION,IPHONE_REPORT_WIDTH,IPHONE_REPORT_HEIGHT,versionize,get,fibPlain,beginnerDecision,beginnerTextBlock,cardHtml,compactPreviousCards,compactVerticalWhitespace,iphoneFullCanvas,safeCanvasInsert,install});
  install();
})(typeof window!=='undefined'?window:globalThis);
