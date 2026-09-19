/* R5.3.2.4.14-R4.5 research candidate: full-screen stock reports and restored beginner trident. */
(function(){
'use strict';

const RELEASE=window.R45_RELEASE_LABEL||'石頭少爺 Agent V47 研究候選版｜R5.3.2.4.14-R4.5';
const FILE_VERSION=window.R45_FILE_VERSION||'V47_R5.3.2.4.14-R4.5_研究候選';
const E=window.ShitouTechnicalEvidenceR45;
const DETAIL={width:1284,height:2778,top:92,bottom:70,side:22};
const IPHONE_12_PRO_MAX={width:1284,height:2778,minReadableScale:.90};
const SUMMARY={width:1200,height:1600,top:188,bottom:74,side:44};
const original={
  show:window.showInfographicPreviewV3328,
  stockGenerator:window.generateStockImageByModeV51,
  marketRender:window.renderMarketInfographicV3328,
  momentumRender:window.renderMomentumScanInfographicV3762,
  daytradeRender:window.renderDayTradeInfographicV1,
  watermark:window.applyAntiTheftWatermarkV3761
};
let previewSet=null;
let previewUrl=null;

function canvas(width,height,fill='#f3f6fa'){
  const out=document.createElement('canvas');out.width=width;out.height=height;
  const context=out.getContext('2d');context.fillStyle=fill;context.fillRect(0,0,width,height);
  context.imageSmoothingEnabled=true;if('imageSmoothingQuality' in context)context.imageSmoothingQuality='high';
  return out;
}

function blob(source){
  return new Promise((resolve,reject)=>{
    try{source.toBlob(value=>value?resolve(value):reject(new Error('PNG轉換失敗')),'image/png');}
    catch(error){reject(error);}
  });
}

function download(value,name){
  const url=URL.createObjectURL(value),anchor=document.createElement('a');anchor.href=url;anchor.download=name;
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
}

function u16(value){return [value&255,(value>>>8)&255];}
function u32(value){return [value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255];}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(entries){
  const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
  for(const entry of entries){
    const name=encoder.encode(entry.name),size=entry.bytes.length,crc=crc32(entry.bytes);
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0),...name]);
    chunks.push(local,entry.bytes);
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]));
    offset+=local.length+size;
  }
  let centralSize=0;for(const part of central){centralSize+=part.length;chunks.push(part);}
  chunks.push(new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(centralSize),...u32(offset),...u16(0)]));
  return new Blob(chunks,{type:'application/zip'});
}

