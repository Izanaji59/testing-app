// Browser integration with a fake account only; no production writes.
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
const project={id:'p1',user_id:uid,title:'Lancer mon activité',status:'ACTIVE',type:'DUNGEON',progress_pct:0,phase_count:3,phase_current:0};
const quest={id:'q1',user_id:uid,project_id:'p1',title:'Rédiger la première offre',status:'PENDING',due_at:null,difficulty_tier:'ROUTINE',reward_eur:0,actual_minutes:0};
(async()=>{const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});try{
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage(),errors=[],sessions=new Map(),writes=[];
 let fail=false,loseResponse=false;
 await c.addCookies([{name:'sb-'+api.hostname.split('.')[0]+'-auth-token',value:'base64-'+Buffer.from(JSON.stringify(auth)).toString('base64url'),url:base,sameSite:'Lax'}]);
 await c.route(api.origin+'/**',async route=>{const req=route.request(),url=new URL(req.url());
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS'}});
  let result=[];
  if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname==='/auth/v1/token')result=auth;
  else if(url.pathname==='/rest/v1/profiles')result=profile;
  else if(url.pathname==='/rest/v1/quests')result=[quest];
  else if(url.pathname==='/rest/v1/projects')result=[project];
  else if(url.pathname==='/rest/v1/sessions')result=[...sessions.values()];
  else if(url.pathname==='/rest/v1/rpc/save_quest_focus'){
   const body=req.postDataJSON();writes.push(body);
   if(fail)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'offline test'})});
   if(!sessions.has(body.p_session_id)){
    sessions.set(body.p_session_id,{focus_seconds:body.p_focus_seconds,quest_completed:body.p_complete,notes:body.p_notes});
    quest.actual_minutes=Math.ceil([...sessions.values()].reduce((t,s)=>t+s.focus_seconds,0)/60);
    if(body.p_complete){quest.status='COMPLETED';project.progress_pct=100;profile.total_xp+=35;}
   }
   if(loseResponse){loseResponse=false;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'saved but confirmation lost'})});}
   result=sessions.get(body.p_session_id).quest_completed;
  }else if(req.method()!=='GET')throw Error('Unexpected mutation '+url.pathname);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/quests/');await p.getByRole('button',{name:'ME CONCENTRER',exact:true}).tap();
 const d=p.getByRole('dialog');await d.waitFor();
 assert.equal(await d.getByLabel('Quête à avancer').inputValue(),'q1');
 assert.equal(await d.getByLabel('Action pendant cette session').inputValue(),quest.title);
 assert.equal(await d.getByLabel('Donjon ou projet (contexte)').inputValue(),'p1');
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await p.screenshot({path:path.join(root,'test-results/quest-focus-setup.png')});
 await p.clock.install();await d.getByRole('button',{name:'Commencer',exact:true}).click();
 assert.equal(await d.getByRole('heading',{name:quest.title}).count(),1);
 await p.clock.fastForward(300000);await d.getByRole('button',{name:'Je me suis déconcentré'}).click();await p.clock.fastForward(60000);await d.getByRole('button',{name:'Replonger',exact:true}).click();await p.clock.fastForward(120000);
 await d.getByRole('button',{name:'Terminer et faire le bilan'}).click();assert.equal(await d.getByLabel('J’ai terminé cette quête').isChecked(),false);await d.getByLabel('Ce que j’ai avancé').fill('Structure et introduction rédigées');
 loseResponse=true;await d.getByRole('button',{name:'Enregistrer le bilan',exact:true}).click();await d.getByRole('alert').waitFor();assert.equal(sessions.size,1);
 await p.reload();await p.getByRole('button',{name:/Bilan de la session/}).click();await d.waitFor();assert.equal(await d.getByLabel('Ce que j’ai avancé').inputValue(),'Structure et introduction rédigées');assert.equal(await d.getByLabel('J’ai terminé cette quête').isChecked(),false);assert.equal(await d.getByLabel('J’ai terminé cette quête').isDisabled(),true);
 await d.getByRole('button',{name:'Enregistrer le bilan',exact:true}).click();await d.getByRole('status').filter({hasText:'Temps enregistré sur la quête'}).waitFor();assert.deepEqual(writes[0],writes[1]);assert.equal(sessions.size,1);
 assert.equal(writes[0].p_quest_id,'q1');assert.equal(writes[0].p_complete,false);assert.ok(writes[0].p_focus_seconds>=420&&writes[0].p_focus_seconds<425);assert.equal(profile.total_xp,0);assert.equal(project.progress_pct,0);assert.equal(quest.status,'PENDING');
 await d.getByRole('button',{name:'Fermer le minuteur'}).click();await p.getByRole('button',{name:'ME CONCENTRER',exact:true}).click();await d.getByRole('button',{name:'Commencer',exact:true}).click();await p.clock.fastForward(1500000);
 await d.getByLabel('J’ai terminé cette quête').check();await d.getByLabel('Ce que j’ai avancé').fill('Offre terminée');
 await p.screenshot({path:path.join(root,'test-results/quest-focus-bilan.png')});
 fail=true;await d.getByRole('button',{name:'Enregistrer et valider la quête'}).click();await d.getByRole('alert').waitFor();assert.equal(await d.getByLabel('Ce que j’ai avancé').inputValue(),'Offre terminée');assert.equal(sessions.size,1);
 await p.reload();await p.getByRole('button',{name:/Bilan de la session/}).click();await d.waitFor();assert.equal(await d.getByLabel('Ce que j’ai avancé').inputValue(),'Offre terminée');assert.equal(await d.getByLabel('J’ai terminé cette quête').isChecked(),true);
 fail=false;await d.getByRole('button',{name:'Enregistrer et valider la quête'}).click();await d.getByRole('status').filter({hasText:'Quête validée'}).waitFor();assert.deepEqual(writes[2],writes[3]);assert.equal(sessions.size,2);assert.equal(profile.total_xp,35);assert.equal(project.progress_pct,100);
 await d.getByRole('button',{name:'Fermer le minuteur'}).click();await p.goto(base+'/stats/');await p.getByText('2 sessions enregistrées / 1 quête(s) validée(s) au bilan').waitFor();
 await p.goto(base+'/donjon/');await p.getByRole('button',{name:/Me concentrer sur Lancer/}).click();await d.getByText(/Aucune quête ouverte/).waitFor();assert.equal(await d.getByRole('button',{name:'Commencer',exact:true}).isDisabled(),true);
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await d.evaluate(el=>el.scrollWidth>el.clientWidth),false,'dialog overflow '+width);}
 assert.deepEqual(errors,[]);console.log('Quest focus browser OK: direct quest entry, parent context, net work excludes distraction, partial session no rewards, explicit completion, lost confirmation and failed save retry same payload after reload, account stats, completed quests excluded, mobile layout.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
