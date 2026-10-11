(function(){
'use strict';

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2]);};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d);};
const daysBetween=(a,b)=>Math.round((parse(b)-parse(a))/86400000);
const nf=new Intl.NumberFormat('it-IT',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('it-IT',{maximumFractionDigits:1});
const fmt=n=>nf.format(Math.round(n));
const f1=n=>nf1.format(n);
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const r1=n=>Math.round(n*10)/10;
const r3=n=>Math.round(n*1000)/1000;
const nfk=new Intl.NumberFormat('it-IT',{maximumFractionDigits:3});
const nfL=new Intl.NumberFormat('it-IT',{minimumFractionDigits:1,maximumFractionDigits:2});
const fmtL=ml=>nfL.format(ml/1000)+' L';
const fmtX=v=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:v>=100?0:v>=10?1:2}).format(v);
const parseNum=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:NaN;};

/* ---------- constants ---------- */
const MEALS=[['colazione','Colazione'],['pranzo','Pranzo'],['spuntino','Spuntino'],['cena','Cena']];
const ACTS=[['R','Riposo'],['P','Piscina'],['A','Allenamento'],['PA','Piscina + pesi']];
const INT=[['low','Leggera'],['mid','Moderata'],['high','Intensa']];
const MET={swim:{low:5.0,mid:7.0,high:9.8},gym:{low:3.5,mid:5.0,high:6.0}};
const TO_G={g:1,mg:1e-3,'µg':1e-6};
const FIXED_X=[['Fibre','#cFib'],['Zuccheri','#cSug'],['Grassi saturi','#cSat'],['Sale','#cSalt']];
const DEFAULT_U={'vitamina a':'µg','vitamina b12':'µg','vitamina d':'µg','vitamina k':'µg','vitamina b9':'µg','folati':'µg','biotina':'µg','selenio':'µg','iodio':'µg'};
const WEEK=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const DEFAULT_PROFILE={sex:'M',age:18,height:175,weight:70,neat:1.3,surplus:10,protein:1.8,
  plan:['R','R','R','R','R','R','R'],swimMin:60,swimInt:'mid',gymMin:60,gymInt:'mid',glassMl:200,bottleMl:500,touched:false};

/* ---------- state ---------- */
const TODAY=iso(new Date());
function defaultMeal(){const h=new Date().getHours();return h<10?'colazione':h<15?'pranzo':h<18?'spuntino':'cena';}
const S={profile:clone(DEFAULT_PROFILE),days:{},weights:[],foods:[],dishes:[],listFilter:'',editId:null,date:TODAY,meal:defaultMeal(),wUnit:'glass',weekOff:0,
  sub:{oggi:'riepilogo',obiettivi:'dati',peso:'registra'},planNote:null,dishFor:null,dishSel:null,dishConfirm:false};
const pl=(n,a,b)=>n+' '+(n===1?a:b);
const wd=date=>(parse(date).getDay()+6)%7;

let xOpen=true;
document.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('xdet')) xOpen=e.target.open;},true);
function normExtras(x){
  return (Array.isArray(x)?x:[]).filter(e=>e&&e.n&&isFinite(+e.v)&&+e.v>0).map(e=>({n:String(e.n),v:+e.v,u:TO_G[e.u]?e.u:'g'}));
}
function normFoods(list){
  return (Array.isArray(list)?list:[]).filter(f=>f&&typeof f.n==='string'&&f.id).map(f=>({
    id:String(f.id),n:f.n,k:+f.k||0,p:+f.p||0,c:+f.c||0,f:+f.f||0,g:+f.g||100,u:+f.u||0,
    un:f.un==='ml'?'ml':'g',
    list:typeof f.list==='string'?f.list:'',
    x:normExtras(f.x)}));
}
function normItem(e){
  return {name:String(e.name||'').slice(0,80),g:+e.g||0,un:e.un==='ml'?'ml':'g',kcal:+e.kcal||0,p:+e.p||0,c:+e.c||0,f:+e.f||0,x:normExtras(e.x)};
}
function normDishes(list){
  return (Array.isArray(list)?list:[]).filter(d=>d&&typeof d.n==='string'&&d.id&&Array.isArray(d.items)).map(d=>({
    id:String(d.id),n:d.n.slice(0,60),u:+d.u||0,
    items:d.items.filter(i=>i&&i.name).map(normItem)})).filter(d=>d.items.length);
}
function normProfile(p){
  const q=Object.assign(clone(DEFAULT_PROFILE),p||{});
  if(!Array.isArray(q.plan)||q.plan.length!==7) q.plan=DEFAULT_PROFILE.plan.slice();
  return q;
}
function newDay(date){
  const p=S.profile, idx=(parse(date).getDay()+6)%7;
  return {date,act:p.plan[idx]||'R',swimMin:p.swimMin,swimInt:p.swimInt,gymMin:p.gymMin,gymInt:p.gymInt,entries:[]};
}
function getDay(date){return S.days[date]||newDay(date);}
function editDay(date){if(!S.days[date]) S.days[date]=newDay(date);return S.days[date];}
function totals(d){
  return d.entries.reduce((a,e)=>({kcal:a.kcal+e.kcal,p:a.p+e.p,c:a.c+e.c,f:a.f+e.f}),{kcal:0,p:0,c:0,f:0});
}

function dishTotals(d,m){
  m=m||1;
  return d.items.reduce((a,i)=>({kcal:a.kcal+i.kcal*m,p:a.p+i.p*m,c:a.c+i.c*m,f:a.f+i.f*m}),{kcal:0,p:0,c:0,f:0});
}
function scaleX(list,k){return (list||[]).map(e=>({n:e.n,v:r3(e.v*k),u:e.u}));}
function scaleExtras(food,k){return scaleX(food.x,k);}
function totalsExtra(d){
  const map=new Map();
  d.entries.forEach(e=>(e.x||[]).forEach(x=>{
    const key=norm(x.n);
    let t=map.get(key);
    if(!t){t={n:x.n,u:x.u,g:0};map.set(key,t);}
    t.g+=x.v*(TO_G[x.u]||1);
  }));
  const rank=n=>{const i=FIXED_X.findIndex(a=>norm(a[0])===norm(n));return i<0?99:i;};
  return Array.from(map.values()).map(t=>({n:t.n,u:t.u,v:t.g/(TO_G[t.u]||1)}))
    .sort((a,b)=>rank(a.n)-rank(b.n)||a.n.localeCompare(b.n,'it'));
}

/* ---------- the science ---------- */
function calc(p,d,actOv){
  const act=actOv||d.act;
  const bmr=10*p.weight+6.25*p.height-5*p.age+(p.sex==='M'?5:-161);
  const base=bmr*p.neat;
  const net=(met,min)=>(met-1)*p.weight*(min/60);
  const swim=(act==='P'||act==='PA')?net(MET.swim[d.swimInt]||7,d.swimMin):0;
  const gym=(act==='A'||act==='PA')?net(MET.gym[d.gymInt]||5,d.gymMin):0;
  const maint=base+swim+gym;
  const target=Math.round(maint*(1+p.surplus/100)/10)*10;
  const prot=Math.round(p.protein*p.weight);
  const fat=Math.round(Math.max(0.8*p.weight,target*0.25/9));
  const carb=Math.max(0,Math.round((target-prot*4-fat*9)/4));
  return {bmr,base,swim,gym,maint,target,surplus:target-maint,prot,fat,carb};
}

/* ---------- acqua consigliata ---------- */
/* Acqua da bere (senza quella degli alimenti): circa 30 ml per kg di peso, piu' 400, 600 o 800 ml per ogni ora di sport
   secondo l'intensita'. Arrotondata a 50 ml. Stima, non una regola. */
const WATER_H={low:400,mid:600,high:800};
function waterGoal(p,d,actOv){
  const act=actOv||d.act;
  const sw=(act==='P'||act==='PA')?(WATER_H[d.swimInt]||600)*(d.swimMin/60):0;
  const gy=(act==='A'||act==='PA')?(WATER_H[d.gymInt]||600)*(d.gymMin/60):0;
  return Math.round((30*p.weight+sw+gy)/50)*50;
}
function waterTotal(d){return (d.water||[]).reduce((a,w)=>a+(+w.ml||0),0);}