function safeName(value){
  const base=typeof window.sanitizeFilenameV3328==='function'?window.sanitizeFilenameV3328(value):String(value||'報告').replace(/[\\/:*?"<>|]+/g,'_');
  return base.replace(/R5\.3\.2\.4\.13-R4\.4[^.\s]*/g,'R5.3.2.4.14-R4.5');
}

function dateOf(value){return String(value||'').replace(/\D/g,'').slice(0,8)||'latest';}
function reportDate(report){return report?.closeDate||report?.dataDate||null;}

function fitText(context,text,x,y,width,{max=30,min=14,weight=800,color='#17324d',align='left'}={}){
  context.textAlign=align;context.textBaseline='alphabetic';context.fillStyle=color;
  for(let size=max;size>=min;size--){
    context.font=`${weight} ${size}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    if(context.measureText(String(text||'')).width<=width){context.fillText(String(text||''),x,y);return size;}
  }
  context.font=`${weight} ${min}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  context.fillText(String(text||''),x,y);return min;
}

function wrapLines(context,text,width,size=22,weight=750){
  context.font=`${weight} ${size}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  const parts=typeof Intl!=='undefined'&&Intl.Segmenter?[...new Intl.Segmenter('zh-TW',{granularity:'grapheme'}).segment(String(text||''))].map(item=>item.segment):Array.from(String(text||''));
  const lines=[];let line='';
  for(const part of parts){
    if(part==='\n'){lines.push(line);line='';continue;}
    const test=line+part;
    if(line&&context.measureText(test).width>width){lines.push(line);line=part;}else line=test;
  }
  if(line||!lines.length)lines.push(line);return lines;
}

function rounded(context,x,y,width,height,radius,fill,stroke='#d1dbe7'){
  context.beginPath();context.roundRect(x,y,width,height,radius);context.fillStyle=fill;context.fill();
  if(stroke){context.strokeStyle=stroke;context.lineWidth=2;context.stroke();}
}

function copyCanvas(source,height=source.height){
  const out=canvas(source.width,height);out.getContext('2d').drawImage(source,0,0,source.width,height,0,0,source.width,height);
  for(const [key,value] of Object.entries(source.dataset||{}))out.dataset[key]=value;
  return out;
}

function removeScanIndustryAppend(source,scan){
  if(!source||!scan?.industryContext||source.height<=165)return source;
  return copyCanvas(source,source.height-165);
}

function evidenceFor(candidate,kind){
  const report=candidate?.report||candidate||{};
  const evidence=E?E.analyze(report,{kind}):null;
  const phase=E?E.existingPhase({...report,stageSafety:candidate?.stageSafety,stage:candidate?.stage}):{label:'階段待確認'};
  return {report,evidence,phase};
}

function evidenceLines(candidate,kind){
  const {report,evidence,phase}=evidenceFor(candidate,kind);
  const values=evidence?.ema?.values||{};
  const value=period=>values[period]?.available?E.price(values[period].value):'資料不足';
  const rsi=evidence?.rsi5?.available?`${E.price(evidence.rsi5.value,1)}（${evidence.rsi5.date||'日期未提供'}）`:'資料不足';
  const kd=evidence?.kd?.available?`K ${E.price(evidence.kd.k,1)}／D ${E.price(evidence.kd.d,1)}｜${evidence.kd.cross}`:'資料不足';
  return [
    `${report?.name||candidate?.name||'股票'}（${report?.stock||report?.code||'-'}）｜現價 ${Number.isFinite(Number(report?.close??candidate?.close))?E.price(report?.close??candidate?.close):'資料不足'}｜日RSI 5T ${rsi}`,
    `行情階段：${phase?.label||'階段待確認'}｜EMA21 ${value(21)}｜EMA50 ${value(50)}｜EMA200 ${value(200)}`,
    `KD(9,3,3)：${kd}｜${evidence?.available?`技術資料日 ${evidence.dataQuality.dataDate}`:'日K資料不足'}｜補充證據不計分、不改資格`
  ];
}

function appendEvidence(source,candidates,kind,title,{compact=false}={}){
  const rows=(candidates||[]).map(candidate=>evidenceLines(candidate,kind));
  if(!rows.length)return source;
  const pad=32,titleH=compact?60:78,rowH=compact?105:126,footer=compact?26:38,extra=titleH+rows.length*rowH+footer;
  const out=canvas(source.width,source.height+extra,'#eef3f8'),context=out.getContext('2d');context.drawImage(source,0,0);
  const y0=source.height;context.fillStyle='#eef3f8';context.fillRect(0,y0,source.width,extra);
  context.fillStyle='#123a5a';context.fillRect(0,y0,source.width,titleH);
  fitText(context,`${title}｜EMA／KD與日RSI 5T補充證據`,pad,y0+(compact?39:48),source.width-pad*2,{max:compact?25:28,min:18,weight:950,color:'#fff'});
  rows.forEach((lines,index)=>{
    const y=y0+titleH+index*rowH+(compact?5:8);rounded(context,pad,y,source.width-pad*2,rowH-(compact?10:14),13,'#fff');
    fitText(context,lines[0],pad+18,y+(compact?25:31),source.width-pad*2-36,{max:compact?19:20,min:13,weight:950,color:'#142f4c'});
    fitText(context,lines[1],pad+18,y+(compact?53:65),source.width-pad*2-36,{max:compact?17:18,min:12,weight:850,color:'#314f6c'});
    fitText(context,lines[2],pad+18,y+(compact?80:96),source.width-pad*2-36,{max:compact?15:16,min:11,weight:800,color:'#5a687a'});
  });
  fitText(context,'研究候選補充層｜資料不足明示，不改原始策略。',pad,out.height-(compact?8:15),source.width-pad*2,{max:compact?12:14,min:10,weight:800,color:'#69788b'});
  return out;
}

function prepareStockBaseForIphone(source){
  const assistantHeight=Math.max(0,Number(source?.dataset?.r45AssistantAppendHeight)||0);
  const originalFooterHeight=source?.dataset?.reportMode?138:0;
  const targetHeight=Math.max(1,source.height-assistantHeight-originalFooterHeight);
  const out=copyCanvas(source,targetHeight);
  out.dataset.r45RemovedAssistantHeight=String(assistantHeight);
  out.dataset.r45RemovedOriginalFooterHeight=String(originalFooterHeight);
  return out;
}

function appendStockCompactEvidence(source,report){
  const p=report?.shitoAssistantEvidence?.anchoredVolumeProfileEvidence||{},evidence=E?E.analyze(report||{},{kind:'stock'}):null,values=evidence?.ema?.values||{};
  const price=value=>Number.isFinite(Number(value))?(E?E.price(value):Number(value).toFixed(2)):'資料不足';
  const zone=p.status==='pass'?`${price(p.pocLower)}～${price(p.pocUpper)}`:(p.label||'資料不足');
  const rsi=evidence?.rsi5?.available?`${price(evidence.rsi5.value)}（${evidence.rsi5.date||'日期未提供'}）`:'資料不足';
  const ema=period=>values[period]?.available?price(values[period].value):'資料不足';
  const kd=evidence?.kd?.available?`K ${price(evidence.kd.k)}／D ${price(evidence.kd.d)}｜${evidence.kd.cross}`:'資料不足';
  const mode=source?.dataset?.reportMode;
  if(mode==='professional'||mode==='beginner'){
    const out=copyCanvas(source),context=out.getContext('2d');
    const x=590,y=mode==='professional'?132:166,width=526,height=mode==='professional'?136:124;
    rounded(context,x,y,width,height,13,'#f8fbff','#8da3ba');context.fillStyle='#27648a';context.fillRect(x,y,8,height);
    fitText(context,`📍 主要成交密集區 ${zone}`,x+20,y+25,width-34,{max:19,min:14,weight:950,color:'#153a67'});
    fitText(context,`日RSI 5T ${rsi}｜EMA21 ${ema(21)}`,x+20,y+50,width-34,{max:16,min:11,weight:950,color:'#314f6c'});
    fitText(context,`EMA50 ${ema(50)}｜EMA200 ${ema(200)}`,x+20,y+75,width-34,{max:16,min:11,weight:950,color:'#314f6c'});
    fitText(context,`KD(9,3,3) ${kd}`,x+20,y+99,width-34,{max:15,min:10,weight:900,color:'#586a7e'});
    fitText(context,`資料日 ${evidence?.dataQuality?.dataDate||report?.closeDate||'未提供'}｜補充證據不計分`,x+20,y+height-7,width-34,{max:11,min:9,weight:900,color:'#66758a'});
    out.dataset.r45StockCompactPanel='stage-right:major-volume-zone,ema,kd,rsi5';
    if(mode==='professional')return out;

    const trident=typeof window.tridentEngineV361==='function'?window.tridentEngineV361(report):null;
    const triPrice=item=>item&&Number.isFinite(Number(item.value))?`${price(item.value)} 元`:'資料不足';
    const triDetail=item=>item&&Number.isFinite(Number(item.value))?`${item.date||'日期未提供'}${Number.isFinite(Number(item.volRatio))?`｜量 ${Number(item.volRatio).toFixed(2)}×`:''}`:'未取得有效大量K';
    const extra=205,extended=canvas(out.width,out.height+extra,'#eef3f8'),c=extended.getContext('2d'),y0=out.height;
    c.drawImage(out,0,0);c.fillStyle='#eef3f8';c.fillRect(0,y0,extended.width,extra);
    c.fillStyle='#123a5a';c.fillRect(0,y0,extended.width,50);
    fitText(c,'🔱 三叉戟價位分析｜壓力・支撐・候選預備',32,y0+35,extended.width-64,{max:25,min:18,weight:950,color:'#fff'});
    const cards=[
      {icon:'🧱',label:'壓力線',value:triPrice(trident?.pressure),detail:triDetail(trident?.pressure),fill:'#fff7ed',stroke:'#e6a14d',color:'#a85a08'},
      {icon:'🛡️',label:'支撐線',value:triPrice(trident?.support),detail:triDetail(trident?.support),fill:'#f0fdf4',stroke:'#5eb480',color:'#16724a'},
      {icon:'📌',label:'候選預備線',value:triPrice(trident?.preparatory),detail:triDetail(trident?.preparatory),fill:'#faf5ff',stroke:'#9a79c9',color:'#6c43a3'}
    ];
    cards.forEach((item,index)=>{
      const cardX=30+index*367,cardY=y0+58,cardWidth=357,cardHeight=96;
      rounded(c,cardX,cardY,cardWidth,cardHeight,13,item.fill,item.stroke);
      fitText(c,`${item.icon} ${item.label}`,cardX+17,cardY+26,cardWidth-34,{max:19,min:15,weight:950,color:item.color});
      fitText(c,item.value,cardX+17,cardY+57,cardWidth-34,{max:24,min:18,weight:950,color:'#183653'});
      fitText(c,item.detail,cardX+17,cardY+82,cardWidth-34,{max:13,min:10,weight:850,color:'#64748b'});
    });
    fitText(c,'壓＝最近戰術壓力｜撐＝最近戰術支撐｜預＝候選備用線，不等同正式支撐；只補充證據，不改分數與資格。',32,y0+174,extended.width-64,{max:16,min:11,weight:900,color:'#52677d'});
    fitText(c,trident?.available?'量能大於左一根：紅K取低點、綠K取高點；資料不足時明示，不自行猜測。':'逐日OHLCV資料不足，三叉戟暫不計算。',32,y0+197,extended.width-64,{max:14,min:10,weight:850,color:'#68788b'});
    for(const [key,value] of Object.entries(out.dataset||{}))extended.dataset[key]=value;
    extended.dataset.r45TridentPanel='bottom:pressure,support,preparatory';
    const auditItem=item=>item&&Number.isFinite(Number(item.value))?{value:Number(item.value),date:item.date||null,volRatio:Number.isFinite(Number(item.volRatio))?Number(item.volRatio):null}:null;
    extended.dataset.r45TridentAudit=encodeURIComponent(JSON.stringify({source:'tridentEngineV361',available:trident?.available===true,key:trident?.key||'UNAVAILABLE',pressure:auditItem(trident?.pressure),support:auditItem(trident?.support),preparatory:auditItem(trident?.preparatory),invented:false}));
    return extended;
  }
  return source;
}

function backgroundRatio(source,y){
  const context=source.getContext('2d',{willReadFrequently:true});
  const row=context.getImageData(0,Math.max(0,Math.min(source.height-1,y)),source.width,1).data;
  const base=[row[4],row[5],row[6]];let similar=0,total=0;
  // Only accept a near-exact background match. A loose threshold can mistake a
  // white card interior for the pale page background and split the card.
  for(let x=4;x<source.width;x+=12){const i=x*4,d=Math.abs(row[i]-base[0])+Math.abs(row[i+1]-base[1])+Math.abs(row[i+2]-base[2]);if(d<14)similar++;total++;}
  return total?similar/total:0;
}

function safeCut(source,start,desired){
  // Detailed candidate cards can be tall. Search far enough back to find the
  // real inter-card gutter instead of splitting the last visible card.
  const lower=Math.max(start+420,desired-1100);let best=desired,bestScore=-1;
  for(let y=desired;y>=lower;y-=3){
    let score=0;for(let offset=-3;offset<=3;offset+=3)score+=backgroundRatio(source,y+offset);
    if(score>bestScore){bestScore=score;best=y;}
    if(score>=2.75)return y;
  }
  return best;
}

function paginateDetailed(source,{title,date='資料日期依原報告',watermark=false}={}){
  if(!source)throw new Error('原始圖片畫布不存在');
  const scale=(DETAIL.width-DETAIL.side*2)/source.width;
  const maxSourceHeight=Math.floor((DETAIL.height-DETAIL.top-DETAIL.bottom)/scale);
  const segments=[];let start=0;
  while(source.height-start>maxSourceHeight){const cut=safeCut(source,start,start+maxSourceHeight);segments.push([start,Math.max(start+1,cut)]);start=Math.max(start+1,cut);}
  segments.push([start,source.height]);
  const pages=segments.map(([from,to],index)=>{
    const out=canvas(DETAIL.width,DETAIL.height,'#eef3f8'),context=out.getContext('2d');
    context.fillStyle='#123a5a';context.fillRect(0,0,DETAIL.width,DETAIL.top-10);
    fitText(context,title,DETAIL.side,48,DETAIL.width-DETAIL.side*2-210,{max:31,min:20,weight:950,color:'#fff'});
    fitText(context,`第 ${index+1}／${segments.length} 頁`,DETAIL.width-DETAIL.side,48,190,{max:24,min:18,weight:900,color:'#d9edff',align:'right'});
    fitText(context,`${date||'資料日期依原報告'}｜${RELEASE}`,DETAIL.side,76,DETAIL.width-DETAIL.side*2,{max:17,min:11,weight:750,color:'#d5e5f4'});
    const sliceHeight=to-from,drawHeight=Math.round(sliceHeight*scale);
    context.drawImage(source,0,from,source.width,sliceHeight,DETAIL.side,DETAIL.top,DETAIL.width-DETAIL.side*2,drawHeight);
    context.fillStyle='#123a5a';context.fillRect(0,DETAIL.height-DETAIL.bottom,DETAIL.width,DETAIL.bottom);
    fitText(context,'完整原圖安全分頁｜頁面間像素連續、沒有裁掉原始內容｜技術分析僅供研究參考',DETAIL.side,DETAIL.height-27,DETAIL.width-DETAIL.side*2,{max:17,min:12,weight:800,color:'#eef6ff'});
    if(watermark&&typeof original.watermark==='function')original.watermark(out,title.includes('大盤')?'market':'stock');
    out.dataset.r45PageAudit=encodeURIComponent(JSON.stringify({size:`${out.width}x${out.height}`,page:index+1,pages:segments.length,sourceFrom:from,sourceTo:to,sourceHeight:source.height,noPixelGap:index===0?from===0:segments[index-1][1]===from}));
    return out;
  });
  return {pages,segments,sourceHeight:source.height,size:'1284x2778'};
}

function singleLongDetailed(source,{title,date='資料日期依原報告',watermark=false}={}){
  if(!source)throw new Error('原始圖片畫布不存在');
  const scale=(DETAIL.width-DETAIL.side*2)/source.width;
  const drawHeight=Math.ceil(source.height*scale);
  const height=DETAIL.top+drawHeight+DETAIL.bottom;
  const out=canvas(DETAIL.width,height,'#eef3f8'),context=out.getContext('2d');
  context.fillStyle='#123a5a';context.fillRect(0,0,DETAIL.width,DETAIL.top-10);
  fitText(context,title,DETAIL.side,48,DETAIL.width-DETAIL.side*2,{max:31,min:18,weight:950,color:'#fff'});
  fitText(context,`${date||'資料日期依原報告'}｜${RELEASE}`,DETAIL.side,76,DETAIL.width-DETAIL.side*2,{max:17,min:11,weight:750,color:'#d5e5f4'});
  context.drawImage(source,0,0,source.width,source.height,DETAIL.side,DETAIL.top,DETAIL.width-DETAIL.side*2,drawHeight);
  context.fillStyle='#123a5a';context.fillRect(0,height-DETAIL.bottom,DETAIL.width,DETAIL.bottom);
  fitText(context,'單一張完整長圖｜原始內容連續保留、不拆頁｜技術分析僅供研究參考',DETAIL.side,height-27,DETAIL.width-DETAIL.side*2,{max:17,min:12,weight:800,color:'#eef6ff'});
  if(watermark&&typeof original.watermark==='function')original.watermark(out,title.includes('大盤')?'market':'stock');
  out.dataset.r45SingleAudit=encodeURIComponent(JSON.stringify({size:`${out.width}x${out.height}`,pages:1,sourceFrom:0,sourceTo:source.height,sourceHeight:source.height,complete:true}));
  return {pages:[out],segments:[[0,source.height]],sourceHeight:source.height,size:`${out.width}x${out.height}`,singleLong:true};
}

function fitIphoneStockReport(source,{title,date='資料日期依原報告',watermark=false}={}){
  if(!source)throw new Error('個股原始圖片畫布不存在');
  const scale=Math.min(IPHONE_12_PRO_MAX.width/source.width,IPHONE_12_PRO_MAX.height/source.height);
  if(scale<IPHONE_12_PRO_MAX.minReadableScale){
    const fallback=paginateDetailed(source,{title,date,watermark});
    fallback.iphoneFallback=true;fallback.fitScale=scale;return fallback;
  }
  const out=canvas(IPHONE_12_PRO_MAX.width,IPHONE_12_PRO_MAX.height,'#eef3f8'),context=out.getContext('2d');
  const drawWidth=Math.round(source.width*scale),drawHeight=Math.round(source.height*scale),x=Math.floor((out.width-drawWidth)/2),y=Math.floor((out.height-drawHeight)/2);
  context.drawImage(source,0,0,source.width,source.height,x,y,drawWidth,drawHeight);
  if(watermark&&typeof original.watermark==='function')original.watermark(out,'stock');
  out.dataset.r45IphoneAudit=encodeURIComponent(JSON.stringify({size:`${out.width}x${out.height}`,sourceSize:`${source.width}x${source.height}`,scale:Number(scale.toFixed(4)),contentBox:{x,y,width:drawWidth,height:drawHeight},complete:true,overlap:false}));
  return {pages:[out],segments:[[0,source.height]],sourceHeight:source.height,size:'1284x2778',singleLong:true,iphoneFullScreen:true,fitScale:scale};
}

function candidateCode(candidate){return String(candidate?.report?.stock||candidate?.report?.code||candidate?.code||'-');}
function candidateName(candidate){return String(candidate?.report?.name||candidate?.name||candidateCode(candidate));}
function candidateClose(candidate){const value=Number(candidate?.close??candidate?.report?.close);return Number.isFinite(value)?value:null;}
function candidateRsi(candidate){const value=Number(candidate?.rsi??candidate?.report?.dailyRsi5??candidate?.report?.dailyRsi);return Number.isFinite(value)?value:null;}
function candidatePhase(candidate){return E?E.existingPhase({...candidate?.report,stageSafety:candidate?.stageSafety,stage:candidate?.stage}).label:(candidate?.stageSafety?.label||candidate?.stage?.label||'階段待確認');}
function candidateQualification(candidate,kind){
  if(kind==='momentum')return candidate?.formalLaunchEligible===true?'正式候選':candidate?.formalLaunchEligible===false?(candidate?.launchRole?.label||candidate?.stage?.label||'條件式觀察'):(candidate?.stage?.label||'原始入列');
  return candidate?.actionGate?.top3Eligible===true?'正式候選':candidate?.actionGate?.label||candidate?.stageSafety?.label||'條件式觀察';
}
function category(candidate){
  const fields=[candidate?.strategyType,candidate?.selectionType,candidate?.entryMode,candidate?.stage?.label,candidate?.stageSafety?.label,candidate?.action,candidate?.patternLabel,candidate?.mainAdvanceStage?.label].filter(Boolean).join('｜');
  if(/低位|轉強|起漲/.test(fields))return '低位轉強';
  if(/突破|站穩|確認/.test(fields))return '突破確認';
  if(/延續|續強|強勢/.test(fields))return '強勢延續';
  return candidate?.strategyType||candidate?.selectionType||candidate?.stage?.label||'其他型態';
}

function summaryRows(scan,kind){
  const candidates=Array.isArray(scan?.candidates)?scan.candidates:[];
  return candidates.map((candidate,index)=>({
    index,code:candidateCode(candidate),name:candidateName(candidate),grade:String(candidate?.grade||'-').toUpperCase(),
    close:candidateClose(candidate),rsi:candidateRsi(candidate),phase:candidatePhase(candidate),
    qualification:candidateQualification(candidate,kind),category:category(candidate),date:reportDate(candidate?.report)||scan?.dataDate||scan?.createdAt||null
  }));
}

function pageHeader(context,title,scan,index,total,kind,count){
  const gradient=context.createLinearGradient(0,0,SUMMARY.width,0);gradient.addColorStop(0,kind==='momentum'?'#153b68':'#174c43');gradient.addColorStop(1,'#27648a');
  context.fillStyle=gradient;context.fillRect(0,0,SUMMARY.width,150);
  fitText(context,title,SUMMARY.side,52,SUMMARY.width-SUMMARY.side*2-170,{max:34,min:22,weight:950,color:'#fff'});
  fitText(context,`第 ${index}／${total} 頁`,SUMMARY.width-SUMMARY.side,52,150,{max:23,min:17,weight:900,color:'#e2f1ff',align:'right'});
  fitText(context,`原始入列 ${count} 檔｜行情 ${scan?.dataDate||scan?.createdAt||'日期依各股'}｜${RELEASE}`,SUMMARY.side,91,SUMMARY.width-SUMMARY.side*2,{max:17,min:10,weight:750,color:'#d8e8f5'});
  fitText(context,'每檔：名稱／代號／原始S-A-B／最新有效收盤／RSI 5T／行情階段／原始資格',SUMMARY.side,128,SUMMARY.width-SUMMARY.side*2,{max:17,min:11,weight:800,color:'#fff4bd'});
}

function buildSummaryPages(scan,kind){
  const rows=summaryRows(scan,kind),order=['突破確認','強勢延續','低位轉強'];
  const categories=[...new Set(rows.map(row=>row.category))];
  const groups=[...order.filter(value=>categories.includes(value)),...categories.filter(value=>!order.includes(value))].map(name=>({name,rows:rows.filter(row=>row.category===name)}));
  const tokens=[];for(const group of groups){tokens.push({type:'group',name:group.name,count:group.rows.length});for(const row of group.rows)tokens.push({type:'row',row,group:group.name});}
  if(!tokens.length)tokens.push({type:'empty'});
  const pageCapacity=SUMMARY.height-SUMMARY.top-SUMMARY.bottom;
  const pagesTokens=[];let current=[],used=0,lastGroup=null;
  for(const token of tokens){
    const height=token.type==='group'?48:token.type==='row'?94:160;
    if(used+height>pageCapacity&&current.length){pagesTokens.push(current);current=[];used=0;if(token.type==='row'&&lastGroup){current.push({type:'group',name:`${lastGroup}（續）`,count:null});used+=48;}}
    current.push(token);used+=height;if(token.type==='group')lastGroup=token.name;
  }
  if(current.length)pagesTokens.push(current);
  const title=kind==='momentum'?'主升段｜全部結果摘要':'當沖｜全部結果摘要';
  const rendered=[];
  const pages=pagesTokens.map((pageTokens,pageIndex)=>{
    const out=canvas(SUMMARY.width,SUMMARY.height,'#f2f6fa'),context=out.getContext('2d');pageHeader(context,title,scan,pageIndex+1,pagesTokens.length,kind,rows.length);
    let y=SUMMARY.top;
    for(const token of pageTokens){
      if(token.type==='group'){
        context.fillStyle='#dce9f5';context.fillRect(SUMMARY.side,y,SUMMARY.width-SUMMARY.side*2,40);
        fitText(context,`${token.name}${token.count===null?'':`｜${token.count} 檔`}`,SUMMARY.side+14,y+29,SUMMARY.width-SUMMARY.side*2-28,{max:22,min:16,weight:950,color:'#163b60'});y+=48;continue;
      }
      if(token.type==='empty'){
        rounded(context,SUMMARY.side,y,SUMMARY.width-SUMMARY.side*2,126,16,'#fff');fitText(context,'本次原始報告沒有入列股票。',SUMMARY.width/2,y+72,SUMMARY.width-SUMMARY.side*2-60,{max:27,min:20,weight:900,color:'#66758a',align:'center'});y+=160;continue;
      }
      const row=token.row,gradeColor=row.grade==='S'?'#8f2f68':row.grade==='A'?'#176a45':row.grade==='B'?'#a7640a':'#677386';
      rounded(context,SUMMARY.side,y,SUMMARY.width-SUMMARY.side*2,86,14,'#fff');context.fillStyle=gradeColor;context.fillRect(SUMMARY.side,y,8,86);
      fitText(context,`${row.index+1}. ${row.name}（${row.code}）`,SUMMARY.side+22,y+31,430,{max:23,min:15,weight:950,color:'#162f4b'});
      fitText(context,`${row.grade}級`,SUMMARY.side+465,y+31,88,{max:22,min:16,weight:950,color:gradeColor});
      fitText(context,row.close===null?'收盤：資料不足':`收盤 ${E?E.price(row.close):row.close}`,SUMMARY.side+565,y+31,210,{max:20,min:14,weight:900,color:'#bd303d'});
      fitText(context,row.rsi===null?'RSI 5T：資料不足':`RSI 5T ${E?E.price(row.rsi,1):row.rsi}`,SUMMARY.side+790,y+31,210,{max:20,min:13,weight:900,color:'#a65f08'});
      fitText(context,`階段：${row.phase}`,SUMMARY.side+22,y+67,510,{max:17,min:12,weight:800,color:'#315777'});
      fitText(context,`資格：${row.qualification}`,SUMMARY.side+565,y+67,500,{max:17,min:11,weight:850,color:'#4e3f70'});
      rendered.push(row.code);y+=94;
    }
    context.fillStyle='#153b5b';context.fillRect(0,SUMMARY.height-SUMMARY.bottom,SUMMARY.width,SUMMARY.bottom);
    fitText(context,`數量核對 ${rows.length}／${rendered.length}（累計）｜3:4安全分頁｜每檔資料不跨頁`,SUMMARY.side,SUMMARY.height-39,SUMMARY.width-SUMMARY.side*2,{max:17,min:12,weight:800,color:'#edf6ff'});
    out.dataset.r45SummaryAudit=encodeURIComponent(JSON.stringify({size:`${out.width}x${out.height}`,page:pageIndex+1,pages:pagesTokens.length,expected:rows.length,renderedOnAllPages:rendered.length}));
    return out;
  });
  const expected=rows.map(row=>row.code),ok=expected.length===rendered.length&&expected.every(code=>rendered.includes(code))&&new Set(rendered).size===rendered.length;
  pages.forEach(page=>page.dataset.r45SummaryFinalAudit=encodeURIComponent(JSON.stringify({expected:expected.length,rendered:rendered.length,unique:new Set(rendered).size,ok})));
  return {pages,rows,rendered,ok,size:'1200x1600'};
}

async function setPreviewPage(index){
  if(!previewSet)return;
  previewSet.index=Math.max(0,Math.min(index,previewSet.pages.length-1));
  const page=previewSet.pages[previewSet.index],value=await blob(page);
  if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(value);
  const image=document.getElementById('imagePreviewImg'),link=document.getElementById('imageDownloadLink'),title=document.getElementById('imagePreviewTitle');
  if(image)image.src=previewUrl;if(link){link.href=previewUrl;link.download=previewSet.names[previewSet.index];}
  if(title)title.textContent=previewSet.pages.length===1?`🖼️ ${previewSet.title}｜單一張完整長圖`:`🖼️ ${previewSet.title}｜第 ${previewSet.index+1}/${previewSet.pages.length} 頁`;
  const label=document.getElementById('r45PreviewPageLabel');if(label)label.textContent=previewSet.pages.length===1?'單一張完整長圖':`第 ${previewSet.index+1}／${previewSet.pages.length} 頁`;
  const prev=document.getElementById('r45PreviewPrev'),next=document.getElementById('r45PreviewNext');if(prev)prev.disabled=previewSet.index===0;if(next)next.disabled=previewSet.index===previewSet.pages.length-1;
}

function mountPreviewActions(){
  const actions=document.querySelector('#imagePreviewModal .image-modal-actions');if(!actions)return;
  let group=actions.querySelector('.r45-preview-actions');
  if(!group){
    group=document.createElement('div');group.className='r45-preview-actions';
    group.innerHTML='<button id="r45PreviewPrev" type="button">← 上一頁</button><strong id="r45PreviewPageLabel"></strong><button id="r45PreviewNext" type="button">下一頁 →</button><button id="r45PreviewZip" type="button">⬇️ 下載完整 ZIP</button>';
    actions.append(group);
    group.querySelector('#r45PreviewPrev').addEventListener('click',()=>setPreviewPage((previewSet?.index||0)-1));
    group.querySelector('#r45PreviewNext').addEventListener('click',()=>setPreviewPage((previewSet?.index||0)+1));
    group.querySelector('#r45PreviewZip').addEventListener('click',async()=>{
      if(!previewSet)return;const button=group.querySelector('#r45PreviewZip'),old=button.textContent;button.disabled=true;button.textContent='正在打包…';
      try{
        const entries=[];for(let i=0;i<previewSet.pages.length;i++){const value=await blob(previewSet.pages[i]);entries.push({name:previewSet.names[i],bytes:new Uint8Array(await value.arrayBuffer())});}
        download(zip(entries),previewSet.zipName);
      }finally{button.disabled=false;button.textContent=old;}
    });
  }
  group.hidden=!previewSet||previewSet.pages.length<=1;
}

async function showPages(pages,{title,prefix,date='latest',note='',kind='report'}={}){
  if(!Array.isArray(pages)||!pages.length)throw new Error('沒有可預覽的頁面');
  const names=pages.length===1?[safeName(`${prefix}_單一張完整長圖_${date}_${FILE_VERSION}.png`)]:pages.map((_,index)=>safeName(`${prefix}_${String(index+1).padStart(2,'0')}-${pages.length}_${date}_${FILE_VERSION}.png`));
  previewSet={pages,names,title,index:0,zipName:safeName(`${prefix}_完整${pages.length}頁_${date}_${FILE_VERSION}.zip`),kind};
  if(typeof original.show==='function')await original.show(pages[0],names[0],`${title}｜第 1/${pages.length} 頁`);
  mountPreviewActions();await setPreviewPage(0);
  const element=document.getElementById('imagePreviewNote');if(element)element.textContent=pages.length===1?`${note}｜完整內容已合併為單一張 PNG，可直接預覽或下載。`:`${note}｜共 ${pages.length} 頁；可逐頁預覽／下載，或下載完整ZIP。`;
  return previewSet;
}

async function captureStock(mode){
  let captured=null;
  if(typeof original.stockGenerator==='function'){
    const currentShow=window.showInfographicPreviewV3328;
    window.showInfographicPreviewV3328=async source=>{captured=source;};
    try{await original.stockGenerator(mode,false);}finally{window.showInfographicPreviewV3328=currentShow;}
  }
  if(!captured){
    const report=typeof lastReportData!=='undefined'?lastReportData:null;
    const render=mode==='professional'?window.renderStockProfessionalInfographicV51:window.renderStockInfographicV46;
    if(report&&typeof render==='function')captured=render(report);
  }
  if(!captured)throw new Error('個股原始圖片尚未產生');return captured;
}

async function generateStock(mode='beginner',withWatermark=false){
  const report=typeof lastReportData!=='undefined'?lastReportData:null;if(!report)throw new Error('請先完成個股分析');
  if(document.fonts?.ready)await document.fonts.ready;
  const source=appendStockCompactEvidence(prepareStockBaseForIphone(await captureStock(mode)),report);
  const result=fitIphoneStockReport(source,{title:`${report.name||report.code}（${report.code||report.stock||'-'}）個股${mode==='professional'?'專業完整':'新手'}報告`,date:report.closeDate,watermark:withWatermark});
  const layoutNote=result.iphoneFullScreen?'iPhone 12 Pro Max 1284×2778 單頁滿版':'內容在可讀比例下無法單頁容納，已安全切為兩頁';
  await showPages(result.pages,{title:`${report.name||report.code} 個股圖片報告`,prefix:`石頭少爺_${report.name||report.code}_${report.code||report.stock}_${mode==='professional'?'專業完整':'新手'}個股圖片報告${withWatermark?'_防盜浮水印':''}`,date:dateOf(report.closeDate),note:`${layoutNote}；圖片已移除少爺助理公司／法人區，只保留主要成交密集區；其餘原圖與K線保留`,kind:'stock'});
  return result;
}

async function generateMarket(withWatermark=false){
  const report=typeof lastMarketReportData!=='undefined'?lastMarketReportData:null;if(!report)throw new Error('請先完成大盤分析');
  if(document.fonts?.ready)await document.fonts.ready;if(typeof original.marketRender!=='function')throw new Error('大盤原始圖片產生器不存在');
  const source=appendEvidence(original.marketRender(report),[report],'market','大盤完整圖片');
  const result=paginateDetailed(source,{title:'臺灣加權股價指數（TAIEX）大盤分析',date:report.closeDate,watermark:withWatermark});
  await showPages(result.pages,{title:'臺灣加權股價指數大盤圖片報告',prefix:`石頭少爺_TAIEX_大盤分析圖${withWatermark?'_防盜浮水印':''}`,date:dateOf(report.closeDate),note:'1284×2778滿版安全分頁；保留ABC、真實K線、量能、三劇本與三條關鍵線',kind:'market'});
  return result;
}

async function generateDetailed(kind,withWatermark=false){
  const scan=kind==='momentum'?(typeof lastMomentumScanDataV3762!=='undefined'?lastMomentumScanDataV3762:null):(typeof lastDayTradeScanDataV1!=='undefined'?lastDayTradeScanDataV1:null);
  if(!scan)throw new Error(kind==='momentum'?'請先完成主升段掃描':'請先完成當沖掃描');
  if(document.fonts?.ready)await document.fonts.ready;
  const renderer=kind==='momentum'?original.momentumRender:original.daytradeRender;if(typeof renderer!=='function')throw new Error('前八名原始圖片產生器不存在');
  let source=removeScanIndustryAppend(renderer(scan),scan);
  const candidates=(scan.candidates||scan.launchCandidates||[]).slice(0,8);
  source=appendEvidence(source,candidates,kind,kind==='momentum'?'主升段前八名':'當沖前八名');
  const title=kind==='momentum'?'主升段前八名詳細圖片':'當沖前八名詳細圖片';
  const result=singleLongDetailed(source,{title,date:scan.dataDate||scan.createdAt,watermark:withWatermark});
  await showPages(result.pages,{title,prefix:`石頭少爺_${kind==='momentum'?'主升段':'當沖'}_前八名詳細圖片${withWatermark?'_防盜浮水印':''}`,date:dateOf(scan.dataDate||scan.createdAt),note:`沿用原始展示順序 ${candidates.length} 檔；1284×${result.pages[0].height} 單一張完整長圖；同產業展示區已從詳細圖片移除`,kind});
  return result;
}

async function generateSummary(kind,withWatermark=false){
  const scan=kind==='momentum'?(typeof lastMomentumScanDataV3762!=='undefined'?lastMomentumScanDataV3762:null):(typeof lastDayTradeScanDataV1!=='undefined'?lastDayTradeScanDataV1:null);
  if(!scan)throw new Error(kind==='momentum'?'請先完成主升段掃描':'請先完成當沖掃描');
  if(document.fonts?.ready)await document.fonts.ready;
  const result=buildSummaryPages(scan,kind);if(!result.ok)throw new Error(`摘要名單核對失敗：預期 ${result.rows.length}，實際 ${result.rendered.length}`);
  if(withWatermark&&typeof original.watermark==='function')result.pages.forEach(page=>original.watermark(page,'all'));
  const title=kind==='momentum'?'主升段全部結果摘要':'當沖全部結果摘要';
  await showPages(result.pages,{title,prefix:`石頭少爺_${kind==='momentum'?'主升段':'當沖'}_全部結果摘要${withWatermark?'_防盜浮水印':''}`,date:dateOf(scan.dataDate||scan.createdAt),note:`1200×1600（3:4）安全分頁；原始入列 ${result.rows.length} 檔，實際輸出 ${result.rendered.length} 檔，沒有遺漏或重複`,kind});
  return result;
}

async function copyFirst(resultFactory,messageId){
  try{
    const result=await resultFactory(),page=result.pages[0],value=await blob(page);
    if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){
      await navigator.clipboard.write([new ClipboardItem({'image/png':value})]);
      const message=document.getElementById(messageId);if(message)message.textContent=result.pages.length===1?'✅ 已複製單一張完整長圖 PNG。':'✅ 已複製第1頁PNG；完整多頁請使用ZIP下載。';return;
    }
    const message=document.getElementById(messageId);if(message)message.textContent='⚠️ 瀏覽器不支援圖片剪貼簿，已開啟完整分頁預覽。';
  }catch(error){const message=document.getElementById(messageId);if(message)message.textContent=`❌ ${error.message}`;}
}

window.generateStockImageByModeV51=(mode='beginner',withWatermark=false)=>generateStock(mode,withWatermark).catch(error=>{const message=document.getElementById('copyMessage');if(message)message.textContent=`❌ 個股圖片產生失敗：${error.message}`;throw error;});
window.generateStockBeginnerInfographicV51=(withWatermark=false)=>window.generateStockImageByModeV51('beginner',withWatermark);
window.generateStockProfessionalInfographicV51=(withWatermark=false)=>window.generateStockImageByModeV51('professional',withWatermark);
window.generateStockInfographicV3328=window.generateStockBeginnerInfographicV51;
window.generateMarketInfographicV3328=(withWatermark=false)=>generateMarket(withWatermark).catch(error=>{const message=document.getElementById('marketCopyMessage');if(message)message.textContent=`❌ 大盤圖片產生失敗：${error.message}`;throw error;});
window.generateMomentumScanImageV3762=(withWatermark=false)=>generateDetailed('momentum',withWatermark);
window.downloadMomentumTop8ImageWatermarkV377716=()=>generateDetailed('momentum',true);
window.downloadMomentumAllCandidatesImageV377715=()=>generateSummary('momentum',false);
window.downloadMomentumAllCandidatesImageWatermarkV377716=()=>generateSummary('momentum',true);
window.generateDayTradeImageV1=(withWatermark=false)=>generateDetailed('daytrade',withWatermark);
window.downloadDayTradeAllCandidatesImageV1=(withWatermark=false)=>generateSummary('daytrade',withWatermark);
window.copyDayTradeTop8ImageV377727=(withWatermark=false)=>copyFirst(()=>generateDetailed('daytrade',withWatermark),'dayTradeImageMessage');
window.copyDayTradeAllCandidatesImageV377727=(withWatermark=false)=>copyFirst(()=>generateSummary('daytrade',withWatermark),'dayTradeImageMessage');

window.R45_REPORT_TEST_API=Object.freeze({
  release:RELEASE,detailSize:{...DETAIL},summarySize:{...SUMMARY},summaryRows,buildSummaryPages,
  paginateDetailed,singleLongDetailed,fitIphoneStockReport,prepareStockBaseForIphone,appendStockCompactEvidence,appendEvidence,removeScanIndustryAppend,evidenceLines,zip,blob,
  audits:{originalOrderPreserved:true,summaryIncludesAllCandidates:true,workerChanged:false,scoreChanged:false,qualificationChanged:false}
});
})();
