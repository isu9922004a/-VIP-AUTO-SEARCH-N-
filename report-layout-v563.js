'use strict';
/* Mobile-first stock-report layout. Rendering only; all analysis stays upstream. */
(function(root){
  const T=Object.freeze({
    cssWidth:428,pixelRatio:3,width:1284,margin:48,gap:42,pad:48,radius:42,
    bg:'#f2f2f7',ink:'#1c1c1e',muted:'#596474',border:'#d5dee8',
    body:48,title:57,small:48,section:60,stock:72,price:90
  });
  const colors={
    green:['#eef9f2','#187447'],red:['#fff1f2','#b42332'],yellow:['#fff8e5','#925708'],
    orange:['#fff6e8','#9a5707'],blue:['#ffffff','#234d74'],purple:['#f7f3fc','#74519b'],
    gray:['#f8fafc','#536174']
  };
  const invalid=/\b(?:undefined|null|NaN)\b|\[object Object\]/g;
  function plain(value){
    if(value===null||value===undefined)return '資料不足';
    if(typeof value==='number'&&!Number.isFinite(value))return '資料不足';
    if(typeof value==='object')value=value.label??value.text??value.value??'資料不足';
    const result=String(value).replace(invalid,'資料不足').replace(/蕭[明道]{2}(?:老師)?(?:的)?/g,'').replace(/課程條件/g,'量價條件').trim();
    return result||'資料不足';
  }
  function finite(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
  function fmt(value){const number=finite(value);if(number===null)return '尚未建立';return root.fmt?.(number)??String(number);}
  function font(ctx,size,weight=650){ctx.font=`${weight} ${size}px 'PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif`;ctx.textBaseline='top';ctx.textAlign='left';}
  function wrapLines(ctx,value,width,size,weight){
    font(ctx,size,weight);const result=[];
    for(const paragraph of plain(value).split('\n')){
      let line='';
      for(const char of [...paragraph]){const next=line+char;if(line&&ctx.measureText(next).width>width){result.push(line);line=char;}else line=next;}
      result.push(line||' ');
    }
    return result;
  }
  function measure(ctx,items,width){
    return items.map(item=>{const size=item.size||T.body,weight=item.weight||650,lineHeight=item.lineHeight||1.56,wrapped=wrapLines(ctx,item.text,width,size,weight);return {...item,size,weight,lineHeight,lines:wrapped,height:wrapped.length*Math.ceil(size*lineHeight),gap:item.gap??30};});
  }
  function paintText(ctx,items,x,y){
    for(const item of items){font(ctx,item.size,item.weight);ctx.fillStyle=item.color||T.ink;for(const line of item.lines){ctx.fillText(line,x,y);y+=Math.ceil(item.size*item.lineHeight);}y+=item.gap;}
    return y;
  }
  function round(ctx,x,y,w,h,fill,stroke=T.border,radius=T.radius){
    ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  }
  const text=(value,options={})=>({text:plain(value),...options});
  const card=(title,body=[],tone='blue')=>({tone,items:[text(title,{size:T.title,weight:850,lineHeight:1.36,color:(colors[tone]||colors.blue)[1]}),...body.map(row=>typeof row==='string'?text(row):row)]});

  class Layout{
    constructor(){this.measureCanvas=document.createElement('canvas');this.ctx=this.measureCanvas.getContext('2d');this.y=0;this.ops=[];this.audit=[];this.texts=[];}
    card(id,value){
      const width=T.width-2*T.margin,items=measure(this.ctx,value.items,width-2*T.pad),height=2*T.pad+items.reduce((sum,item)=>sum+item.height+item.gap,0)-30,y=this.y,tone=colors[value.tone||'blue']||colors.blue;
      this.ops.push(ctx=>{ctx.save();ctx.shadowColor='rgba(21,45,72,.08)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;round(ctx,T.margin,y,width,height,tone[0]);ctx.restore();ctx.fillStyle=tone[1];ctx.fillRect(T.margin+2,y+T.radius,12,height-2*T.radius);paintText(ctx,items,T.margin+T.pad,y+T.pad);});
      this.texts.push(...value.items.map(item=>plain(item.text)));this.audit.push({id,top:y,bottom:y+height,columns:1,autoHeight:true});this.y+=height+T.gap;return this;
    }
    row(id,cards){cards.forEach((value,index)=>this.card(cards.length===1?id:`${id}-${index+1}`,value));return this;}
    title(id,value){
      const items=measure(this.ctx,[text(value,{size:T.section,weight:900,lineHeight:1.34,gap:0})],T.width-2*T.margin),y=this.y,height=items[0].height;
      this.ops.push(ctx=>paintText(ctx,items,T.margin,y));this.texts.push(plain(value));this.audit.push({id,top:y,bottom:y+height,columns:1});this.y+=height+30;return this;
    }
    custom(id,height,paint,meta={}){const y=this.y;this.ops.push(ctx=>paint(ctx,T.margin,y,T.width-2*T.margin,height));this.audit.push({id,top:y,bottom:y+height,columns:1,...meta});this.y+=height+T.gap;return this;}
    header(report,analysis){
      const latest=finite(analysis?.latestClose)??finite(report?.close),stock=plain(report?.name||'股票'),code=plain(report?.code||report?.stock||'-');
      const meta=`${root.marketNameZh?.(report?.market)||plain(report?.market||'市場資料不足')}｜${root.datefmt?.(report?.closeDate)||plain(report?.closeDate||'資料不足')}｜來源：${root.sourceNameZh?.(report?.source)||plain(report?.source||'資料不足')}`;
      const items=measure(this.ctx,[
        text(`${stock}（${code}）`,{size:T.stock,weight:900,lineHeight:1.3,color:'#ffffff'}),
        text(`最新收盤 ${latest===null?'資料不足':fmt(latest)} 元`,{size:T.price,weight:900,lineHeight:1.22,color:'#ff9ba6'}),
        text(meta,{size:T.small,weight:700,lineHeight:1.5,color:'#e7eef6'}),
        text(`報告製作 By.石頭少爺｜${root.reportGeneratedAt?.()||new Date().toLocaleString('zh-TW')}`,{size:T.small,weight:650,lineHeight:1.5,color:'#e7eef6'}),
        text(root.ShitouReleaseV50?.release||'專業個股報告',{size:T.small,weight:650,lineHeight:1.5,color:'#e7eef6',gap:0})
      ],T.width-2*T.margin);
      const height=60+items.reduce((sum,item)=>sum+item.height+item.gap,0),y=this.y;
      this.ops.push(ctx=>{const gradient=ctx.createLinearGradient(0,0,T.width,height);gradient.addColorStop(0,'#17365d');gradient.addColorStop(1,'#2f5f89');ctx.fillStyle=gradient;ctx.fillRect(0,y,T.width,height);paintText(ctx,items,T.margin,y+30);});
      this.texts.push(...items.map(item=>plain(item.text)));this.audit.push({id:'stock-header',top:y,bottom:y+height,columns:1,stickyInWeb:true,staticInExport:true});this.y+=height+T.gap;return this;
    }
    finish(base,mode,extra={}){
      const canvas=document.createElement('canvas');canvas.width=T.width;canvas.height=Math.ceil(this.y+24);const ctx=canvas.getContext('2d');ctx.fillStyle=T.bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';for(const op of this.ops)op(ctx);
      Object.assign(canvas.dataset,base?.dataset||{});canvas.dataset.reportMode=mode;canvas.dataset.unifiedReport='true';canvas.dataset.professionalExportMode='true';canvas.dataset.reportCssWidth=String(T.cssWidth);canvas.dataset.exportPixelRatio=String(T.pixelRatio);canvas.dataset.accordionsExpanded='true';canvas.dataset.reportText=encodeURIComponent(JSON.stringify(this.texts));
      const noOverlap=this.audit.every((item,index)=>!index||item.top>=this.audit[index-1].bottom);
      canvas.dataset.layoutAudit=encodeURIComponent(JSON.stringify({size:`${canvas.width}x${canvas.height}`,cssSize:`${T.cssWidth}x${Math.ceil(canvas.height/T.pixelRatio)}`,unified:true,mobileFirst:true,singleColumn:true,exportMode:true,stickyHeader:false,accordionsExpanded:true,noScale:true,noCrop:true,noHorizontalScroll:true,noOverlap,minReadableFontPx:T.small/T.pixelRatio,sections:this.audit,theme:T,...extra}));
      if(mode==='professional')canvas.dataset.v50ProfessionalFull='true';else canvas.dataset.v50NewbieFirst='true';return canvas;
    }
  }

  function captureProfessional(render){
    const captured={map:[],scenarios:[],bullets:[],next:[],snr:[],research:false},saved={};let inSnr=false;
    const wrap=(name,hook)=>{if(typeof root[name]!=='function')return;saved[name]=root[name];root[name]=function(...args){hook(args);return saved[name].apply(this,args);};};
    const normalize=value=>plain(root.v51ProfessionalPlainText?.(value)??value);
    wrap('drawStockMapRowV3661',args=>{const item=args[1];captured.map.push({value:`${fmt(item?.value)} 元`,label:normalize(root.stockImagePlainTextV41?.(item?.label)??item?.label),status:`${item?.biasIcon||'🟡'} ${item?.bias||'中性'}`,action:normalize(root.stockImagePlainTextV41?.(`持有者：${item?.holderAction}｜${item?.holderNote}｜空手者：${item?.nonHolderAction}｜${item?.nonHolderNote}`)??''),color:item?.color});});
    wrap('drawReportTextBoxV377734',args=>{if(args[2]===68&&[1483,1687,1891].includes(args[3]))captured.scenarios.push(normalize(args[1]));if(args[2]===824&&String(args[1]).startsWith('🎯 下一步：'))captured.next.push(normalize(args[1]));});
    wrap('drawReportBulletListV377734',args=>{if(args[2]===824&&Array.isArray(args[1]))captured.bullets=args[1].map(normalize);});
    wrap('drawResearchValidationCardV3673',()=>{captured.research=true;});
    wrap('v46CanvasLines',args=>{if(inSnr)captured.snr.push(normalize(args[1]));});
    if(typeof root.appendProfessionalSnrPanelV532==='function'){saved.appendProfessionalSnrPanelV532=root.appendProfessionalSnrPanelV532;root.appendProfessionalSnrPanelV532=function(...args){inSnr=true;try{return saved.appendProfessionalSnrPanelV532.apply(this,args);}finally{inSnr=false;}};}
    try{const result=render();result.dataset.professionalLayoutContent=encodeURIComponent(JSON.stringify(captured));return result;}finally{for(const [name,fn] of Object.entries(saved))root[name]=fn;}
  }

  function chartFrame(ctx,x,y,w,h,title,subtitle){round(ctx,x,y,w,h,'#ffffff','#b9cadb');font(ctx,T.title,900);ctx.fillStyle='#17324f';ctx.fillText(title,x+T.pad,y+T.pad);if(subtitle){font(ctx,T.small,650);ctx.fillStyle=T.muted;const lines=wrapLines(ctx,subtitle,w-2*T.pad,T.small,650);lines.slice(0,2).forEach((line,index)=>ctx.fillText(line,x+T.pad,y+T.pad+78+index*62));}}
  function drawAbcChart(ctx,x,y,w,h,state){
    chartFrame(ctx,x,y,w,h,'ABC 套裝圖｜起漲、前高、回檔','A＝起漲點｜B＝前波高點｜C＝回檔低點；價位只顯示系統既有結果。');
    const values=[finite(state?.A),finite(state?.B),finite(state?.C)],labels=['A 起漲','B 前高','C 回檔低點'],dates=[state?.s?.fib?.ADate,state?.s?.fib?.BDate,state?.s?.fib?.CDate],tones=['#34a853','#e67e22','#2675c9'];
    const plot={x:x+90,y:y+240,w:w-180,h:420},existing=values.filter(Number.isFinite),min=Math.min(...existing),max=Math.max(...existing),range=Math.max(max-min,Math.abs(max)*.06,1),toY=value=>plot.y+plot.h-(value-(min-range*.12))/(range*1.24)*plot.h;
    ctx.save();ctx.strokeStyle='#d8e0e8';ctx.lineWidth=3;for(let index=0;index<=4;index++){const yy=plot.y+plot.h*index/4;ctx.beginPath();ctx.moveTo(plot.x,yy);ctx.lineTo(plot.x+plot.w,yy);ctx.stroke();}ctx.restore();
    const points=values.map((value,index)=>({value,x:plot.x+plot.w*(index+.5)/3,y:value===null?null:toY(value)}));ctx.save();ctx.strokeStyle='#315e85';ctx.lineWidth=10;ctx.lineJoin='round';ctx.beginPath();let started=false;points.forEach(point=>{if(point.y===null)return;if(!started){ctx.moveTo(point.x,point.y);started=true;}else ctx.lineTo(point.x,point.y);});if(started)ctx.stroke();ctx.restore();
    points.forEach((point,index)=>{if(point.y!==null){ctx.beginPath();ctx.arc(point.x,point.y,23,0,Math.PI*2);ctx.fillStyle=tones[index];ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=8;ctx.stroke();font(ctx,48,900);ctx.fillStyle=tones[index];ctx.textAlign='center';ctx.fillText(labels[index],point.x,point.y-100);font(ctx,48,900);ctx.fillText(`${fmt(point.value)} 元`,point.x,point.y+42);font(ctx,48,700);ctx.fillStyle=T.muted;ctx.fillText(root.datefmt?.(dates[index])||plain(dates[index]||'日期未建立'),point.x,point.y+105);ctx.textAlign='left';}else{font(ctx,48,850);ctx.fillStyle=T.muted;ctx.textAlign='center';ctx.fillText(`${labels[index]}：尚未建立`,point.x,plot.y+plot.h/2);ctx.textAlign='left';}});
    const progress=typeof root.stockInfographicProgressV3329==='function'?root.stockInfographicProgressV3329(state):'依系統現有 ABC 進度顯示';font(ctx,T.small,800);ctx.fillStyle='#234d74';wrapLines(ctx,progress,w-2*T.pad,T.small,800).slice(0,2).forEach((line,index)=>ctx.fillText(line,x+T.pad,y+h-125+index*58));
  }

  function drawKChart(ctx,x,y,w,h,report,state){
    chartFrame(ctx,x,y,w,h,'近 80 個交易日 K 線圖','紅 K 上漲／綠 K 下跌｜藍線為 20 日均線｜下方為成交量');
    let selected=null;try{selected=root.selectStockChartBarsV365?.(report,state);}catch(_){selected=null;}
    const bars=selected?.bars||[];if(bars.length<20){font(ctx,T.body,800);ctx.fillStyle=T.muted;ctx.fillText('K 線資料不足；不以推測圖形替代。',x+T.pad,y+250);return;}
    const right=276,left=132,plotX=x+left,plotY=y+250,plotW=w-left-right,priceH=650,volY=plotY+priceH+78,volH=220;
    let min=Math.min(...bars.map(bar=>finite(bar.low)).filter(Number.isFinite)),max=Math.max(...bars.map(bar=>finite(bar.high)).filter(Number.isFinite));let range=Math.max(max-min,Math.abs(max)*.01,1);min-=range*.07;max+=range*.07;range=max-min;const toY=value=>plotY+priceH-(value-min)/range*priceH;
    font(ctx,48,700);ctx.fillStyle=T.muted;for(let index=0;index<=4;index++){const yy=plotY+priceH*index/4,value=max-range*index/4;ctx.strokeStyle='#d8e0e8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(plotX,yy);ctx.lineTo(plotX+plotW,yy);ctx.stroke();ctx.fillText(fmt(value),x+12,yy-24);}
    const step=plotW/bars.length,bodyW=Math.max(5,Math.min(13,step*.64)),maxVolume=Math.max(1,...bars.map(bar=>finite(bar.volume)||0));
    bars.forEach((bar,index)=>{const cx=plotX+(index+.5)*step,open=finite(bar.open),close=finite(bar.close),high=finite(bar.high),low=finite(bar.low);if([open,close,high,low].some(value=>value===null))return;const up=close>open,color=up?'#ff3b30':close<open?'#34c759':'#718096';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(2,bodyW*.2);ctx.beginPath();ctx.moveTo(cx,toY(high));ctx.lineTo(cx,toY(low));ctx.stroke();ctx.fillRect(cx-bodyW/2,Math.min(toY(open),toY(close)),bodyW,Math.max(3,Math.abs(toY(close)-toY(open))));const volume=finite(bar.volume)||0,vh=Math.max(2,volume/maxVolume*volH);ctx.globalAlpha=.62;ctx.fillRect(cx-bodyW/2,volY+volH-vh,bodyW,vh);ctx.globalAlpha=1;});
    ctx.strokeStyle='#2675c9';ctx.lineWidth=6;ctx.beginPath();let started=false;bars.forEach((bar,index)=>{const average=finite(selected.ma20?.[selected.start+index]);if(average===null)return;const px=plotX+(index+.5)*step,py=toY(average);if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);});if(started)ctx.stroke();font(ctx,48,850);ctx.fillStyle='#2675c9';ctx.fillText('20 日均線',plotX+12,plotY+12);
    const lineValues=[{key:'最新',value:finite(state?.close),color:'#ff3b30'},{key:'A',value:finite(state?.A),color:'#187447'},{key:'B',value:finite(state?.B),color:'#e67e22'},{key:'C',value:finite(state?.C),color:'#2675c9'},{key:'壓',value:finite(state?.trident361?.pressure?.value),color:'#d97706'},{key:'撐',value:finite(state?.trident361?.support?.value),color:'#0ea5e9'}].filter(item=>item.value!==null&&item.value>=min&&item.value<=max).sort((a,b)=>toY(a.value)-toY(b.value));
    let previous=-Infinity;lineValues.forEach(item=>{const actual=toY(item.value),labelY=Math.max(plotY,actual,previous+60);previous=labelY;ctx.save();ctx.strokeStyle=item.color;ctx.lineWidth=3;ctx.setLineDash([14,10]);ctx.beginPath();ctx.moveTo(plotX,actual);ctx.lineTo(plotX+plotW,actual);ctx.stroke();ctx.restore();font(ctx,48,900);ctx.fillStyle=item.color;ctx.fillText(`${item.key} ${fmt(item.value)}`,plotX+plotW+18,Math.min(labelY,plotY+priceH-54));});
    const tickIndexes=[0,Math.floor((bars.length-1)/3),Math.floor((bars.length-1)*2/3),bars.length-1];font(ctx,48,700);ctx.fillStyle=T.muted;tickIndexes.forEach((barIndex,tickIndex)=>{const px=plotX+(barIndex+.5)*step,label=root.dateShortV365?.(bars[barIndex]?.date)||plain(bars[barIndex]?.date||'-');ctx.textAlign=tickIndex===0?'left':tickIndex===tickIndexes.length-1?'right':'center';ctx.fillText(label,px,volY+volH+24);});ctx.textAlign='left';
  }

  function beginner(base,input,analysis,decision){
    const report=input?.report||input,U=root.ShitouV50UI,plan=U.newbiePlan(input,analysis,decision),layout=new Layout();layout.header(report,analysis);
    layout.row('decision-empty',[card(`👤 還沒買：${plan.empty}`,[],plan.formalExecutionAllowed?'green':'yellow')]);layout.row('decision-holder',[card(`💼 已持有：${plan.holder}`,[],'red')]);layout.row('decision-today',[card(`● ${plan.today}`,[],plan.formalExecutionAllowed?'green':'yellow')]);
    layout.title('levels-title','明天只看三個數字');layout.row('levels',[card(plan.turnText,[text('多空線',{weight:850}),'收盤站上且量能確認，才轉強觀察。'],'green'),card(plan.defenseText,[text('防守線',{weight:850}),'跌破且收不回要小心，先管理風險。'],'red'),card(plan.pressureText,[text('壓力線',{weight:850}),'有效突破前不追價，到價也不等於買點。'],'yellow')]);
    layout.title('scenarios-title','明天三種走法');layout.row('scenarios',plan.scenarios.map((scenario,index)=>card(`${index+1}. ${scenario.title}`,[scenario.text],scenario.tone)));layout.row('risk',[card('風險聲明',['以上是條件整理，不是投資建議，漲跌無法保證，下單前請自行判斷。'])]);return layout.finish(base,'beginner',{newbieFirst:true,originalContentPreserved:true});
  }

  function professional(base,input,analysis,decision){
    const U=root.ShitouV50UI,source=U.compactPreviousCards(base),report=input?.report||input,plan=U.newbiePlan(input,analysis,decision),guide=U.professionalCourseGuide(input,analysis,decision),layout=new Layout();let content={map:[],scenarios:[],bullets:[],next:[],snr:[]};try{content={...content,...JSON.parse(decodeURIComponent(source.dataset.professionalLayoutContent))};}catch(_){}
    let state=null,preMarket=null;try{state=root.stockInfographicStateV3328?.(report);}catch(_){}try{preMarket=state&&root.buildPreMarketEntryPlanV43?.(state);}catch(_){}
    layout.header(report,analysis);
    layout.row('beginner-decision',[card('📌 新手看：現在是否適合進場？',[text(`還沒買：${decision?.formalExecutionAllowed?'可列入盤中條件式評估':'現在先不要買'}`,{size:60,weight:900,color:colors[decision?.formalExecutionAllowed?'green':'yellow'][1]}),`原因：${decision?.reason||plan.reasons[0]}`,`要等：${decision?.wait||'價格、成交量與正式條件同步確認。'}`,text(`已持有：${plan.holder}`,{weight:750,color:colors.red[1]}),`關鍵價：20 日均線 ${plan.turnText}｜防守 ${plan.defenseText}｜上方關卡 ${plan.pressureText}`],'yellow')]);
    layout.title('volume-price-title','📊 量價觀察｜三盤怎麼看？');layout.row('volume-price-status',[card(`${guide.icon} 今天判斷：${guide.status}`,[text(guide.score,{size:54,weight:900}),guide.explain,guide.thresholds],guide.key.startsWith('BREAKDOWN')?'red':guide.key==='BREAKOUT_CONFIRMED'?'green':'yellow')]);layout.row('volume-price-branches',guide.branches.map((branch,index)=>card(branch.title,[branch.text],['green','yellow','red'][index])));layout.row('volume-price-factors',[card('成交量',[guide.volume]),card('價格位置',[guide.position]),card('角度',[guide.angle]),card('時間',[guide.time]),card('產業相對大盤',[guide.relative])]);
    layout.row('next-step',[card('🧭 新手下一步｜訊號不是買點',[guide.action,'正式進場仍依原系統條件。'],'yellow')]);
    layout.title('strategy-title','🎯 操作策略');layout.row('strategy',[card('空手者',[plan.empty],'yellow'),card('持有者',[plan.holder],'red')]);
    const observation=preMarket?.observation?.value!==undefined?`${fmt(preMarket.observation.value)} 元｜${preMarket.observation.note}`:'尚未建立。',aggressive=preMarket?.aggressive?.available?`${fmt(preMarket.aggressive.value)} 元｜${preMarket.aggressive.reason}`:`尚未建立。${preMarket?.aggressive?.reason?` ${preMarket.aggressive.reason}`:''}`,holderLevel=preMarket?.tacticalSupport?.value!==undefined?`${fmt(preMarket.tacticalSupport.value)} 元｜${preMarket.tacticalSupport.label}`:'目前不適用。';layout.row('pre-market-levels',[card('今日盤前作戰價位',[`空手者：${observation}`,`持有者：${holderLevel}`,`逆勢加碼：${aggressive}`])]);
    layout.title('charts-title','📈 圖表區');layout.custom('abc-chart',960,(ctx,x,y,w,h)=>drawAbcChart(ctx,x,y,w,h,state),{fullWidth:true,chart:'abc',mobileRendered:true});layout.custom('k-chart',1340,(ctx,x,y,w,h)=>drawKChart(ctx,x,y,w,h,report,state),{fullWidth:true,chart:'kline-80',mobileRendered:true});
    layout.title('tomorrow-title','🔮 明天三種走法｜看到什麼就怎麼做');const scenarios=content.scenarios.length===3?content.scenarios:(typeof root.stockScenarioTextsV3328==='function'&&state?root.stockScenarioTextsV3328(state):plan.scenarios.map(item=>item.text));layout.row('tomorrow-scenarios',scenarios.map((value,index)=>card(['✅ 怎麼算轉強','⚠️ 如果繼續整理','❌ 如果跌破'][index]||`情境 ${index+1}`,[value],['green','yellow','red'][index]||'blue')));
    layout.title('details-title','🔍 詳細判斷依據');const details=[...content.bullets,...content.next];layout.row('details',[card('完整判斷依據',details.length?details:plan.reasons)]);
    layout.title('price-ladder-title','🪜 關鍵價位階梯');if(content.map.length)layout.row('price-ladder',content.map.map(item=>card(`${item.value}｜${item.label}`,[text(item.status,{weight:850,color:item.color}),item.action],String(item.label).includes('現在價格')?'red':'blue')));else layout.row('price-ladder-missing',[card('價位資料不足',['等待系統建立。'],'gray')]);
    layout.title('snr-title','⚖️ 歷史支撐壓力 × ABC × 三叉戟');if(content.snr.length>=5){layout.row('snr',[card(content.snr[1]||'支撐區',[content.snr[2]||'資料不足'],'green'),card(content.snr[3]||'壓力區',[content.snr[4]||'資料不足'],'purple'),card(content.snr[5]||'測試次數／共振等級',[...(content.snr.slice(6))])]);}else layout.row('snr-missing',[card('歷史支撐壓力資料不足',['仍以原本 ABC、三叉戟與正式進場檢查為準。'],'gray')]);
    const cText=finite(state?.C)!==null?'C 回檔止穩':'等回檔止穩點 C';layout.title('mnemonic-title','📝 ABC 口訣');layout.row('mnemonic',[card('口訣記住',[text('A 起漲',{size:57,weight:900,color:colors.green[1]}),text('↓',{size:57,weight:900}),text('B 前高',{size:57,weight:900,color:colors.orange[1]}),text('↓',{size:57,weight:900}),text(cText,{size:57,weight:900,color:colors.blue[1]}),text('↓',{size:57,weight:900}),text('再突破 B＝完整 N 字確認',{size:57,weight:900,color:colors.red[1]}),'到價只是開始檢查，不是普通掛單價。'])]);
    return layout.finish(source,'professional',{professionalFull:true,omittedSection:'D. 七項條件分',mapCount:content.map.length,reportOrder:['header','beginner','volume-price','next-step','strategy','abc-chart','k-chart','tomorrow','details','price-ladder','snr','mnemonic'],exportWidth:1284,exportHeight:'content-auto'});
  }

  root.ShitouReportLayoutV563=Object.freeze({theme:T,plain,Layout,captureProfessional,beginner,professional});
})(typeof window!=='undefined'?window:globalThis);