/* ---------- valori di riferimento giornalieri (LARN, adulti) ---------- */
/* type 'min' = quota da raggiungere, 'max' = tetto da non superare. m/f = uomo/donna. */
const REF=[
  {n:['fibre','fibra','fibre alimentari'],v:25,u:'g',type:'min'},
  {n:['zuccheri','zucchero','zuccheri semplici'],pctE:15,per:4,u:'g',type:'max'},
  {n:['grassi saturi','saturi','acidi grassi saturi'],pctE:10,per:9,u:'g',type:'max'},
  {n:['sale'],v:5,u:'g',type:'max'},
  {n:['sodio'],v:2000,u:'mg',type:'max'},
  {n:['vitamina a','retinolo'],m:750,f:650,u:'µg',type:'min'},
  {n:['vitamina b1','tiamina','vitamina b1 (tiamina)'],perKcal:0.4,u:'mg',type:'min'},
  {n:['vitamina b2','riboflavina','vitamina b2 (riboflavina)'],v:1.6,u:'mg',type:'min'},
  {n:['vitamina b3','niacina','vitamina b3 (niacina)','vitamina pp'],v:18,u:'mg',type:'min'},
  {n:['vitamina b6','piridossina'],m:1.6,f:1.4,u:'mg',type:'min'},
  {n:['vitamina b9','folati','folato','acido folico'],v:330,u:'µg',type:'min'},
  {n:['vitamina b12','cobalamina'],v:4,u:'µg',type:'min'},
  {n:['vitamina c','acido ascorbico'],m:105,f:85,u:'mg',type:'min'},
  {n:['vitamina d','colecalciferolo'],v:15,u:'µg',type:'min'},
  {n:['vitamina e','tocoferolo'],m:13,f:12,u:'mg',type:'min'},
  {n:['vitamina k'],m:135,f:125,u:'µg',type:'min'},
  {n:['calcio'],v:950,u:'mg',type:'min'},
  {n:['ferro'],m:10,f:18,u:'mg',type:'min'},
  {n:['magnesio'],v:350,u:'mg',type:'min'},
  {n:['fosforo'],v:550,u:'mg',type:'min'},
  {n:['potassio'],v:4500,u:'mg',type:'min'},
  {n:['zinco'],m:12,f:9,u:'mg',type:'min'},
  {n:['selenio'],v:55,u:'µg',type:'min'},
  {n:['iodio'],v:150,u:'µg',type:'min'}
];
const REF_MAP=new Map();
REF.forEach(r=>r.n.forEach(n=>REF_MAP.set(norm(n),r)));
/* Ritorna {g: riferimento in grammi, type} oppure null se non c'e' un riferimento per quel nome. */
function refFor(name,p,target){
  const r=REF_MAP.get(norm(String(name).trim()));
  if(!r) return null;
  let v=r.v;
  if(r.m!==undefined) v=p.sex==='F'?r.f:r.m;
  if(r.perKcal) v=r.perKcal*target/1000;
  if(r.pctE) v=r.pctE/100*target/r.per;
  return {g:v*TO_G[r.u],type:r.type};
}

