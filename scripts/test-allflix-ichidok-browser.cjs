const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GRIND_TEST_URL||'http://127.0.0.1:3008';
const live=process.env.ALLFLIX_LIVE_PLAYBACK==='1';
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  let requested=0;
  await p.route('https://zokoanime.video/**',async r=>{requested++;if(live)return r.continue();return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Lecteur simulé</body></html>'});});
  await p.goto(base+'/allflix/');
  assert.equal(await p.getByRole('button',{name:'Collection Ichidok',exact:true}).count(),0);
  assert.equal(await p.getByRole('navigation',{name:'Catalogues d’animés externes'}).count(),0);
  await p.getByRole('button',{name:'Toutes les années',exact:true}).click();
  await p.getByRole('searchbox').fill('Steins;Gate');
  const card=p.locator('a[href="/allflix/fiche/?id=open-tv-mal-9253"]');await card.waitFor();
  await card.click();await p.getByRole('heading',{name:'Steins;Gate',exact:true,level:1}).waitFor();
  assert.equal(await p.locator('iframe').count(),0);assert.equal(requested,0,'No player request before an explicit click');
  await p.getByRole('button',{name:/^Lire S1 E1/}).click();
  const iframe=p.locator('iframe');await iframe.waitFor();
  assert.equal(await iframe.getAttribute('src'),'https://zokoanime.video/stream/mal/9253/1/sub');
  assert.equal(await iframe.getAttribute('sandbox'),null,'Sandbox removed at the user’s request');
  await p.getByRole('link',{name:'Ouvrir le lecteur dans un onglet'}).waitFor();
  if(live){
   const frame=await iframe.elementHandle().then(h=>h.contentFrame());
   await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.currentTime>2&&!v.error;},{},{timeout:30000});
   console.log('Live embedded video advanced beyond two seconds without media error.');
  }
  await p.getByRole('button',{name:'Épisode suivant',exact:true}).click();
  assert.ok(p.url().includes('e=2'));assert.equal(await p.locator('iframe').count(),0,'Episode changes reset the player');
  for(const width of[320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
  assert.deepEqual(errors,[]);
  console.log('Ichidok browser OK: collection, search, internal detail, explicit iframe load without sandbox, external fallback, episode switch and mobile layout.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
