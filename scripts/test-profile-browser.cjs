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
const profile={user_id:uid,operator_code:'TEST',display_name:'Test local',mbti:'INTJ',level:1,total_xp:0,rank_letter:'E',rank_tier:'NEUTRAL',constance:0,mastery_points:0,show_stats:true,show_revenue:false,show_rank:true,show_mbti:true};
const project={id:'p1',user_id:uid,title:'Lancer mon activité',status:'ACTIVE',type:'DUNGEON',progress_pct:0,phase_count:3,phase_current:0};
const quest={id:'q1',user_id:uid,project_id:'p1',title:'Rédiger la première offre',status:'PENDING',due_at:null,difficulty_tier:'ROUTINE',reward_eur:0,actual_minutes:0};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[],writes=[];let presentation={user_id:uid,bio:'',tagline:'',avatar:'moon',theme:'night'},posts=[];
const stats=[{id:'a',kind:'DISCIPLINE',level:3,xp:4},{id:'b',kind:'FOCUS',level:2,xp:10}];Object.assign(profile,{mbti_class:'Stratège',total_xp:4000,level:10,rank_letter:'D'});
await c.addCookies([{name:'sb-'+api.hostname.split('.')[0]+'-auth-token',value:'base64-'+Buffer.from(JSON.stringify(auth)).toString('base64url'),url:base,sameSite:'Lax'}]);
await c.route(api.origin+'/**',async route=>{const req=route.request(),url=new URL(req.url());if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'}});let result=[];
if(url.pathname==='/auth/v1/user')result=user;else if(url.pathname==='/auth/v1/token')result=auth;
else if(url.pathname==='/rest/v1/profiles'){if(req.method()==='PATCH'){const body=req.postDataJSON();assert.deepEqual(Object.keys(body),['display_name']);writes.push(body);Object.assign(profile,body);}result=profile;}
else if(url.pathname==='/rest/v1/stats')result=stats;
else if(url.pathname==='/rest/v1/profile_presentations'){if(req.method()==='POST'){presentation=req.postDataJSON();writes.push(presentation);}result=presentation;}
else if(url.pathname==='/rest/v1/profile_posts'){if(req.method()==='POST'){const body=req.postDataJSON();posts=[{...body,created_at:new Date().toISOString(),published_at:body.is_published?new Date().toISOString():null}];writes.push(body);}result=url.searchParams.get('is_published')==='eq.true'?posts.filter(x=>x.is_published):posts;}
else if(url.pathname==='/rest/v1/rpc/get_public_profile')result=[profile];else if(url.pathname==='/rest/v1/rpc/get_public_stats')result=stats.map(({kind,level})=>({kind,level}));
else if(req.method()!=='GET')throw Error('Unexpected write '+url.pathname);
return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});});p.on('pageerror',e=>errors.push(e.message));
await p.goto(base+'/profile/');await p.getByRole('button',{name:'Personnaliser mon profil'}).click();const statBlock=p.getByRole('region',{name:'Statistiques Grindleveling'}),original=await statBlock.innerText();
await p.getByLabel(/^Pseudo/).fill('Nuit tranquille');await p.getByLabel('À propos',{exact:true}).fill('Mon parcours.');await p.getByLabel('Ambiance',{exact:true}).selectOption('violet');await p.getByRole('button',{name:'Enregistrer la présentation'}).click();await p.getByRole('status').filter({hasText:'Présentation enregistrée'}).waitFor();assert.equal(await statBlock.innerText(),original);
await p.getByRole('button',{name:'Écrire un article'}).click();await p.getByLabel('Titre',{exact:true}).fill('Première étape');await p.getByLabel('Texte',{exact:true}).fill('J’avance à mon rythme. <script>test</script>');await p.getByRole('button',{name:'Garder en brouillon'}).click();await p.getByText('Brouillon privé',{exact:true}).waitFor();assert.equal(posts[0].is_published,false);
await p.getByRole('button',{name:'Modifier',exact:true}).click();await p.getByRole('button',{name:'Publier aux membres',exact:true}).click();await p.getByRole('status').filter({hasText:'Article publié'}).waitFor();assert.equal(posts[0].is_published,true);assert.equal(await statBlock.innerText(),original);
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await p.screenshot({path:path.join(root,'test-results/profile-mobile.png'),fullPage:true});
await p.goto(base+'/member/?id='+uid);await p.getByRole('heading',{name:'Première étape'}).waitFor();assert.equal(await p.getByRole('button',{name:'Personnaliser mon profil'}).count(),0);assert.equal(await p.getByRole('region',{name:'Statistiques Grindleveling'}).innerText(),original);
for(const width of[320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
assert.equal(profile.total_xp,4000);assert.equal(writes.length,4);assert.deepEqual(errors,[]);console.log('Profile browser OK: customize, unchanged shared stats, private draft, explicit publish, escaped text, member view, mobile. All account APIs mocked.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
