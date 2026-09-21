'use strict';
// Browser availability varies by runtime. Opt in explicitly to avoid a misleading failure.
if(process.env.RUN_BROWSER_TEST!=='1'){console.log('SKIP browser E2E: RUN_BROWSER_TEST=1 is required; VM integration tests still run normally.');process.exit(0);}
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),child=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.join(root,'_strong-stock-browser-fixture.html');
const baseline=fs.readFileSync(path.join(root,'index.html'),'utf8');
fs.writeFileSync(fixture,baseline.replace('</body>','<script src="./tests/strong-stock-browser-harness.js"></script></body>'),'utf8');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
});
let browser=null;
const clean=()=>{server.close();if(browser&&!browser.killed)browser.kill();if(fs.existsSync(fixture))fs.unlinkSync(fixture);};
process.on('SIGINT',()=>{clean();process.exit(130);});
server.listen(0,'127.0.0.1',()=>{
  const port=server.address().port;
  browser=child.spawn(process.env.CHROMIUM_PATH||'/usr/bin/chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--virtual-time-budget=7000','--dump-dom',`http://127.0.0.1:${port}/_strong-stock-browser-fixture.html`],{stdio:['ignore','pipe','pipe']});
  let output='',error='';browser.stdout.setEncoding('utf8');browser.stderr.setEncoding('utf8');
  browser.stdout.on('data',chunk=>output+=chunk);browser.stderr.on('data',chunk=>error+=chunk);
  const timer=setTimeout(()=>browser.kill('SIGKILL'),30000);
  browser.on('close',(code)=>{
    clearTimeout(timer);clean();
    try{
      const match=output.match(/<pre id="strongStockBrowserEvidence">([^<]+)<\/pre>/);
      assert.ok(match,'Browser harness did not complete; '+error.slice(-350));
      const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
      result.checks.forEach(x=>console.log(`${x.pass?'PASS':'FAIL'} ${x.name}${x.detail?' | '+x.detail:''}`));
      if(result.error)console.error('Browser error:',result.error);
      assert.equal(result.ok,true,'Browser checks failed');
      console.log(`TOTAL ${result.checks.length}/${result.checks.length} browser checks`);
    }catch(e){console.error('BROWSER TEST ERROR:',e.message);console.error('Chromium status:',code,'tail:',output.slice(-700));process.exitCode=1;}
  });
});