/* ---------- storage ---------- */
const LS='yourfood.v1';
let dbCol=null, dbBroken=false;
function lsRead(){try{const raw=localStorage.getItem(LS);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function lsWrite(){
  const json=JSON.stringify({profile:S.profile,days:S.days,weights:S.weights,foods:S.foods,dishes:S.dishes});
  try{localStorage.setItem(LS,json);}catch(e){}
  nativePost(json);
}
/* Ponte verso l'app Android (Flutter): ogni salvataggio viene copiato anche fuori dal browser.
   Nel browser normale window.YourFoodNative non esiste e questa parte non fa nulla. */
function nativePost(json){
  try{
    if(window.YourFoodNative&&typeof window.YourFoodNative.postMessage==='function') window.YourFoodNative.postMessage(json);
  }catch(e){}
}
/* Chiamata da Flutter a pagina caricata: se il browser interno e' vuoto, rimette i dati salvati nativamente. */
window.yourfoodRestore=function(json){
  try{
    const data=JSON.parse(json);
    const has=d=>!!d&&((d.profile&&d.profile.touched)||(d.days&&Object.keys(d.days).length>0)||(d.weights&&d.weights.length>0)||(d.foods&&d.foods.length>0)||(d.dishes&&d.dishes.length>0));
    if(has(lsRead())||!has(data)) return;
    adopt(data);
    S.weights.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
    lsWrite();
    renderAll();
    setStatus('ready');
  }catch(e){}
};
function adopt(data){
  if(!data) return;
  if(data.profile) S.profile=normProfile(data.profile);
  if(data.days&&typeof data.days==='object') S.days=data.days;
  if(Array.isArray(data.weights)) S.weights=data.weights;
  if(Array.isArray(data.foods)) S.foods=normFoods(data.foods);
  if(Array.isArray(data.dishes)) S.dishes=normDishes(data.dishes);
}
function setStatus(kind){
  const el=$('#status');
  const online=dbCol&&!dbBroken;
  const map={
    loading:'Carico i tuoi dati',
    ready:online?'Salvataggio nel tuo account':'Salvataggio su questo dispositivo',
    saving:'Salvo',
    saved:online?'Salvato nel tuo account':'Salvato su questo dispositivo',
    local:'Salvato su questo dispositivo',
    error:'Non salvato, riprovo al prossimo cambio'
  };
  el.textContent=map[kind]||'';
  el.dataset.kind=kind==='local'?'saved':kind;
}
const timers={}, chains={};
function dataFor(key){
  if(key==='profile') return clone(S.profile);
  if(key==='weights') return {list:clone(S.weights)};
  if(key==='foods') return {list:clone(S.foods)};
  if(key==='dishes') return {list:clone(S.dishes)};
  const day=S.days[key.slice(2)];
  return day?clone(day):null;
}
async function persist(key){
  const data=dataFor(key);
  if(!data) return;
  lsWrite();
  if(dbCol&&!dbBroken){
    try{
      await dbCol.doc(key).set(data);
    }catch(e){
      if(e&&e.code==='unavailable'){
        await new Promise(r=>setTimeout(r,400+Math.random()*600));
        await dbCol.doc(key).set(data);
      }else throw e;
    }
  }
}
function run(key){
  delete timers[key];
  const prev=chains[key]||Promise.resolve();
  chains[key]=prev.then(()=>persist(key)).then(()=>{
    if(!Object.keys(timers).length) setStatus('saved');
  }).catch(e=>{
    const hard=e&&['invalid_argument','revoked','not_granted','capability_disabled','capability_removed','quota_exceeded'].indexOf(e.code)>=0;
    if(hard) dbBroken=true;
    setStatus(hard?'local':'error');
  });
}
function queueSave(key){
  clearTimeout(timers[key]);
  setStatus('saving');
  timers[key]=setTimeout(()=>run(key),500);
}
function flushAll(){Object.keys(timers).forEach(k=>{clearTimeout(timers[k]);run(k);});}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden') flushAll();});
window.addEventListener('pagehide',flushAll);

/* ---------- rendering: Oggi ---------- */
function renderHeader(){
  const d=parse(S.date);
  const diff=daysBetween(TODAY,S.date);
  $('#dateTag').textContent=diff===0?'Oggi':diff===-1?'Ieri':diff===1?'Domani':'';
  const l=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  $('#dateLabel').textContent=l.charAt(0).toUpperCase()+l.slice(1);
  const n=$('#setupNote');
  if(!S.profile.touched){
    n.innerHTML='<div class="note"><span>Sto usando dati di esempio ('+esc(S.profile.height)+' cm, '+esc(S.profile.weight)+' kg). Inserisci i tuoi per avere numeri giusti.</span><button class="link" type="button" data-goto="obiettivi">Inserisci i miei dati</button></div>';
  }else n.innerHTML='';
}
function renderDayCard(){
  const d=getDay(S.date);
  const chips=ACTS.map(a=>'<button type="button" class="chip" data-act="'+a[0]+'" aria-pressed="'+(d.act===a[0])+'">'+a[1]+'</button>').join('');
  const hasP=d.act==='P'||d.act==='PA', hasA=d.act==='A'||d.act==='PA';
  const opts=cur=>INT.map(i=>'<option value="'+i[0]+'"'+(cur===i[0]?' selected':'')+'>'+i[1]+'</option>').join('');
  const row=(label,mk,ik)=>'<div class="train"><div class="train-name">'+label+'</div>'+
    '<label class="field"><span>Minuti</span><input type="number" inputmode="numeric" min="5" max="300" step="5" value="'+d[mk]+'" data-f="'+mk+'"></label>'+
    '<label class="field"><span>Intensità</span><select data-f="'+ik+'">'+opts(d[ik])+'</select></label></div>';
  const pn=S.planNote&&S.planNote.date===S.date?'<div class="note" style="margin-top:14px"><span>Ho aggiornato anche il piano di ogni '+WEEK[S.planNote.idx].toLowerCase()+'.</span><button class="link" type="button" data-plan-undo>Solo per oggi</button></div>':'';
  $('#dayCard').innerHTML='<h2 class="h">Attività del giorno</h2><div class="chips" role="group" aria-label="Tipo di giornata">'+chips+'</div>'+pn+
    (hasP?row('Piscina','swimMin','swimInt'):'')+(hasA?row('Allenamento con pesi','gymMin','gymInt'):'');
}
function renderNumbers(){
  const d=getDay(S.date), c=calc(S.profile,d), t=totals(d);
  const left=c.target-t.kcal;
  const over=t.kcal>c.target*1.05;
  const actLabel=ACTS.find(a=>a[0]===d.act)[1];
  const pct=c.target?Math.min(100,t.kcal/c.target*100):0;
  const mrow=(label,eaten,tg,col)=>'<div class="macro"><span class="m-name"><i style="background:var(--'+col+')"></i>'+label+'</span>'+
    '<div class="bar" style="--bar:var(--'+col+')"><i style="width:'+Math.min(100,tg?eaten/tg*100:0)+'%"></i></div>'+
    '<span class="m-val"><b>'+fmt(eaten)+'</b> / '+fmt(tg)+' g</span></div>';
  const xt=totalsExtra(d);
  const isFixed=n=>FIXED_X.some(a=>norm(a[0])===norm(n));
  const xitem=x=>{
    const r=refFor(x.n,S.profile,c.target), k=TO_G[x.u]||1;
    if(!r) return '<li class="xi"><span>'+esc(x.n)+'</span><b>'+fmtX(x.v)+' '+x.u+'</b></li>';
    const pct=r.g?x.v*k/r.g*100:0;
    const col=r.type==='max'?(pct>100?'--warn':'--accent'):(pct>=100?'--ok':'--accent');
    return '<li class="xi"><span>'+esc(x.n)+'</span><b>'+fmtX(x.v)+' / '+(r.type==='max'?'max ':'')+fmtX(r.g/k)+' '+x.u+'</b>'+
      '<div class="bar thin" style="--bar:var('+col+')"><i style="width:'+Math.min(100,pct)+'%"></i></div></li>';
  };
  const group=(title,list)=>list.length?'<div class="eyebrow sec2">'+title+'</div><ul class="xlist">'+list.map(xitem).join('')+'</ul>':'';
  const xhtml=xt.length?'<details class="xdet"'+(xOpen?' open':'')+'><summary>Altri valori di oggi</summary>'+
    group('Fibre, zuccheri, grassi saturi e sale',xt.filter(x=>isFixed(x.n)))+group('Vitamine e minerali',xt.filter(x=>!isFixed(x.n)))+
    '<p class="hint">Riferimenti per adulti (LARN). Fibre, vitamine e minerali sono quote da raggiungere. Zuccheri, grassi saturi, sale e sodio sono un massimo.</p></details>':'';
  const wGoal=waterGoal(S.profile,d), wTot=waterTotal(d);
  const wrow='<div class="macro"><span class="m-name"><i style="background:var(--accent)"></i>Acqua</span>'+
    '<div class="bar" style="--bar:var(--accent)"><i style="width:'+Math.min(100,wGoal?wTot/wGoal*100:0)+'%"></i></div>'+
    '<span class="m-val"><b>'+nfL.format(wTot/1000)+'</b> / '+nfL.format(wGoal/1000)+' L</span></div>';
  $('#numbers').innerHTML=
    '<div class="hero-label">Obiettivo del giorno <span class="pill">'+actLabel+'</span><button class="link" type="button" data-sub-go="attivita">Cambia</button></div>'+
    '<div class="hero-num">'+fmt(c.target)+'<small>kcal</small></div>'+
    '<div class="kcalrow"><span><b>'+fmt(t.kcal)+'</b> kcal mangiate</span><span>'+(left>=0?'ne restano <b>'+fmt(left)+'</b>':'<b>'+fmt(-left)+'</b> oltre')+'</span></div>'+
    '<div class="bar lane" style="--bar:var('+(over?'--warn':'--accent')+')"><i style="width:'+pct+'%"></i></div>'+
    '<div class="macros">'+mrow('Proteine',t.p,c.prot,'p')+mrow('Carboidrati',t.c,c.carb,'c')+mrow('Grassi',t.f,c.fat,'f')+wrow+'</div>'+xhtml;
  renderMini();
  renderWater();
}
function renderMini(){
  const d=getDay(S.date), c=calc(S.profile,d), t=totals(d);
  const left=c.target-t.kcal, over=t.kcal>c.target*1.05;
  const pct=c.target?Math.min(100,t.kcal/c.target*100):0;
  const mm=(l,e,tg,col)=>'<span class="mm"><i style="background:var(--'+col+')"></i>'+l+' <b>'+fmt(e)+'</b>/'+fmt(tg)+' g</span>';
  $('#miniNumbers').innerHTML='<div class="kcalrow"><span><b>'+fmt(t.kcal)+'</b> / '+fmt(c.target)+' kcal</span><span>'+(left>=0?'ne restano <b>'+fmt(left)+'</b>':'<b>'+fmt(-left)+'</b> oltre')+'</span></div>'+
    '<div class="bar lane" style="--bar:var('+(over?'--warn':'--accent')+')"><i style="width:'+pct+'%"></i></div>'+
    '<div class="mm-row">'+mm('Proteine',t.p,c.prot,'p')+mm('Carboidrati',t.c,c.carb,'c')+mm('Grassi',t.f,c.fat,'f')+'</div>';
}
function renderMeals(){
  const d=getDay(S.date);
  $('#meals').innerHTML=MEALS.map(m=>{
    const es=d.entries.filter(e=>e.meal===m[0]);
    const sum=es.reduce((a,e)=>a+e.kcal,0);
    const rows=es.length?es.map(e=>'<li class="row"><div class="row-main"><span class="row-name">'+esc(e.name)+'</span><span class="row-sub">'+(e.g?fmt(e.g)+' '+(e.un||'g')+' · ':'')+'P '+f1(e.p)+' · C '+f1(e.c)+' · G '+f1(e.f)+'</span></div>'+
      '<span class="row-kcal">'+fmt(e.kcal)+'</span><button type="button" class="x" data-del="'+esc(e.id)+'" aria-label="Elimina '+esc(e.name)+'">&times;</button></li>').join(''):'<li class="empty">Ancora niente</li>';
    let foot='';
    if(es.length){
      foot=S.dishFor===m[0]?
        '<div class="dishsave"><input type="text" maxlength="60" placeholder="Nome del piatto" data-dname aria-label="Nome del piatto"><div class="form-actions"><button class="btn" type="button" data-dsave-ok="'+m[0]+'">Salva piatto</button><button class="link" type="button" data-dsave-cancel>Annulla</button></div></div>'
        :'<button class="link" type="button" data-dsave="'+m[0]+'">Salva come piatto</button>';
    }
    return '<section class="card"><div class="meal-head"><h3 class="h3">'+m[1]+'</h3><span class="meal-kcal">'+fmt(sum)+' kcal</span></div><ul class="list">'+rows+'</ul>'+foot+'</section>';
  }).join('');
  if(S.dishFor){const i=$('[data-dname]');if(i) i.focus();}
}
function renderMealChips(){
  const html=MEALS.map(m=>'<button type="button" class="chip" data-meal="'+m[0]+'" aria-pressed="'+(S.meal===m[0])+'">'+m[1]+'</button>').join('');
  $$('.mealchips').forEach(el=>{el.innerHTML=html;});
  const lab='Aggiungi a '+MEALS.find(m=>m[0]===S.meal)[1];
  $('#pickAdd').textContent=lab; $('#dishAdd').textContent=lab;
}

/* ---------- food search and add ---------- */
let pick=null;
function foodById(id){return S.foods.find(f=>f.id===id)||null;}
function listNames(){
  const set=new Set(S.foods.map(f=>f.list).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'it'));
}
function canonList(name){
  name=String(name||'').trim().slice(0,30);
  if(!name) return '';
  return listNames().find(l=>norm(l)===norm(name))||name;
}
function renderListChips(){
  const names=listNames(), el=$('#listChips');
  $('#dlLists').innerHTML=names.map(n=>'<option value="'+esc(n)+'">').join('');
  if(S.listFilter&&names.indexOf(S.listFilter)<0) S.listFilter='';
  if(!names.length){el.hidden=true;el.innerHTML='';return;}
  el.hidden=false;
  el.innerHTML=[''].concat(names).map(n=>'<button type="button" class="chip" data-lf="'+esc(n)+'" aria-pressed="'+(S.listFilter===n)+'">'+(n?esc(n):'Tutti')+'</button>').join('');
}
function searchFoods(q){
  q=norm(q.trim());
  const byUse=(a,b)=>(b.u||0)-(a.u||0)||a.n.localeCompare(b.n,'it');
  let pool=S.foods;
  if(S.listFilter) pool=pool.filter(f=>f.list===S.listFilter);
  if(!q) return pool.slice().sort(byUse).slice(0,S.listFilter?30:8);
  const words=q.split(/\s+/);
  return pool.filter(f=>{const n=norm(f.n);return words.every(w=>n.indexOf(w)>=0);}).sort(byUse).slice(0,10);
}
function renderResults(){
  renderListChips();
  const q=$('#foodSearch').value.trim(), list=searchFoods(q), el=$('#foodResults');
  if(!S.foods.length){
    el.innerHTML='<p class="muted">Il tuo elenco è vuoto. Aggiungi il primo alimento con "Nuovo alimento" qui sotto, la prossima volta lo trovi qui.</p>';
    return;
  }
  if(!list.length){
    el.innerHTML='<p class="muted">Nessun alimento con questo nome. Aggiungilo con "Nuovo alimento" qui sotto.</p>';
    return;
  }
  el.innerHTML=(q?'':'<div class="eyebrow">'+(S.listFilter?esc(S.listFilter):'Usati di recente')+'</div>')+'<ul class="list">'+list.map(f=>
    '<li class="resrow"><button type="button" class="res" data-food="'+esc(f.id)+'"><span class="res-name">'+esc(f.n)+'</span><span class="res-sub">P '+f1(f.p)+' · C '+f1(f.c)+' · G '+f1(f.f)+' ogni 100 '+(f.un||'g')+'</span><span class="res-kcal">'+fmt(f.k)+'<small> kcal</small></span></button>'+
    '<button type="button" class="x" data-fdel="'+esc(f.id)+'" aria-label="Rimuovi '+esc(f.n)+' dall\'elenco">&times;</button></li>').join('')+'</ul>';
}
function updatePreview(){
  const g=parseFloat($('#pickG').value), el=$('#pickPreview'), dt=$('#pickDetail');
  if(!pick||!(g>0)){el.textContent='';dt.textContent='';return;}
  const k=g/100;
  el.innerHTML='<b>'+fmt(pick.k*k)+'</b> kcal<br>P '+f1(pick.p*k)+' · C '+f1(pick.c*k)+' · G '+f1(pick.f*k);
  dt.textContent=scaleExtras(pick,k).map(e=>e.n+' '+fmtX(e.v)+' '+e.u).join(' · ');
}
function openPick(f){
  pick=f;
  $('#foodPick').hidden=false;
  $('#pickName').textContent=f.n;
  $('#pickNote').textContent=f.note||'';
  $('#pickGLabel').textContent='Quantità ('+(f.un||'g')+')';
  $('#pickG').value=f.g||100;
  updatePreview();
  const g=$('#pickG'); g.focus(); g.select();
}
function closePick(){pick=null;$('#foodPick').hidden=true;}
let msgTimer=null;
function flash(id,text,ms){
  const el=$(id); el.textContent=text;
  clearTimeout(msgTimer); msgTimer=setTimeout(()=>{el.textContent='';},ms||2500);
}
function addEntry(e){
  const d=editDay(S.date);
  d.entries.push(Object.assign({id:uid()},e));
  queueSave('d-'+S.date);
  renderNumbers(); renderMeals();
  flash('#addMsg','Aggiunto a '+MEALS.find(m=>m[0]===e.meal)[1]+'.');
}

/* ---------- rendering: Obiettivi ---------- */
function syncProfileForm(){
  const p=S.profile;
  $$('[data-p]').forEach(el=>{el.value=p[el.dataset.p];});
  $$('[data-sex]').forEach(b=>b.setAttribute('aria-pressed',String(p.sex===b.dataset.sex)));
  $$('#planForm select').forEach(s=>{s.value=p.plan[+s.dataset.plan];});
}
function buildStaticForms(){
  const actOpts=ACTS.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join('');
  $('#planForm').innerHTML=WEEK.map((w,i)=>'<label class="planrow"><span>'+w+'</span><select data-plan="'+i+'">'+actOpts+'</select></label>').join('');
  const io=INT.map(i=>'<option value="'+i[0]+'">'+i[1]+'</option>').join('');
  $('#dSwimInt').innerHTML=io; $('#dGymInt').innerHTML=io;
}
function renderWaterTable(){
  const p=S.profile;
  const base={swimMin:p.swimMin,swimInt:p.swimInt,gymMin:p.gymMin,gymInt:p.gymInt};
  const rows=ACTS.map(a=>{const ml=waterGoal(p,base,a[0]);
    return '<tr><th scope="row">'+a[1]+'</th><td class="k">'+fmtL(ml)+'</td><td>'+Math.round(ml/(p.glassMl||200))+'</td></tr>';}).join('');
  $('#waterTable').innerHTML='<table class="tbl"><thead><tr><th>Giornata</th><th>Acqua</th><th>Bicchieri</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

/* ---------- rendering: Peso ---------- */
function getTrend(){
  const list=S.weights;
  if(list.length<2) return null;
  const last=list[list.length-1].d;
  const win=list.filter(e=>daysBetween(e.d,last)<=21);
  if(win.length<2) return null;
  const first=win[0].d;
  const span=daysBetween(first,last);
  if(span<6) return null;
  const xs=win.map(e=>daysBetween(first,e.d)), ys=win.map(e=>e.kg);
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
  let num=0,den=0;
  xs.forEach((x,i)=>{num+=(x-mx)*(ys[i]-my);den+=(x-mx)*(x-mx);});
  const slope=den?num/den:0;
  return {kgWeek:slope*7,pct:slope*7/my*100,span};
}
function adviceFor(tr){
  if(!tr) return {tone:'info',text:'Servono pesate distribuite su almeno una settimana per capire la tendenza.'};
  if(tr.pct<0) return {tone:'warn',text:'Il peso scende. Per costruire muscolo servono più calorie. Prova ad aggiungere circa 150-200 kcal al giorno (surplus più alto) e controlla di mangiare tutto il piano nei giorni di sport.'};
  if(tr.pct<0.15) return {tone:'warn',text:'Il peso è quasi fermo. Aggiungi circa 150 kcal al giorno e riguarda tra una settimana.'};
  if(tr.pct<=0.5) return {tone:'ok',text:'Ritmo giusto. A questa velocità è più probabile che tu stia prendendo muscolo che grasso.'};
  return {tone:'warn',text:'Il peso sale troppo in fretta. Una parte sarà grasso, pancia compresa. Togli circa 150-200 kcal al giorno (surplus più basso).'};
}
function chartSVG(list){
  const pts=list.slice(-30).map(e=>({t:parse(e.d).getTime(),kg:e.kg,d:e.d}));
  if(pts.length<2) return '';
  const W=320,H=150,L=40,R=12,T=22,B=24;
  const t0=pts[0].t,t1=pts[pts.length-1].t;
  let lo=Math.min.apply(null,pts.map(p=>p.kg)), hi=Math.max.apply(null,pts.map(p=>p.kg));
  lo=Math.floor((lo-0.3)*2)/2; hi=Math.ceil((hi+0.3)*2)/2;
  if(hi-lo<1) hi=lo+1;
  const x=t=>L+(t1===t0?0.5:(t-t0)/(t1-t0))*(W-L-R);
  const y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const ticks=[lo,(lo+hi)/2,hi];
  let g='';
  ticks.forEach(v=>{g+='<line class="grid-line" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"/><text class="axis" x="'+(L-6)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+f1(v)+'</text>';});
  const path=pts.map((p,i)=>(i?'L':'M')+x(p.t).toFixed(1)+' '+y(p.kg).toFixed(1)).join(' ');
  const area=path+' L'+x(t1).toFixed(1)+' '+y(lo).toFixed(1)+' L'+x(t0).toFixed(1)+' '+y(lo).toFixed(1)+' Z';
  const dots=pts.slice(0,-1).map(p=>'<circle class="pt" cx="'+x(p.t).toFixed(1)+'" cy="'+y(p.kg).toFixed(1)+'" r="3"/>').join('');
  const lp=pts[pts.length-1];
  const sd=s=>parse(s).toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Andamento del peso">'+g+
    '<path class="area" d="'+area+'"/><path class="line" d="'+path+'"/>'+dots+
    '<circle class="pt-end" cx="'+x(lp.t).toFixed(1)+'" cy="'+y(lp.kg).toFixed(1)+'" r="4.5"/>'+
    '<text class="val" x="'+x(lp.t).toFixed(1)+'" y="'+(y(lp.kg)-10).toFixed(1)+'" text-anchor="end">'+f1(lp.kg)+'</text>'+
    '<text class="axis" x="'+L+'" y="'+(H-6)+'" text-anchor="start">'+sd(pts[0].d)+'</text>'+
    '<text class="axis" x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+sd(lp.d)+'</text></svg>';
}
function renderWeight(){
  const list=S.weights, tc=$('#trendCard'), wl=$('#weightList');
  if(!list.length){
    tc.innerHTML='<h2 class="h">Tendenza</h2><p class="muted">Registra il peso almeno una volta a settimana. Dopo una settimana di pesate ti dico se le calorie vanno bene per crescere senza mettere pancia.</p>';
    wl.innerHTML='';
    return;
  }
  const last=list[list.length-1], tr=getTrend(), ad=adviceFor(tr);
  let top='<div><div class="eyebrow">Ultimo peso</div><div class="big">'+f1(last.kg)+'<small>kg</small></div></div>';
  if(tr) top+='<div><div class="eyebrow">Tendenza</div><div class="big">'+(tr.kgWeek>=0?'+':'')+f1(r1(tr.kgWeek))+'<small>kg/sett. ('+(tr.pct>=0?'+':'')+f1(r1(tr.pct))+'%)</small></div></div>';
  tc.innerHTML='<h2 class="h">Tendenza</h2><div class="trend-top">'+top+'</div>'+
    '<div class="tone" data-tone="'+ad.tone+'">'+esc(ad.text)+'</div>'+chartSVG(list);
  const rows=list.slice().reverse().slice(0,12).map(e=>'<li class="row"><div class="row-main"><span class="row-name">'+f1(e.kg)+' kg</span><span class="row-sub">'+
    parse(e.d).toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'})+'</span></div><span></span>'+
    '<button type="button" class="x" data-wdel="'+e.d+'" aria-label="Elimina la pesata">&times;</button></li>').join('');
  wl.innerHTML='<h2 class="h">Ultime pesate</h2><ul class="list">'+rows+'</ul>';
}

/* ---------- rendering: Peso, resoconto della settimana ---------- */
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
function weekData(off){
  const end=addDays(TODAY,off*7), out=[];
  for(let i=6;i>=0;i--){
    const date=addDays(end,-i), d=getDay(date);
    out.push({date,logged:d.entries.length>0,t:totals(d),c:calc(S.profile,d),wGoal:waterGoal(S.profile,d),wTot:waterTotal(d),wLogged:(d.water||[]).length>0});
  }
  return out;
}
function weekAdvice(n,a,wd){
  if(n<3) return {tone:'info',text:'Servono almeno 3 giorni con i pasti registrati per un quadro attendibile.'};
  const parts=[]; let tone='ok';
  const dk=a.k-a.kt, pk=a.kt?dk/a.kt*100:0;
  if(pk<-10){tone='warn';parts.push('In media sei stato circa '+fmt(-dk)+' kcal sotto l\'obiettivo. Per crescere servono più calorie, soprattutto nei giorni di sport.');}
  else if(pk>10){tone='warn';parts.push('In media sei stato circa '+fmt(dk)+' kcal sopra l\'obiettivo. Controlla che il peso non salga troppo in fretta.');}
  else parts.push('Le calorie sono in linea con l\'obiettivo.');
  if(a.p<0.9*a.pt){tone='warn';parts.push('Le proteine sono sotto: aggiungi una fonte proteica a ogni pasto.');}
  else parts.push('Le proteine sono a posto.');
  if(wd&&wd.span>=4){
    const pw=wd.delta/wd.first*100*7/wd.span;
    if(pw<0){tone='warn';parts.push('Il peso è sceso: se vuoi crescere serve più cibo.');}
    else if(pw>0.5){tone='warn';parts.push('Il peso sale in fretta: una parte potrebbe essere grasso.');}
    else if(pw>=0.1) parts.push('Il peso cresce con un buon ritmo.');
    else parts.push('Il peso è quasi fermo.');
  }
  return {tone,text:parts.join(' ')};
}
function renderWeek(){
  const days=weekData(S.weekOff), logged=days.filter(x=>x.logged), n=logged.length;
  const avg=(arr,f)=>arr.length?arr.reduce((s,x)=>s+f(x),0)/arr.length:0;
  const sd=(d,o)=>parse(d).toLocaleDateString('it-IT',o);
  const rng=sd(days[0].date,{day:'numeric'})+' – '+sd(days[6].date,{day:'numeric',month:'short'});
  const a={k:avg(logged,x=>x.t.kcal),kt:avg(logged,x=>x.c.target),p:avg(logged,x=>x.t.p),pt:avg(logged,x=>x.c.prot)};
  const wl=days.filter(x=>x.wLogged), aw=avg(wl,x=>x.wTot), awg=avg(wl,x=>x.wGoal);
  const tn=(cond)=>cond?'warn':'ok';
  const stat=(label,val,unit,sub)=>'<div class="stat"><div class="eyebrow">'+label+'</div><div class="big">'+val+'<small>'+unit+'</small></div><div class="sub2">'+sub+'</div></div>';
  const diffTxt=(d,u,tol,tgt)=>{
    if(!n&&!u) return '';
    const warn=Math.abs(d)>tol*tgt;
    return '<b data-t="'+tn(warn)+'">'+(Math.abs(d)<tol*tgt/2?'in linea':fmtDiff(d))+'</b>';
  };
  const fmtDiff=d=>(d<0?'−':'+')+fmt(Math.abs(d));
  const kSub=n?diffTxt(a.k-a.kt,true,0.1,a.kt)+' · obiettivo '+fmt(a.kt):'—';
  const pSub=n?(a.p<0.9*a.pt?'<b data-t="warn">sotto</b>':'<b data-t="ok">a posto</b>')+' · obiettivo '+fmt(a.pt)+' g':'—';
  const wSub=wl.length?(aw<0.9*awg?'<b data-t="warn">sotto</b>':'<b data-t="ok">a posto</b>')+' · consigliata '+nfL.format(awg/1000)+' L':'—';
  const tiles='<div class="grid2">'+
    stat('Calorie al giorno',n?fmt(a.k):'—','kcal',kSub)+
    stat('Proteine al giorno',n?fmt(a.p):'—','g',pSub)+
    stat('Acqua al giorno',wl.length?nfL.format(aw/1000):'—','L',wSub)+
    stat('Giorni registrati',n,'su 7','con almeno un pasto')+'</div>';
  const wts=S.weights.filter(w=>w.d>=days[0].date&&w.d<=days[6].date);
  let wd=null, wtxt;
  if(wts.length>=2){
    const f=wts[0], l=wts[wts.length-1], delta=r1(l.kg-f.kg);
    wd={delta:l.kg-f.kg,first:f.kg,span:daysBetween(f.d,l.d)};
    const w1=v=>v.toFixed(1).replace('.',',');
    wtxt='Peso nella settimana: <b>'+w1(f.kg)+' → '+w1(l.kg)+' kg</b> ('+(delta>=0?'+':'−')+w1(Math.abs(delta))+' kg)';
  }else if(wts.length===1) wtxt='Una sola pesata questa settimana: <b>'+f1(wts[0].kg)+' kg</b>. Ne servono due per vedere come cambia.';
  else wtxt='Nessuna pesata in questa settimana.';
  const ad=weekAdvice(n,a,wd);
  const rows=days.map(x=>{
    const dt=parse(x.date), lab=x.date===TODAY?'Oggi':cap(dt.toLocaleDateString('it-IT',{weekday:'short'}))+' '+dt.getDate();
    const wtxt2=x.wLogged?' · Acqua '+nfL.format(x.wTot/1000)+' L':'';
    if(!x.logged) return '<li class="wkrow off"><span class="wkd">'+lab+'</span><span>Niente registrato</span>'+(wtxt2?'<span class="sub2">'+wtxt2.slice(3)+'</span>':'')+'</li>';
    const pct=x.c.target?x.t.kcal/x.c.target*100:0;
    const col=pct>=90&&pct<=110?'--ok':'--warn';
    return '<li class="wkrow"><span class="wkd">'+lab+'</span><div class="bar" style="--bar:var('+col+')"><i style="width:'+Math.min(100,pct)+'%"></i></div><b>'+fmt(x.t.kcal)+'</b>'+
      '<span class="sub2">Obiettivo '+fmt(x.c.target)+' kcal · Proteine '+fmt(x.t.p)+' / '+fmt(x.c.prot)+' g'+wtxt2+'</span></li>';
  }).join('');
  $('#weekCard').innerHTML=
    '<div class="wkhead"><button class="icon-btn" type="button" data-wk="-1" aria-label="Settimana precedente">&#8249;</button>'+
    '<div class="rng"><div class="eyebrow" style="margin:0">'+(S.weekOff===0?'Ultimi 7 giorni':S.weekOff===-1?'Settimana scorsa':pl(-S.weekOff,'settimana fa','settimane fa'))+'</div>'+rng+'</div>'+
    '<button class="icon-btn" type="button" data-wk="1" aria-label="Settimana successiva"'+(S.weekOff>=0?' disabled':'')+'>&#8250;</button></div>'+
    tiles+'<div class="tone" data-tone="'+(ad.tone==='warn'?'warn':ad.tone==='ok'?'ok':'info')+'">'+esc(ad.text)+'</div>'+
    '<p class="hint" style="margin-top:12px">'+wtxt+'</p>'+
    '<div class="eyebrow sec">Giorno per giorno</div><ul class="wk">'+rows+'</ul>'+
    '<p class="hint">Le medie contano solo i giorni con almeno un pasto registrato. Barra verde: calorie vicine all\'obiettivo del giorno.</p>';
}

/* ---------- navigation ---------- */
function showSub(tab,name){
  S.sub[tab]=name;
  $$('#tab-'+tab+' [data-sec]').forEach(el=>{el.hidden=el.dataset.sec!==name;});
  $$('#tab-'+tab+' .subnav [data-sub]').forEach(b=>{
    const on=b.dataset.sub===name;
    b.setAttribute('aria-pressed',String(on));
    if(on&&b.scrollIntoView){try{b.scrollIntoView({inline:'center',block:'nearest'});}catch(e){}}
  });
  if(tab==='oggi') $('#miniNumbers').hidden=(name==='riepilogo');
  if(tab==='peso'&&name==='settimana') renderWeek();
  window.scrollTo(0,0);
}
function showTab(name){
  ['oggi','obiettivi','peso'].forEach(t=>{$('#tab-'+t).hidden=(t!==name);});
  $$('nav.tabs [data-tab]').forEach(b=>{if(b.dataset.tab===name) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');});
  if(name==='obiettivi'){syncProfileForm();renderWaterTable();}
  if(name==='peso'){renderWeight();renderWeek();}
  showSub(name,S.sub[name]);
}
function renderAll(){
  renderHeader(); renderDayCard(); renderNumbers(); renderMeals(); renderMealChips();
  renderResults(); renderDishes(); renderWaterForm(); syncProfileForm(); renderWaterTable(); renderWeight(); renderWeek();
}
function onProfileChanged(){
  S.profile.touched=true;
  queueSave('profile');
  renderHeader(); renderDayCard(); renderNumbers(); renderWaterTable();
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');
  if(!t) return;
  if(t.dataset.tab){showTab(t.dataset.tab);return;}
  if(t.dataset.goto){showTab(t.dataset.goto);showSub(t.dataset.goto,'dati');return;}
  if(t.dataset.sub){const sec=t.closest('section');if(sec) showSub(sec.id.replace('tab-',''),t.dataset.sub);return;}
  if(t.dataset.subGo){showSub('oggi',t.dataset.subGo);return;}
  if(t.dataset.nav){S.date=addDays(S.date,+t.dataset.nav);S.planNote=null;S.dishFor=null;renderHeader();renderDayCard();renderNumbers();renderMeals();return;}
  if(t.dataset.act){setDayAct(S.date,t.dataset.act);renderDayCard();renderNumbers();renderWaterTable();syncProfileForm();return;}
  if(t.dataset.wk){S.weekOff=Math.min(0,S.weekOff+(+t.dataset.wk));renderWeek();return;}
  if(t.dataset.planUndo!==undefined){planOnlyToday();return;}
  if(t.dataset.wunit){S.wUnit=t.dataset.wunit;$('#wq').value=WUNITS[S.wUnit].def;renderWaterForm();return;}
  if(t.dataset.wquick){$('#wq').value=t.dataset.wquick;updateWaterPreview();return;}
  if(t.dataset.wtdel){const d=editDay(S.date);d.water=(d.water||[]).filter(x=>x.id!==t.dataset.wtdel);queueSave('d-'+S.date);renderNumbers();return;}
  if(t.dataset.dish){openDish(t.dataset.dish);return;}
  if(t.dataset.ditem!==undefined){removeDishItem(+t.dataset.ditem);return;}
  if(t.dataset.dsave){S.dishFor=t.dataset.dsave;renderMeals();return;}
  if(t.dataset.dsaveCancel!==undefined){S.dishFor=null;renderMeals();return;}
  if(t.dataset.dsaveOk){doSaveDish(t.dataset.dsaveOk);return;}
  if(t.dataset.meal){S.meal=t.dataset.meal;renderMealChips();return;}
  if(t.dataset.lf!==undefined){S.listFilter=t.dataset.lf;renderResults();return;}
  if(t.dataset.xdel!==undefined){t.closest('.xrow').remove();return;}
  if(t.dataset.food!==undefined){const f=foodById(t.dataset.food);if(f) openPick(f);return;}
  if(t.dataset.fdel){
    S.foods=S.foods.filter(x=>x.id!==t.dataset.fdel);
    if(pick&&pick.id===t.dataset.fdel) closePick();
    queueSave('foods');renderResults();return;
  }
  if(t.dataset.del){const d=editDay(S.date);d.entries=d.entries.filter(x=>x.id!==t.dataset.del);queueSave('d-'+S.date);renderNumbers();renderMeals();return;}
  if(t.dataset.sex){S.profile.sex=t.dataset.sex;syncProfileForm();onProfileChanged();return;}
  if(t.dataset.wdel){
    S.weights=S.weights.filter(x=>x.d!==t.dataset.wdel);
    queueSave('weights');renderWeight();return;
  }
});
$('#dayCard').addEventListener('input',e=>{
  const el=e.target, f=el.dataset.f;
  if(!f) return;
  if(el.tagName==='SELECT'){editDay(S.date)[f]=el.value;}
  else{
    const v=parseFloat(el.value);
    if(!(v>=5&&v<=300)){el.setAttribute('aria-invalid','true');return;}
    el.setAttribute('aria-invalid','false');
    editDay(S.date)[f]=v;
  }
  queueSave('d-'+S.date);
  renderNumbers();
});
$('#profileForm').addEventListener('input',handleProfileInput);
$('#trainDefaults').addEventListener('input',handleProfileInput);
$('#waterSet').addEventListener('input',handleProfileInput);
function handleProfileInput(e){
  const el=e.target, k=el.dataset.p;
  if(!k) return;
  if(el.dataset.type==='str'){S.profile[k]=el.value;onProfileChanged();return;}
  const v=parseFloat(String(el.value).replace(',','.'));
  let ok=isFinite(v);
  if(ok&&el.tagName==='INPUT') ok=v>=+el.min&&v<=+el.max;
  el.setAttribute('aria-invalid',ok?'false':'true');
  if(!ok) return;
  S.profile[k]=v;
  if(k==='glassMl'||k==='bottleMl'){queueSave('profile');renderWaterTable();renderWaterForm();return;}
  onProfileChanged();
}
$('#planForm').addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.plan===undefined) return;
  setPlanAct(+el.dataset.plan,el.value);
  renderHeader();renderDayCard();renderNumbers();renderWaterTable();
});
$('#foodSearch').addEventListener('input',renderResults);
$('#pickG').addEventListener('input',updatePreview);
$('#pickCancel').addEventListener('click',closePick);
$('#pickAdd').addEventListener('click',()=>{
  const g=parseFloat($('#pickG').value);
  if(!pick||!(g>0)){$('#pickG').setAttribute('aria-invalid','true');return;}
  $('#pickG').setAttribute('aria-invalid','false');
  const k=g/100;
  addEntry({meal:S.meal,name:pick.n,g:g,un:pick.un||'g',kcal:r1(pick.k*k),p:r1(pick.p*k),c:r1(pick.c*k),f:r1(pick.f*k),x:scaleExtras(pick,k)});
  pick.u=Date.now();
  queueSave('foods');
  closePick();
  $('#foodSearch').value='';
  renderResults();
});
function addExtraRow(n,v,u){
  const row=document.createElement('div');
  row.className='xrow';
  row.innerHTML='<input type="text" list="dlNutrients" data-xn maxlength="40" placeholder="Es. Vitamina C" aria-label="Nome del valore">'+
    '<input type="number" inputmode="decimal" min="0" step="any" data-xv placeholder="0" aria-label="Quantità ogni 100 g">'+
    '<select data-xu aria-label="Unità">'+['g','mg','µg'].map(x=>'<option>'+x+'</option>').join('')+'</select>'+
    '<button type="button" class="x" data-xdel aria-label="Togli riga">&times;</button>';
  row.querySelector('[data-xn]').value=n||'';
  row.querySelector('[data-xv]').value=(v===undefined||v===null)?'':v;
  row.querySelector('[data-xu]').value=u||'mg';
  $('#cExtra').appendChild(row);
  return row;
}
function unitLabels(un){
  $('#cGLabel').textContent='Porzione abituale ('+un+')';
  $('#cPer').textContent="Valori ogni 100 "+un+", dall'etichetta";
}
$('#cUn').addEventListener('change',()=>unitLabels($('#cUn').value));
function resetForm(){
  S.editId=null;
  $('#cUn').value='g'; unitLabels('g');
  ['#cName','#cList','#cG','#cK','#cP','#cC','#cF','#cFib','#cSug','#cSat','#cSalt'].forEach(id=>{$(id).value='';});
  $('#cExtra').innerHTML='';
  $('#newFoodTitle').textContent='Nuovo alimento';
  $('#cAdd').textContent='Salva nei miei alimenti';
  $('#cCancelEdit').hidden=true;
}
function startEdit(food){
  resetForm();
  S.editId=food.id;
  $('#newFood').open=true;
  $('#newFoodTitle').textContent='Modifica alimento';
  $('#cAdd').textContent='Salva modifiche';
  $('#cCancelEdit').hidden=false;
  $('#cUn').value=food.un||'g'; unitLabels(food.un||'g');
  $('#cName').value=food.n; $('#cList').value=food.list||''; $('#cG').value=food.g||'';
  $('#cK').value=food.k; $('#cP').value=food.p; $('#cC').value=food.c; $('#cF').value=food.f;
  (food.x||[]).forEach(e=>{
    const fx=FIXED_X.find(a=>norm(a[0])===norm(e.n)&&e.u==='g');
    if(fx) $(fx[1]).value=e.v; else addExtraRow(e.n,e.v,e.u);
  });
  $('#newFood').scrollIntoView({block:'start'});
}
function readExtras(){
  const map=new Map();
  const add=(n,v,u)=>{n=String(n||'').trim();if(n&&isFinite(v)&&v>0) map.set(norm(n)+'|'+u,{n:n,v:r3(v),u:u});};
  FIXED_X.forEach(a=>add(a[0],parseNum($(a[1]).value),'g'));
  $$('#cExtra .xrow').forEach(r=>add(r.querySelector('[data-xn]').value,parseNum(r.querySelector('[data-xv]').value),r.querySelector('[data-xu]').value));
  return Array.from(map.values());
}
$('#cAddRow').addEventListener('click',()=>{const r=addExtraRow('','','mg');r.querySelector('[data-xn]').focus();});
$('#cCancelEdit').addEventListener('click',resetForm);
$('#pickEdit').addEventListener('click',()=>{if(pick){const f=pick;closePick();startEdit(f);}});
$('#cExtra').addEventListener('change',e=>{
  const el=e.target;
  if(el.matches('[data-xn]')){const u=DEFAULT_U[norm(el.value.trim())];if(u) el.closest('.xrow').querySelector('[data-xu]').value=u;}
});
$('#cAdd').addEventListener('click',()=>{
  const num=id=>{const v=parseNum($(id).value);return v>=0?v:0;};
  const name=$('#cName').value.trim();
  const p=num('#cP'),c=num('#cC'),f=num('#cF');
  let k=num('#cK');
  const kGiven=k>0;
  if(!name){flash('#addMsg','Scrivi il nome dell\'alimento.');return;}
  if(!kGiven) k=4*p+4*c+9*f;
  if(!(k>0)){flash('#addMsg','Inserisci almeno le calorie o i macro.');return;}
  const key=norm(name);
  let food=S.editId?foodById(S.editId):S.foods.find(x=>norm(x.n)===key);
  const clash=S.foods.find(x=>norm(x.n)===key&&(!food||x.id!==food.id));
  if(clash){flash('#addMsg','Esiste già un alimento con questo nome.');return;}
  if(!food){food={id:uid()};S.foods.push(food);}
  const est=4*p+4*c+9*f;
  const warn=kGiven&&Math.abs(k-est)>Math.max(30,0.2*k)?' Controlla i valori: le calorie non tornano con proteine, carboidrati e grassi (sarebbero circa '+fmt(est)+').':'';
  Object.assign(food,{n:name,un:$('#cUn').value==='ml'?'ml':'g',list:canonList($('#cList').value),k:r1(k),p:r1(p),c:r1(c),f:r1(f),g:num('#cG')||100,u:Date.now(),x:readExtras()});
  queueSave('foods');
  resetForm();
  S.listFilter='';
  $('#foodSearch').value='';
  renderResults();
  openPick(food);
  flash('#addMsg','Salvato nei tuoi alimenti.'+warn,warn?9000:2500);
});
$('#weightForm').addEventListener('submit',e=>{
  e.preventDefault();
  const kg=parseFloat($('#wKg').value);
  const d=$('#wDate').value||TODAY;
  if(!(kg>=30&&kg<=250)){flash('#wMsg','Inserisci un peso tra 30 e 250 kg.');return;}
  const entry={d:d,kg:r1(kg)};
  S.weights=S.weights.filter(x=>x.d!==d);
  S.weights.push(entry);
  S.weights.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  queueSave('weights');
  const latest=S.weights[S.weights.length-1];
  if(latest.d===d){S.profile.weight=entry.kg;S.profile.touched=true;queueSave('profile');renderHeader();renderDayCard();renderNumbers();renderWaterTable();}
  renderWeight();
  $('#wKg').value='';
  showSub('peso','andamento');
});

