const fs=require('node:fs'),assert=require('node:assert/strict');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env=fs.readFileSync('.env.local','utf8'),api=new URL(env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)[1]);
const base=process.env.GRIND_TEST_URL||'http://127.0.0.1:3008',uid='00000000-0000-4000-8000-000000000001',cid='community-char-10000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const payload={sub:uid,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'},token=[{alg:'HS256',typ:'JWT'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.test';
const auth={access_token:token,refresh_token:'test-only',token_type:'bearer',expires_in:86400,expires_at:payload.exp,user};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+1sAAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const state={characters:[],images:{},votes:{},myVotes:{}},writes=[],uploads=[];let fail=false;
 async function context(loggedIn){
  const c=await browser.newContext({viewport:{width:390,height:844}});
  if(loggedIn)await c.addCookies([{name:'sb-'+api.hostname.split('.')[0]+'-auth-token',value:'base64-'+Buffer.from(JSON.stringify(auth)).toString('base64url'),url:base,sameSite:'Lax'}]);
  await c.route('https://images.example.test/**',r=>r.fulfill({contentType:'image/png',body:png}));
  await c.route(api.origin+'/**',async r=>{
   const req=r.request(),url=new URL(req.url());let result=[];
   if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'}});
   if(url.pathname==='/auth/v1/user')result=loggedIn?user:null;
   else if(url.pathname==='/auth/v1/token')result=auth;
   else if(url.pathname==='/rest/v1/rpc/get_fiction_community')result={...state,myVotes:loggedIn?state.myVotes:{}};
   else if(url.pathname.startsWith('/storage/v1/object/public/'))return r.fulfill({contentType:'image/png',body:png});
   else if(url.pathname.startsWith('/storage/v1/object/character-images/')&&req.method()==='POST'){
    assert.ok(url.pathname.includes('/'+uid+'/'));uploads.push(url.pathname);result={Id:'test-image',Key:url.pathname.split('/object/')[1]};
   }else if(url.pathname==='/rest/v1/rpc/submit_fiction_character'){
    assert.ok(loggedIn);const body=req.postDataJSON();writes.push({name:'create',body});
    assert.equal(body.p_title_id,'');state.characters.push({id:cid,name:body.p_name,titleId:'',title:body.p_title,image:body.p_image_url,imageKind:'illustration',source:'community',sourceUrl:''});result=cid;
   }else if(url.pathname==='/rest/v1/rpc/vote_fiction_character'){
    assert.ok(loggedIn);const body=req.postDataJSON();writes.push({name:'vote',body});
    if(fail)return r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'simulated failure'})});
    state.myVotes[body.p_character_id]=body.p_mbti;state.votes[body.p_character_id]={counts:{[body.p_mbti]:1},total:1,leader:body.p_mbti};result=null;
   }else if(url.pathname==='/rest/v1/rpc/submit_fiction_image'){
    assert.ok(loggedIn);const body=req.postDataJSON();writes.push({name:'image',body});state.images[body.p_character_id]=body.p_image_url;result=null;
   }else if(!['GET','HEAD'].includes(req.method()))throw Error('Unexpected write '+url.pathname);
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
  });return c;
 }
 const c=await context(true),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/personnages/');await p.getByText('Ajouter un personnage',{exact:true}).click();
 await p.getByLabel('Nom du personnage',{exact:true}).fill('Héroïne témoin');await p.getByLabel(/^Œuvre d’origine/).fill('Roman témoin inédit');
 await p.locator('input[type=file]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png});
 await p.getByLabel('Ton vote MBTI (facultatif)',{exact:true}).selectOption('ENTP');await p.getByRole('button',{name:'Ajouter le personnage',exact:true}).click();
 await p.getByRole('link',{name:'Ouvrir sa fiche',exact:true}).click();await p.getByRole('heading',{name:'Héroïne témoin',exact:true,level:1}).waitFor();assert.equal(uploads.length,1);assert.equal(state.characters[0].title,'Roman témoin inédit');
 await p.getByLabel('Ton type MBTI pour ce personnage',{exact:true}).selectOption('INTJ');fail=true;await p.getByRole('button',{name:'Modifier mon vote',exact:true}).click();await p.getByRole('alert').filter({hasText:'L’enregistrement n’a pas abouti'}).waitFor();assert.equal(state.myVotes[cid],'ENTP');
 fail=false;await p.getByRole('button',{name:'Modifier mon vote',exact:true}).click();await p.getByRole('status').filter({hasText:'Ton vote est enregistré'}).waitFor();assert.equal(state.votes[cid].total,1);assert.equal(state.myVotes[cid],'INTJ');
 await p.getByText('Proposer une image du personnage',{exact:true}).click();await p.getByLabel('Ou une adresse d’image',{exact:true}).fill('https://images.example.test/new.jpg');await p.getByRole('button',{name:'Ajouter cette image',exact:true}).click();await p.getByRole('status').filter({hasText:'Ton image est ajoutée'}).waitFor();assert.equal(await p.locator('main img').first().getAttribute('src'),'https://images.example.test/new.jpg');
 for(const width of[320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
 const guest=await context(false),g=await guest.newPage();await g.goto(base+'/personnages/fiche/?id='+cid);await g.getByRole('link',{name:'Se connecter avec son compte Slumbywise',exact:true}).waitFor();assert.equal(await g.getByRole('button',{name:'Voter',exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.ok(writes.every(w=>['create','vote','image'].includes(w.name)));
 console.log('Fiction community browser OK: existing account, new work/character, real file upload path, initial vote, failed vote retry, single changeable vote, image update, anonymous read/login and mobile layout.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
