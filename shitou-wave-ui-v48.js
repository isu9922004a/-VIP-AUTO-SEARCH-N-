/* V48 共同白話顯示層：把量價波段核心接到個股/大盤/主升/當沖文字與圖片；不改既有資料來源與硬性風控。 */
(function(root){'use strict';
const W=root.ShitouWaveCoreV48;if(!W)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function analyze(x){return W.analyzeReport(x?.report||x);}
function compact(a){if(!a?.ok)return '量價波段資料不足';const g=W.grade(a);return `${g.label}｜${a.phaseLabel}｜${a.threeBreakout?'✅三盤突破':a.threeBreakdown?'⚠️三盤跌破':'三盤未轉折'}｜${a.mvText}`;}
function prependOnce(text,block,key='【📚 新版量價波段判讀】'){const s=String(text||'');return s.includes(key)?s:`${block}\n\n${s}`;}
function multiBlock(scan,title){const list=(scan?.candidates||[]).slice(0,8);if(!list.length)return `【📚 ${title}】\n目前沒有可分析候選。`;return `【📚 ${title}】\n${list.map((c,i)=>{const a=analyze(c);return `${i+1}. ${c?.name||c?.report?.name||c?.report?.stock||c?.code||'-'}｜${compact(a)}${a?.risk?.length?`｜風險：${a.risk.slice(0,2).join('、')}`:''}`;}).join('\n')}\n白話規則：三盤只負責「轉折」，量潮與8／21／55日線負責確認行情能不能接力；沒有量價配合就不把突破當成完成。`;}
function cardHtml(a,title='📚 新版量價波段'){if(!a?.ok)return `<div class="rule wave-v48-card"><strong>${title}</strong><br>資料不足，保留原系統判讀，不硬補結論。</div>`;const g=W.grade(a);return `<div class="rule wave-v48-card" style="border-left:6px solid ${g.key==='S'?'#1f7a4f':g.key==='A'?'#24628a':g.key==='REJECT'?'#b52a34':'#a66e1e'}"><strong>${title}｜${esc(g.label)}｜${esc(a.phaseLabel)}</strong><br><span>${esc(a.plain)}</span><br><span class="meta">均線：${esc(a.maText)}<br>量能：${esc(a.mvText)}<br>${a.threeBreakout?'✅ 三盤突破':a.threeBreakdown?'⚠️ 三盤跌破':'三盤尚未轉折'}｜🎯 觀察 ${a.trigger.toFixed(2)}｜🛡️ 防守 ${a.support.toFixed(2)}${a.risk.length?`<br>⚠️ ${esc(a.risk.join('、'))}`:''}</span></div>`;}
function ensureStyle(){if(document.getElementById('waveV48Style'))return;const s=document.createElement('style');s.id='waveV48Style';s.textContent='.wave-v48-card{margin:12px 0;padding:16px 18px;line-height:1.72;background:linear-gradient(145deg,#fff,#f5f9fc);color:#24364b;font-size:1.04rem;font-weight:720;overflow-wrap:anywhere}.wave-v48-card strong{font-size:1.16rem;line-height:1.45;font-weight:950;color:#17324f}.wave-v48-card>span{color:#2f435a}.wave-v48-card .meta{display:block;margin-top:8px;color:#40546b;font-weight:760}.market-result>.panel:first-child #waveMarketCardV48 .wave-v48-card .meta{color:#40546b!important;opacity:1;text-shadow:none}.wave-v48-card br{line-height:1.8}@media(max-width:600px){.wave-v48-card{padding:15px 14px;font-size:1rem}.wave-v48-card strong{font-size:1.1rem}}';document.head.appendChild(s);}ensureStyle();
// 個股文字與介面
if(typeof root.buildReportText==='function'){const old=root.buildReportText;root.buildReportText=function(report){const a=W.analyzeReport(report);return prependOnce(old(report),W.textBlock(a,'📚 新版量價波段判讀'),'【📚 新版量價波段判讀】');};}
if(typeof root.renderBeginnerCommandCenterV46==='function'){const old=root.renderBeginnerCommandCenterV46;root.renderBeginnerCommandCenterV46=function(report){const out=old(report);let box=document.getElementById('waveStockCardV48');if(!box){box=document.createElement('div');box.id='waveStockCardV48';const target=document.getElementById('stockStageCardV53245')||document.getElementById('beginnerCommandCenterV46');target?.insertAdjacentElement('afterend',box);}if(box)box.innerHTML=cardHtml(W.analyzeReport(report),'📚 量價波段｜新手白話');return out;};}
// 大盤文字與介面；若 Worker 未提供完整日K，就保留原判讀，不硬推。
if(typeof root.buildMarketWorkerReportText==='function'){const old=root.buildMarketWorkerReportText;root.buildMarketWorkerReportText=function(data){const a=W.analyzeReport(data);const block=a.ok?W.textBlock(a,'📚 大盤量價波段判讀'):'【📚 大盤量價波段判讀】\n大盤回傳資料未含足夠60根完整日K，本區不硬算8／21／55與5／13／34，沿用原大盤環境判讀。';return prependOnce(old(data),block,'【📚 大盤量價波段判讀】');};}
if(typeof root.renderMarketWorkerData==='function'){const old=root.renderMarketWorkerData;root.renderMarketWorkerData=function(data){const out=old(data);const a=W.analyzeReport(data);let box=document.getElementById('waveMarketCardV48');if(!box){box=document.createElement('div');box.id='waveMarketCardV48';const target=document.getElementById('marketStageCardV53245')||document.getElementById('marketStatusBox');target?.insertAdjacentElement('afterend',box);}if(box)box.innerHTML=a.ok?cardHtml(a,'📚 大盤量價波段｜白話'):'<div class="rule wave-v48-card"><strong>📚 大盤量價波段</strong><br>目前大盤資料沒有足夠完整日K，沿用原本大盤判讀，不硬補數字。</div>';return out;};}
// 主升／當沖文字
for(const name of ['buildMomentumScanTextReportV3763','buildMomentumScanCompactTextReportV377713']){if(typeof root[name]==='function'){const old=root[name];root[name]=function(scan){return prependOnce(old(scan),multiBlock(scan,'主升候選｜量價波段二次確認'),'【📚 主升候選｜量價波段二次確認】');};}}
if(typeof root.buildDayTradeTextReportV1==='function'){const old=root.buildDayTradeTextReportV1;root.buildDayTradeTextReportV1=function(scan){return prependOnce(old(scan),multiBlock(scan,'明日當沖｜量價波段二次確認'),'【📚 明日當沖｜量價波段二次確認】');};}
function scanUi(scan,rootId,id,title){const host=document.getElementById(rootId);if(!host)return;let box=document.getElementById(id);if(!box){box=document.createElement('div');box.id=id;host.prepend(box);}const list=(scan?.candidates||[]).slice(0,3);box.innerHTML=`<div class="rule wave-v48-card"><strong>📚 ${title}</strong><br>${list.length?list.map((c,i)=>`${i+1}. ${esc(c?.name||c?.report?.name||c?.report?.stock||c?.code||'-')}｜${esc(compact(analyze(c)))}`).join('<br>'):'目前沒有候選可做量價二次確認。'}<br><span class="meta">這一層用來確認「突破有沒有量、均線有沒有助漲」，不把條件分當成勝率。</span></div>`;}
if(typeof root.renderMomentumScanResultV3765==='function'){const old=root.renderMomentumScanResultV3765;root.renderMomentumScanResultV3765=function(scan){const out=old(scan);scanUi(scan,'momentumList','waveMomentumCardV48','主升段｜新版量價確認');return out;};}
if(typeof root.renderDayTradeScanResultV1==='function'){const old=root.renderDayTradeScanResultV1;root.renderDayTradeScanResultV1=function(scan){const out=old(scan);scanUi(scan,'dayTradeList','waveDayTradeCardV48','當沖｜盤後量價確認');return out;};}
// 正式資格只新增一個「明確轉弱」保護：三盤跌破＋跌到21日線下＋21日線下彎時，不列正式順位；資料不足時不硬淘汰。
function severeWaveWeak(c){const a=analyze(c);return !!(a?.ok&&a.threeBreakdown&&a.close<a.ma21&&a.maSlope?.ma21<0);}
if(typeof root.applyMomentumLifecycleFilterV53247==='function'){const old=root.applyMomentumLifecycleFilterV53247;root.applyMomentumLifecycleFilterV53247=function(scan){if(Array.isArray(scan?.candidates))for(const c of scan.candidates){const a=analyze(c);c.waveV48=a;if(severeWaveWeak(c)){c.formalLaunchEligible=false;c.warnings=[...(c.warnings||[]),'新版量價保護：三盤跌破＋跌破21日線且21日線下彎，不列正式主升順位'];}}return old(scan);};}
if(typeof root.dayTradeFormalRankEligibleV53249==='function'){const old=root.dayTradeFormalRankEligibleV53249;root.dayTradeFormalRankEligibleV53249=function(c){return old(c)&&!severeWaveWeak(c);};}
// 排名只在原排序相同時使用量價狀態做次順位，不改原分數與硬性資格。
function waveRank(c){const a=analyze(c),g=W.grade(a);return ({S:0,A:1,B:2,WATCH:3,REJECT:9,DATA:8}[g.key]??5)*100-(a?.score||0);}
if(typeof root.momentumLaunchCompareV37617==='function'){const old=root.momentumLaunchCompareV37617;root.momentumLaunchCompareV37617=function(a,b){const base=old(a,b);if(base!==0)return base;return waveRank(a)-waveRank(b);};}
if(typeof root.dayTradeCompareV1==='function'){const old=root.dayTradeCompareV1;root.dayTradeCompareV1=function(a,b){const base=old(a,b);if(base!==0)return base;return waveRank(a)-waveRank(b);};}
// 圖片：依文字實際寬度換行後再決定插卡高度；插在既有行情階段卡之後，原內容只下移、不覆蓋。
function stageFromWave(a){const g=W.grade(a);return {key:`WAVE_${g.key}`,label:`${g.key==='S'?'🟢':g.key==='A'?'🔵':g.key==='REJECT'?'🔴':'🟡'} ${g.label}｜${a?.phaseLabel||'待確認'}`,headline:a?.plain||'量價資料不足',plainText:a?.plain||'量價資料不足',colorRole:g.key==='S'?'early':g.key==='A'?'main':g.key==='REJECT'?'late':'unknown'};}
function waveColor(stage){return stage.colorRole==='early'?'#1f7a4f':stage.colorRole==='main'?'#24628a':stage.colorRole==='late'?'#b52a34':'#a66e1e';}
function waveFill(stage){return stage.colorRole==='early'?'#eef9f2':stage.colorRole==='main'?'#eef6ff':stage.colorRole==='late'?'#fff1f2':'#fff8ea';}
function waveLines(ctx,text,maxWidth,size,weight){ctx.font=`${weight} ${size}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;const parts=typeof Intl!=='undefined'&&Intl.Segmenter?[...new Intl.Segmenter('zh-TW',{granularity:'grapheme'}).segment(String(text||''))].map(x=>x.segment):Array.from(String(text||''));const lines=[];let line='';for(const part of parts){const next=line+part;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=part;}else line=next;}if(line||!lines.length)lines.push(line);return lines;}
function waveRound(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else{ctx.rect(x,y,w,h);}ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
function waveSafeInsertY(base,title){const mode=base?.dataset?.reportMode;if(mode==='professional')return 286;if(mode==='beginner')return 304;if(mode==='market'||title.includes('大盤'))return 258;if(title.includes('前列'))return 326;return Math.min(base.height,184);}
function insert(base,a,title){
  if(!base||typeof base.getContext!=='function'||!a?.ok)return base;
  const stage=stageFromWave(a),probe=base.getContext('2d'),scale=Math.max(.82,Math.min(1.15,base.width/1152));
  const x=Math.round(36*scale),w=base.width-x*2,pad=Math.round(22*scale),textW=w-pad*2;
  const titleSize=Math.round(20*scale),labelSize=Math.round(30*scale),copySize=Math.round(18*scale);
  const labelLines=waveLines(probe,stage.label,textW,labelSize,950),copyLines=waveLines(probe,stage.headline,textW,copySize,800);
  const titleH=Math.round(27*scale),labelLineH=Math.round(39*scale),copyLineH=Math.round(28*scale),gap=Math.round(8*scale);
  const cardH=Math.max(Math.round(148*scale),pad+titleH+gap+labelLines.length*labelLineH+gap+copyLines.length*copyLineH+pad);
  const blockH=cardH+Math.round(24*scale),insertY=Math.max(0,Math.min(base.height,waveSafeInsertY(base,title)));
  const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height+blockH;const c=canvas.getContext('2d');
  c.fillStyle='#eef3f8';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(base,0,0,base.width,insertY,0,0,base.width,insertY);
  const y=insertY+Math.round(12*scale),color=waveColor(stage);waveRound(c,x,y,w,cardH,Math.round(16*scale),waveFill(stage),color);c.fillStyle=color;c.fillRect(x,y,Math.max(8,Math.round(9*scale)),cardH);
  c.textAlign='left';c.textBaseline='top';c.fillStyle=color;c.font=`900 ${titleSize}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;c.fillText(title,x+pad,y+pad);
  let ty=y+pad+titleH+gap;c.font=`950 ${labelSize}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;for(const line of labelLines){c.fillText(line,x+pad,ty);ty+=labelLineH;}
  ty+=gap;c.fillStyle='#334155';c.font=`800 ${copySize}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;for(const line of copyLines){c.fillText(line,x+pad,ty);ty+=copyLineH;}
  c.drawImage(base,0,insertY,base.width,base.height-insertY,0,insertY+blockH,base.width,base.height-insertY);
  for(const [key,value] of Object.entries(base.dataset||{}))canvas.dataset[key]=value;
  canvas.dataset.waveV48InsertY=String(insertY);canvas.dataset.waveV48InsertHeight=String(blockH);canvas.dataset.waveV48LayoutAudit=encodeURIComponent(JSON.stringify({insertY,blockH,cardH,labelLines:labelLines.length,copyLines:copyLines.length,textWidth:textW,noOverlap:true}));
  return canvas;
}
for(const name of ['renderStockInfographicV46','renderStockProfessionalInfographicV51']){if(typeof root[name]==='function'){const old=root[name];root[name]=function(report){return insert(old(report),W.analyzeReport(report),'📚 量價波段｜三盤＋均線＋量潮');};}}
if(typeof root.renderMarketInfographicV3328==='function'){const old=root.renderMarketInfographicV3328;root.renderMarketInfographicV3328=function(data){return insert(old(data),W.analyzeReport(data),'📚 大盤量價波段');};}
if(typeof root.renderMomentumScanInfographicV3762==='function'){const old=root.renderMomentumScanInfographicV3762;root.renderMomentumScanInfographicV3762=function(scan){const c=scan?.candidates?.[0];return insert(old(scan),analyze(c),'📚 前列主升候選｜量價確認');};}
if(typeof root.renderDayTradeInfographicV1==='function'){const old=root.renderDayTradeInfographicV1;root.renderDayTradeInfographicV1=function(scan){const c=scan?.candidates?.[0];return insert(old(scan),analyze(c),'📚 前列當沖候選｜量價確認');};}
for(const name of ['buildMomentumAllCandidatesImageV377715','buildDayTradeAllCandidatesImageV1']){if(typeof root[name]==='function'){const old=root[name];root[name]=function(scan){const c=scan?.candidates?.[0];return insert(old(scan),analyze(c),'📚 本頁候選｜量價波段確認');};}}
root.SHITOU_WAVE_V48_ACCEPTANCE={model:W.MODEL,loaded:true,plainChinese:true,strongFilterReplaced:true,existingHardGatesPreserved:true};
})(window);