/* ---------- acqua: registro di oggi ---------- */
const WUNITS={
  glass:{name:'Bicchiere',label:'Quanti bicchieri',step:0.5,def:1},
  bottle:{name:'Borraccia',label:'Quante borracce',step:0.25,def:1},
  eye:{name:"All'occhio",label:'Quanti ml, circa',step:10,def:200}
};
const WQUICK=[['Un sorso',50],['Qualche sorso',150],['Una bella bevuta',300],['Tanta',500]];
function wMl(kind){return kind==='glass'?S.profile.glassMl:kind==='bottle'?S.profile.bottleMl:1;}
function renderWaterForm(){
  const u=WUNITS[S.wUnit];
  $('#waterUnits').innerHTML=Object.keys(WUNITS).map(k=>'<button type="button" class="chip" data-wunit="'+k+'" aria-pressed="'+(S.wUnit===k)+'">'+WUNITS[k].name+'</button>').join('');
  $('#wqLabel').textContent=u.label;
  $('#wq').step=u.step;
  const qk=$('#wqQuick');
  qk.hidden=S.wUnit!=='eye';
  qk.innerHTML=WQUICK.map(q=>'<button type="button" class="chip" data-wquick="'+q[1]+'">'+q[0]+' · '+q[1]+' ml</button>').join('');
  updateWaterPreview();
}
function updateWaterPreview(){
  const q=parseNum($('#wq').value), el=$('#wqPreview');
  el.innerHTML=q>0?'<b>'+fmt(q*wMl(S.wUnit))+'</b> ml':'';
}
function renderWater(){
  const d=getDay(S.date), goal=waterGoal(S.profile,d), tot=waterTotal(d), left=goal-tot;
  const actLabel=ACTS.find(a=>a[0]===d.act)[1];
  const pct=goal?Math.min(100,tot/goal*100):0;
  $('#waterHero').innerHTML=
    '<div class="hero-label">Acqua di oggi <span class="pill">'+actLabel+'</span></div>'+
    '<div class="hero-num">'+nfL.format(tot/1000)+'<small>L su '+nfL.format(goal/1000)+'</small></div>'+
    '<div class="kcalrow"><span>consigliata <b>'+fmtL(goal)+'</b></span><span>'+(left>0?'ne mancano <b>'+fmtL(left)+'</b>':'obiettivo raggiunto')+'</span></div>'+
    '<div class="bar lane" style="--bar:var('+(left>0?'--accent':'--ok')+')"><i style="width:'+pct+'%"></i></div>';
  const list=(d.water||[]);
  $('#waterList').innerHTML=list.length?'<div class="eyebrow sec">Oggi</div><ul class="list">'+list.slice().reverse().map(w=>{
    const name=w.kind==='glass'?'Bicchiere × '+nfk.format(w.qty):w.kind==='bottle'?'Borraccia × '+nfk.format(w.qty):"All'occhio";
    return '<li class="row"><div class="row-main"><span class="row-name">'+name+'</span></div><span class="row-kcal">'+fmt(w.ml)+'<small> ml</small></span>'+
      '<button type="button" class="x" data-wtdel="'+esc(w.id)+'" aria-label="Togli questa bevuta">&times;</button></li>';
  }).join('')+'</ul>':'';
  updateWaterPreview();
}
function addWater(){
  const q=parseNum($('#wq').value), ml=Math.round(q*wMl(S.wUnit));
  if(!(q>0)||!(ml>0)||ml>5000){$('#wq').setAttribute('aria-invalid','true');return;}
  $('#wq').setAttribute('aria-invalid','false');
  const day=editDay(S.date);
  day.water=day.water||[];
  day.water.push({id:uid(),ml:ml,kind:S.wUnit,qty:q});
  queueSave('d-'+S.date);
  $('#wq').value=WUNITS[S.wUnit].def;
  renderNumbers();
  flash('#waterMsg','Aggiunti '+fmt(ml)+' ml.');
}
$('#wAdd').addEventListener('click',addWater);
$('#wq').addEventListener('input',updateWaterPreview);
$('#wq').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addWater();}});

