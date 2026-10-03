'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','report-layout-v563.js'),'utf8');

test('professional report uses an iPhone 12 Pro Max @3x canvas',()=>{
  assert.match(source,/cssWidth:428,pixelRatio:3,width:1284/);
  assert.match(source,/exportWidth:1284,exportHeight:'content-auto'/);
});

test('professional report is single-column and readable at CSS size',()=>{
  assert.match(source,/singleColumn:true/);
  assert.match(source,/columns:1,autoHeight:true/);
  assert.match(source,/small:48/); // 48 output pixels / 3 = 16 CSS px at 428px width.
  assert.doesNotMatch(source,/grid-template-columns|transform:\s*scale|zoom\s*:/);
});

test('professional report renders charts independently at full width',()=>{
  assert.match(source,/custom\('abc-chart',960/);
  assert.match(source,/custom\('k-chart',1340/);
  assert.match(source,/chart:'abc',mobileRendered:true/);
  assert.match(source,/chart:'kline-80',mobileRendered:true/);
});

test('professional report preserves the requested section order',()=>{
  const expected=['header','beginner','volume-price','next-step','strategy','abc-chart','k-chart','tomorrow','details','scores','price-ladder','snr','mnemonic'];
  const order=source.match(/reportOrder:\[(.*?)\]/s);
  assert.ok(order,'reportOrder audit metadata is present');
  let previous=-1;
  for(const section of expected){
    const index=order[1].indexOf(`'${section}'`);
    assert.ok(index>previous,`${section} follows the requested order`);
    previous=index;
  }
});

test('professional export is natural-height, expanded, and unscaled',()=>{
  assert.match(source,/accordionsExpanded:true/);
  assert.match(source,/noScale:true,noCrop:true,noHorizontalScroll:true,noOverlap/);
  const professional=source.slice(source.indexOf('function professional('));
  assert.doesNotMatch(professional,/Math\.min\([^\n]*height|drawImage\(source|fitScale|iphoneFullCanvas/);
});

test('professional output sanitizes missing values',()=>{
  assert.match(source,/undefined\|null\|NaN/);
  assert.match(source,/return '資料不足'/);
  assert.match(source,/value===null\|\|value===undefined\|\|value===''/);
});
