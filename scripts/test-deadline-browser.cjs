// All account requests are mocked. Never changes a real account.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.join(__dirname,'..'),env=fs.readFileSync(path.join(root,'.env.local'),'utf8');
const api=new URL(env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)[1]);
const base=process.env.GRIND_TEST_URL||'http://127.0.0.1:3006',uid='00000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'local-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const payload={sub:uid,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'};
const token=[{alg:'HS256',typ:'JWT'},payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.test';
const auth={access_token:token,refresh_token:'local-test-only',token_type:'bearer',expires_in:86400,expires_at:payload.exp,user};
const profile={user_id:uid,operator_code:'TEST',display_name:'Test local',mbti:'INTJ',level:1,total_xp:0,rank_letter:'E',rank_tier:'NEUTRAL',constance:0,mastery_points:0};
const q={id:'q1',user_id:uid,title:'Préparer mon dossier',status:'PENDING',due_at:new Date(Date.now()-3600000).toISOString(),difficulty_tier:'ROUTINE',reward_eur:0};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage(),errors=[],writes=[],reviews=[];
 let fail=false,unavailable=false;
 await c.addCookies([{name:'sb-'+api.hostname.split('.')[0]+'-auth-token',value:'base64-'+Buffer.from(JSON.stringify(auth)).toString('base64url'),url:base,sameSite:'Lax'}]);
 await c.route(api.origin+'/**',async route=>{const req=route.request(),url=new URL(req.url());
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS'}});
  let result=[];
  if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname==='/auth/v1/token')result=auth;
  else if(url.pathname==='/rest/v1/profiles')result=profile;
  else if(url.pathname==='/rest/v1/quests')result=[q];
  else if(url.pathname==='/rest/v1/quest_deadline_reviews') {
   if(unavailable)return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({message:'Missing migration'})});
   result=reviews;
  }
  else if(url.pathname==='/rest/v1/rpc/review_missed_quest'){
   writes.push(req.postDataJSON());
   if(fail)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'offline test'})});
   result=req.postDataJSON().p_decision==='avoidance'?35:0;
   reviews.push({quest_id:q.id,due_at:q.due_at,amount:result});
   if(result)q.status='EXPIRED';
  }else if(req.method()!=='GET')throw Error('Unexpected mutation '+url.pathname);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/quests/');await p.getByRole('heading',{name:'Quelle est ton excuse ?'}).waitFor();
 const submit=()=>p.getByRole('button',{name:'Valider mon bilan'});
 assert.equal(await submit().isDisabled(),true);assert.equal(writes.length,0);
 await p.getByRole('button',{name:'Répondre plus tard'}).tap();assert.equal(writes.length,0);
 await p.getByRole('button',{name:'Reprendre le bilan (1)'}).tap();
 await p.getByLabel('Ta réponse',{exact:true}).fill('Un rendez-vous urgent');
 await p.getByLabel(/Un imprévu/).check();
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await p.screenshot({path:path.join(root,'test-results/deadline-review-mobile.png'),fullPage:true});
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
 fail=true;await submit().click();await p.getByRole('alert').filter({hasText:'Le bilan n’a pas pu'}).waitFor();assert.equal(await p.getByLabel('Ta réponse',{exact:true}).inputValue(),'Un rendez-vous urgent');
 fail=false;await submit().click();await p.getByRole('status').filter({hasText:'sans points de résignation'}).waitFor();assert.equal(q.status,'PENDING');
 await p.reload();await p.getByRole('button',{name:'+ NOUVELLE QUÊTE'}).waitFor();assert.equal(await p.getByRole('heading',{name:'Quelle est ton excuse ?'}).count(),0);
 q.due_at=new Date(Date.now()-1800000).toISOString();await p.reload();await p.getByRole('heading',{name:'Quelle est ton excuse ?'}).waitFor();
 await p.getByLabel('Ta réponse',{exact:true}).fill('J’ai choisi de repousser');await p.getByLabel(/J’ai volontairement/).check();await submit().click();
 await p.getByRole('status').filter({hasText:'+35 points'}).waitFor();assert.equal(writes.length,3);assert.equal(q.status,'EXPIRED');
 q.status='PENDING';q.due_at=new Date(Date.now()-60000).toISOString();unavailable=true;await p.reload();
 await p.getByRole('alert').filter({hasText:'service de bilan'}).waitFor();assert.equal(await submit().isDisabled(),true);assert.equal(writes.length,3);
 assert.deepEqual(errors,[]);console.log('Browser OK: prompt before writes, defer, required answer, choice, failed save preserves response, zero-point constraint, reload, changed deadline, voluntary points, backend unavailable blocks, responsive 320–1280.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