/* ---------- piano settimanale collegato ai giorni ---------- */
/* Cambiare la giornata di oggi (o di un giorno futuro) aggiorna il piano di quel giorno della settimana
   e i giorni futuri gia' salvati con lo stesso giorno. I giorni passati non si toccano. */
function setDayAct(date,act){
  editDay(date).act=act;
  queueSave('d-'+date);
  S.planNote=null;
  if(date<TODAY) return;
  const idx=wd(date), prevPlan=S.profile.plan[idx];
  if(prevPlan===act) return;
  const prevDays={};
  S.profile.plan[idx]=act;
  S.profile.touched=true;
  Object.keys(S.days).forEach(k=>{
    if(k>=TODAY&&k!==date&&wd(k)===idx&&S.days[k].act!==act){prevDays[k]=S.days[k].act;S.days[k].act=act;queueSave('d-'+k);}
  });
  queueSave('profile');
  S.planNote={date,idx,prevPlan,prevDays};
}
function setPlanAct(idx,act){
  S.profile.plan[idx]=act;
  S.profile.touched=true;
  queueSave('profile');
  Object.keys(S.days).forEach(k=>{
    if(k>=TODAY&&wd(k)===idx&&S.days[k].act!==act){S.days[k].act=act;queueSave('d-'+k);}
  });
  S.planNote=null;
}
function planOnlyToday(){
  const n=S.planNote; if(!n) return;
  S.profile.plan[n.idx]=n.prevPlan;
  queueSave('profile');
  Object.keys(n.prevDays).forEach(k=>{if(S.days[k]){S.days[k].act=n.prevDays[k];queueSave('d-'+k);}});
  S.planNote=null;
  renderDayCard(); renderWaterTable(); syncProfileForm();
}

