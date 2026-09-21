'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),child=require('node:child_process'),crypto=require('node:crypto');
let tests=0;const check=(name,fn)=>{fn();tests++;console.log('PASS '+name);};
const current=fs.readFileSync('index.html','utf8'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const extract=html=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(s=>s.trim());
check('original 11 inline scripts byte-for-byte unchanged',()=>{assert.equal(extract(current).length,11);assert.equal(sha(JSON.stringify(extract(current))),'de4fd00588f62a9563e28a21b3f1568e6b812404a4e5d04920272b6a99f56548');});
check('original scan buttons and handlers preserved',()=>{
 for(const id of ['momentumScanButton','dayTradeScanButton'])assert.ok(current.includes(`id="${id}"`));
 for(const fn of ['runMomentumScanV3769()','runDayTradeScanV1()'])assert.ok(current.includes(fn));
});
check('independent third strategy and reports integrated',()=>{
 for(const token of ['strongStockScanButton','strongStockDeepLimit','strongStockAllImage','strongStockTopImage','strong-stock-filter-v47.js','strong-stock-ui-v47.js','先記分','下載完整 TXT','全部候選'])assert.ok(current.includes(token),token);
});
check('only additive change to original report suite',()=>{
 const now=fs.readFileSync('r45-report-suite.js','utf8'),add='// Additive shared preview entrypoint for the independent third scanner; existing report generation unchanged.\nwindow.strongStockShowPagesV47=showPages;\n';
 assert.ok(now.includes(add));assert.equal(sha(now.replace(add,'')),'2d6a5ae18639971afa0f12055e85909abc768be36a4e535e8b3fd0f2c9c7141c');
});
check('all JavaScript files parse',()=>{
 for(const f of ['strong-stock-filter-v47.js','strong-stock-ui-v47.js','r45-report-suite.js'])child.execFileSync('node',['--check',f]);
 // Chrome classic-script equivalent parse, without external navigation.
 for(const source of extract(current))new (require('node:vm').Script)(source);
});
console.log(`TOTAL ${tests}/${tests}`);