/* ---------- piatti salvati ---------- */
function dishById(id){return S.dishes.find(d=>d.id===id)||null;}
function renderDishes(){
  const el=$('#dishList');
  if(S.dishSel&&!dishById(S.dishSel)) closeDish();
  if(!S.dishes.length){
    el.innerHTML='<p class="muted">Nessun piatto salvato. In Pasti premi "Salva come piatto" sotto un pasto che mangi spesso: poi lo aggiungi da qui con un tocco.</p>';
    return;
  }
  const list=S.dishes.slice().sort((a,b)=>(b.u||0)-(a.u||0)||a.n.localeCompare(b.n,'it'));
  el.innerHTML='<ul class="list">'+list.map(d=>{
    const t=dishTotals(d);
    return '<li class="resrow"><button type="button" class="res" data-dish="'+esc(d.id)+'"><span class="res-name">'+esc(d.n)+'</span><span class="res-sub">'+pl(d.items.length,'alimento','alimenti')+' · P '+f1(t.p)+' · C '+f1(t.c)+' · G '+f1(t.f)+'</span><span class="res-kcal">'+fmt(t.kcal)+'<small> kcal</small></span></button></li>';
  }).join('')+'</ul>';
}
function openDish(id){
  const d=dishById(id); if(!d) return;
  S.dishSel=id; S.dishConfirm=false;
  $('#dishPick').hidden=false;
  $('#dishName').value=d.n;
  $('#dishMult').value='1';
  $('#dishDel').textContent='Elimina piatto';
  renderDishItems(); updateDishPreview();
  $('#dishPick').scrollIntoView({block:'nearest'});
}
function closeDish(){S.dishSel=null;S.dishConfirm=false;$('#dishPick').hidden=true;}
function renderDishItems(){
  const d=dishById(S.dishSel); if(!d) return;
  $('#dishItems').innerHTML=d.items.map((i,n)=>'<li class="row"><div class="row-main"><span class="row-name">'+esc(i.name)+'</span><span class="row-sub">'+(i.g?fmt(i.g)+' '+i.un+' · ':'')+'P '+f1(i.p)+' · C '+f1(i.c)+' · G '+f1(i.f)+'</span></div>'+
    '<span class="row-kcal">'+fmt(i.kcal)+'</span><button type="button" class="x" data-ditem="'+n+'" aria-label="Togli '+esc(i.name)+' dal piatto">&times;</button></li>').join('');
}
function updateDishPreview(){
  const d=dishById(S.dishSel), m=parseNum($('#dishMult').value), el=$('#dishPreview');
  if(!d||!(m>0)){el.textContent='';return;}
  const t=dishTotals(d,m);
  el.innerHTML='<b>'+fmt(t.kcal)+'</b> kcal<br>P '+f1(t.p)+' · C '+f1(t.c)+' · G '+f1(t.f);
}
function removeDishItem(n){
  const d=dishById(S.dishSel); if(!d) return;
  d.items.splice(n,1);
  if(!d.items.length){
    S.dishes=S.dishes.filter(x=>x.id!==d.id);
    closeDish(); queueSave('dishes'); renderDishes();
    flash('#dishMsg','Piatto vuoto: eliminato.');
    return;
  }
  queueSave('dishes'); renderDishItems(); updateDishPreview(); renderDishes();
}
function doSaveDish(meal){
  const inp=$('[data-dname]');
  const name=(inp?inp.value:'').trim();
  const es=getDay(S.date).entries.filter(e=>e.meal===meal);
  if(!name){flash('#mealMsg','Scrivi il nome del piatto.');if(inp) inp.focus();return;}
  if(!es.length) return;
  const items=es.map(normItem);
  const ex=S.dishes.find(d=>norm(d.n)===norm(name));
  if(ex){ex.n=name;ex.items=items;ex.u=Date.now();}
  else S.dishes.push({id:uid(),n:name,u:Date.now(),items});
  S.dishFor=null;
  queueSave('dishes');
  renderMeals(); renderDishes();
  flash('#mealMsg',(ex?'Piatto aggiornato: ':'Piatto salvato: ')+name+'. Lo trovi in Piatti.',3500);
}
$('#dishMult').addEventListener('input',updateDishPreview);
$('#dishClose').addEventListener('click',closeDish);
$('#dishName').addEventListener('change',()=>{
  const d=dishById(S.dishSel); if(!d) return;
  const name=$('#dishName').value.trim();
  const clash=S.dishes.find(x=>x.id!==d.id&&norm(x.n)===norm(name));
  if(!name||clash){$('#dishName').value=d.n;flash('#dishMsg',clash?'Esiste già un piatto con questo nome.':'Il nome non può essere vuoto.');return;}
  d.n=name; queueSave('dishes'); renderDishes();
});
$('#dishAdd').addEventListener('click',()=>{
  const d=dishById(S.dishSel), m=parseNum($('#dishMult').value);
  if(!d||!(m>0)){$('#dishMult').setAttribute('aria-invalid','true');return;}
  $('#dishMult').setAttribute('aria-invalid','false');
  const day=editDay(S.date);
  d.items.forEach(i=>day.entries.push({id:uid(),meal:S.meal,name:i.name,g:r1(i.g*m),un:i.un,kcal:r1(i.kcal*m),p:r1(i.p*m),c:r1(i.c*m),f:r1(i.f*m),x:scaleX(i.x,m)}));
  d.u=Date.now();
  queueSave('d-'+S.date); queueSave('dishes');
  renderNumbers(); renderMeals(); renderDishes();
  flash('#dishMsg',d.n+' aggiunto a '+MEALS.find(x=>x[0]===S.meal)[1]+'.');
});
let dishConfirmTimer=null;
$('#dishDel').addEventListener('click',()=>{
  const d=dishById(S.dishSel); if(!d) return;
  const b=$('#dishDel');
  if(!S.dishConfirm){
    S.dishConfirm=true; b.textContent='Conferma: elimina il piatto';
    clearTimeout(dishConfirmTimer);
    dishConfirmTimer=setTimeout(()=>{S.dishConfirm=false;b.textContent='Elimina piatto';},4000);
    return;
  }
  S.dishes=S.dishes.filter(x=>x.id!==d.id);
  closeDish(); queueSave('dishes'); renderDishes();
  flash('#dishMsg','Piatto eliminato.');
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-dname]')){e.preventDefault();if(S.dishFor) doSaveDish(S.dishFor);}
});

/* ---------- backup: esporta / importa ---------- */
const BK_LAST='yourfood.lastbackup', BK_PREV='yourfood.prev';
let bkPending=null;
function bkData(){
  return {app:'yourfood',version:2,exported:new Date().toISOString(),profile:S.profile,days:S.days,weights:S.weights,foods:S.foods,dishes:S.dishes};
}
function bkText(){return JSON.stringify(bkData(),null,1);}
function bkStamp(){try{localStorage.setItem(BK_LAST,new Date().toISOString());}catch(e){} bkShowLast();}
function bkShowLast(){
  let v=null;try{v=localStorage.getItem(BK_LAST);}catch(e){}
  const el=$('#bkLast'); if(!el) return;
  el.textContent=v?'Ultimo backup su questo dispositivo: '+new Date(v).toLocaleString('it-IT',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'Non hai ancora fatto nessun backup su questo dispositivo.';
}
function bkMsg(text,bad){
  const el=$('#bkMsg'); el.textContent=text; el.style.color=bad?'var(--bad)':'';
  clearTimeout(msgTimer); msgTimer=setTimeout(()=>{el.textContent='';},4000);
}
function bkDownload(){
  try{
    const blob=new Blob([bkText()],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='yourfood-backup-'+TODAY+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    bkStamp(); bkMsg('File scaricato. Se non compare, usa "Copia testo".');
  }catch(e){bkMsg('Download non riuscito. Usa "Copia testo".',true);}
}
async function bkCopy(){
  const text=bkText();
  try{
    await navigator.clipboard.writeText(text);
    bkStamp(); bkMsg('Copiato. Incollalo in un posto sicuro (email, note, messaggi a te stesso).');
  }catch(e){
    const ta=$('#bkText'); ta.value=text; ta.focus(); ta.select();
    bkStamp(); bkMsg('Testo messo nel riquadro qui sotto: selezionalo e copialo a mano.');
  }
}
/* Controlla il testo e lo trasforma in dati puliti; null se non valido. */
function bkParse(text){
  let o; try{o=JSON.parse(text);}catch(e){return null;}
  if(!o||typeof o!=='object') return null;
  const days={};
  if(o.days&&typeof o.days==='object'){
    Object.keys(o.days).forEach(k=>{
      const d=o.days[k];
      if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&d&&typeof d==='object'&&Array.isArray(d.entries)) days[k]=d;
    });
  }
  const weights=(Array.isArray(o.weights)?o.weights:[]).filter(w=>w&&/^\d{4}-\d{2}-\d{2}$/.test(w.d)&&isFinite(+w.kg)&&+w.kg>0).map(w=>({d:w.d,kg:+w.kg}));
  const foods=normFoods(o.foods);
  const dishes=normDishes(o.dishes);
  const profile=o.profile&&typeof o.profile==='object'?o.profile:null;
  if(!profile&&!Object.keys(days).length&&!weights.length&&!foods.length&&!dishes.length) return null;
  return {profile,days,weights,foods,dishes};
}
function bkCheck(){
  const text=$('#bkText').value.trim();
  if(!text){bkMsg('Incolla prima il backup o scegli un file.',true);return;}
  const d=bkParse(text);
  if(!d){bkPending=null;$('#bkPreview').innerHTML='';bkMsg('Questo testo non è un backup di YourFood.',true);return;}
  bkPending=d;
  $('#bkPreview').innerHTML='<div class="note"><span>Nel backup: <b>'+pl(Object.keys(d.days).length,'giorno','giorni')+'</b>, <b>'+pl(d.foods.length,'alimento','alimenti')+'</b>, <b>'+pl(d.dishes.length,'piatto','piatti')+'</b>, <b>'+pl(d.weights.length,'peso','pesi')+'</b>'+(d.profile?', profilo':'')+'.</span></div>'+
    '<div class="form-actions"><button class="btn" type="button" id="bkMerge">Unisci ai dati attuali</button><button class="btn alt" type="button" id="bkReplace">Sostituisci tutto</button><button class="link" type="button" id="bkCancel">Annulla</button></div>'+
    '<p class="hint">Unisci tiene quello che hai già e aggiunge o aggiorna ciò che c\'è nel backup. Sostituisci cancella i dati attuali.</p>';
}
function bkApply(mode){
  const d=bkPending; if(!d) return;
  try{localStorage.setItem(BK_PREV,JSON.stringify({profile:S.profile,days:S.days,weights:S.weights,foods:S.foods,dishes:S.dishes}));}catch(e){}
  if(mode==='replace'){
    S.days={}; S.weights=[]; S.foods=[]; S.dishes=[];
  }
  if(d.profile) S.profile=normProfile(Object.assign({},mode==='merge'?S.profile:{},d.profile));
  Object.keys(d.days).forEach(k=>{S.days[k]=d.days[k];});
  const wm={}; S.weights.forEach(w=>{wm[w.d]=w;}); d.weights.forEach(w=>{wm[w.d]=w;});
  S.weights=Object.keys(wm).sort().map(k=>wm[k]);
  const fm={}; S.foods.forEach(f=>{fm[f.id]=f;}); d.foods.forEach(f=>{fm[f.id]=f;});
  S.foods=Object.keys(fm).map(k=>fm[k]);
  const dm={}; S.dishes.forEach(x=>{dm[x.id]=x;}); d.dishes.forEach(x=>{dm[x.id]=x;});
  S.dishes=Object.keys(dm).map(k=>dm[k]);
  lsWrite();
  ['profile','weights','foods','dishes'].concat(Object.keys(S.days).map(k=>'d-'+k)).forEach(queueSave);
  bkPending=null; $('#bkPreview').innerHTML=''; $('#bkText').value='';
  renderAll();
  bkMsg(mode==='replace'?'Dati sostituiti dal backup.':'Backup unito ai dati attuali.');
}
document.addEventListener('click',e=>{
  const id=e.target.closest('button')&&e.target.closest('button').id;
  if(id==='bkFile') bkDownload();
  else if(id==='bkCopy') bkCopy();
  else if(id==='bkCheck') bkCheck();
  else if(id==='bkMerge') bkApply('merge');
  else if(id==='bkReplace') bkApply('replace');
  else if(id==='bkCancel'){bkPending=null;$('#bkPreview').innerHTML='';}
});
document.addEventListener('change',e=>{
  if(e.target.id!=='bkPick') return;
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{$('#bkText').value=String(r.result||'');e.target.value='';bkCheck();};
  r.onerror=()=>bkMsg('Non riesco a leggere il file.',true);
  r.readAsText(f);
});

/* ---------- boot ---------- */
async function boot(){
  const main=$('main');
  main.inert=true;
  buildStaticForms();
  $('#wDate').value=TODAY;
  let local=lsRead();
  try{
    if(window.claude&&typeof window.claude.use==='function'){
      const db=await window.claude.use('db');
      const user=await window.claude.use('user');
      const id=user?await user.id():null;
      if(db&&id) dbCol=db.collection('data/users/'+id);
    }
  }catch(e){dbCol=null;}
  let migrate=false;
  if(dbCol){
    try{
      const snap=await dbCol.limit(1000).get();
      let found=false;
      snap.docs.forEach(ds=>{
        if(!ds.exists) return;
        const id=ds.id, data=clone(ds.data());
        if(id==='profile'){S.profile=normProfile(data);found=true;}
        else if(id==='weights'){S.weights=Array.isArray(data.list)?data.list:[];found=true;}
        else if(id==='foods'){S.foods=normFoods(data.list);found=true;}
        else if(id==='dishes'){S.dishes=normDishes(data.list);found=true;}
        else if(id.indexOf('d-')===0){S.days[id.slice(2)]=data;found=true;}
      });
      if(!found&&local){adopt(local);migrate=true;}
    }catch(e){
      dbBroken=true;
      adopt(local);
    }
  }else adopt(local);
  S.weights.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  main.inert=false;
  $('#app').setAttribute('aria-busy','false');
  S.sub.peso=S.weights.length?'andamento':'registra';
  renderAll();
  Object.keys(S.sub).forEach(t=>showSub(t,S.sub[t]));
  window.scrollTo(0,0);
  bkShowLast();
  if(!S.foods.length) $('#newFood').open=true;
  setStatus('ready');
  if(migrate){['profile','weights','foods','dishes'].concat(Object.keys(S.days).map(k=>'d-'+k)).forEach(queueSave);}
}
boot();
})();
