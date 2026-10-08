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

/* ---------- constants ---------- */
const MEALS=[['colazione','Colazione'],['pranzo','Pranzo'],['spuntino','Spuntino'],['cena','Cena']];
const ACTS=[['R','Riposo'],['P','Piscina'],['A','Allenamento'],['PA','Piscina + pesi']];
const INT=[['low','Leggera'],['mid','Moderata'],['high','Intensa']];
const MET={swim:{low:5.0,mid:7.0,high:9.8},gym:{low:3.5,mid:5.0,high:6.0}};
const WEEK=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const DEFAULT_PROFILE={sex:'M',age:18,height:175,weight:70,neat:1.3,surplus:10,protein:1.8,
  plan:['R','R','R','R','R','R','R'],swimMin:60,swimInt:'mid',gymMin:60,gymInt:'mid',touched:false};

/* ---------- state ---------- */
const TODAY=iso(new Date());
function defaultMeal(){const h=new Date().getHours();return h<10?'colazione':h<15?'pranzo':h<18?'spuntino':'cena';}
const S={profile:clone(DEFAULT_PROFILE),days:{},weights:[],foods:[],date:TODAY,meal:defaultMeal()};

function normFoods(list){
  return (Array.isArray(list)?list:[]).filter(f=>f&&typeof f.n==='string'&&f.id).map(f=>({
    id:String(f.id),n:f.n,k:+f.k||0,p:+f.p||0,c:+f.c||0,f:+f.f||0,g:+f.g||100,u:+f.u||0}));
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

/* ---------- the science ---------- */
function calc(p,d,actOv){
  const act=actOv||d.act;
  const bmr=10*p.weight+6.25*p.height-5*p.age+(p.sex==='M'?5:-161);
  const daily=bmr*(p.neat-1);
  const net=(met,min)=>(met-1)*p.weight*(min/60);
  const swim=(act==='P'||act==='PA')?net(MET.swim[d.swimInt]||7,d.swimMin):0;
  const gym=(act==='A'||act==='PA')?net(MET.gym[d.gymInt]||5,d.gymMin):0;
  const maint=bmr+daily+swim+gym;
  const target=Math.round(maint*(1+p.surplus/100)/10)*10;
  const prot=Math.round(p.protein*p.weight);
  const fat=Math.round(Math.max(0.8*p.weight,target*0.25/9));
  const carb=Math.max(0,Math.round((target-prot*4-fat*9)/4));
  return {bmr,daily,swim,gym,maint,target,surplus:target-maint,prot,fat,carb};
}

/* ---------- storage ---------- */
const LS='yourfood.v1';
let dbCol=null, dbBroken=false;
function lsRead(){try{const raw=localStorage.getItem(LS);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function lsWrite(){
  const json=JSON.stringify({profile:S.profile,days:S.days,weights:S.weights,foods:S.foods});
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
    const has=d=>!!d&&((d.profile&&d.profile.touched)||(d.days&&Object.keys(d.days).length>0)||(d.weights&&d.weights.length>0)||(d.foods&&d.foods.length>0));
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
  $('#dayCard').innerHTML='<h2 class="h">Attività del giorno</h2><div class="chips" role="group" aria-label="Tipo di giornata">'+chips+'</div>'+
    (hasP?row('Piscina','swimMin','swimInt'):'')+(hasA?row('Allenamento con pesi','gymMin','gymInt'):'');
}
function renderNumbers(){
  const d=getDay(S.date), c=calc(S.profile,d), t=totals(d);
  const left=c.target-t.kcal;
  const over=t.kcal>c.target*1.05;
  const actLabel=ACTS.find(a=>a[0]===d.act)[1];
  const parts=[['Metabolismo basale',c.bmr],['Vita di tutti i giorni',c.daily]];
  if(c.swim>0) parts.push(['Piscina',c.swim]);
  if(c.gym>0) parts.push(['Allenamento con pesi',c.gym]);
  parts.push(['Surplus per crescere',c.surplus]);
  const bd=parts.map((p,i)=>'<li><span>'+p[0]+'</span><b>'+(i===0?'':'+')+fmt(p[1])+'</b></li>').join('');
  const pct=c.target?Math.min(100,t.kcal/c.target*100):0;
  const mrow=(label,eaten,tg,col)=>'<div class="macro"><span class="m-name"><i style="background:var(--'+col+')"></i>'+label+'</span>'+
    '<div class="bar" style="--bar:var(--'+col+')"><i style="width:'+Math.min(100,tg?eaten/tg*100:0)+'%"></i></div>'+
    '<span class="m-val"><b>'+fmt(eaten)+'</b> / '+fmt(tg)+' g</span></div>';
  $('#numbers').innerHTML=
    '<div class="hero-label">Obiettivo del giorno <span class="pill">'+actLabel+'</span></div>'+
    '<div class="hero-num">'+fmt(c.target)+'<small>kcal</small></div>'+
    '<ul class="breakdown">'+bd+'</ul>'+
    '<div class="kcalrow"><span><b>'+fmt(t.kcal)+'</b> kcal mangiate</span><span>'+(left>=0?'ne restano <b>'+fmt(left)+'</b>':'<b>'+fmt(-left)+'</b> oltre')+'</span></div>'+
    '<div class="bar lane" style="--bar:var('+(over?'--warn':'--accent')+')"><i style="width:'+pct+'%"></i></div>'+
    '<div class="macros">'+mrow('Proteine',t.p,c.prot,'p')+mrow('Carboidrati',t.c,c.carb,'c')+mrow('Grassi',t.f,c.fat,'f')+'</div>';
}
function renderMeals(){
  const d=getDay(S.date);
  $('#meals').innerHTML=MEALS.map(m=>{
    const es=d.entries.filter(e=>e.meal===m[0]);
    const sum=es.reduce((a,e)=>a+e.kcal,0);
    const rows=es.length?es.map(e=>'<li class="row"><div class="row-main"><span class="row-name">'+esc(e.name)+'</span><span class="row-sub">'+(e.g?fmt(e.g)+' g · ':'')+'P '+f1(e.p)+' · C '+f1(e.c)+' · G '+f1(e.f)+'</span></div>'+
      '<span class="row-kcal">'+fmt(e.kcal)+'</span><button type="button" class="x" data-del="'+esc(e.id)+'" aria-label="Elimina '+esc(e.name)+'">&times;</button></li>').join(''):'<li class="empty">Ancora niente</li>';
    return '<section class="card"><div class="meal-head"><h3 class="h3">'+m[1]+'</h3><span class="meal-kcal">'+fmt(sum)+' kcal</span></div><ul class="list">'+rows+'</ul></section>';
  }).join('');
}
function renderMealChips(){
  $('#mealChips').innerHTML=MEALS.map(m=>'<button type="button" class="chip" data-meal="'+m[0]+'" aria-pressed="'+(S.meal===m[0])+'">'+m[1]+'</button>').join('');
  const pm=$('#pickAdd'); const lab=MEALS.find(m=>m[0]===S.meal)[1];
  pm.textContent='Aggiungi a '+lab;
}

/* ---------- food search and add ---------- */
let pick=null;
function foodById(id){return S.foods.find(f=>f.id===id)||null;}
function searchFoods(q){
  q=norm(q.trim());
  const byUse=(a,b)=>(b.u||0)-(a.u||0)||a.n.localeCompare(b.n,'it');
  if(!q) return S.foods.slice().sort(byUse).slice(0,8);
  const words=q.split(/\s+/);
  return S.foods.filter(f=>{const n=norm(f.n);return words.every(w=>n.indexOf(w)>=0);}).sort(byUse).slice(0,10);
}
function renderResults(){
  const q=$('#foodSearch').value.trim(), list=searchFoods(q), el=$('#foodResults');
  if(!S.foods.length){
    el.innerHTML='<p class="muted">Il tuo elenco è vuoto. Aggiungi il primo alimento con "Nuovo alimento" qui sotto, la prossima volta lo trovi qui.</p>';
    return;
  }
  if(!list.length){
    el.innerHTML='<p class="muted">Nessun alimento con questo nome. Aggiungilo con "Nuovo alimento" qui sotto.</p>';
    return;
  }
  el.innerHTML=(q?'':'<div class="eyebrow">Usati di recente</div>')+'<ul class="list">'+list.map(f=>
    '<li class="resrow"><button type="button" class="res" data-food="'+esc(f.id)+'"><span class="res-name">'+esc(f.n)+'</span><span class="res-sub">P '+f1(f.p)+' · C '+f1(f.c)+' · G '+f1(f.f)+' ogni 100 g</span><span class="res-kcal">'+fmt(f.k)+'<small> kcal</small></span></button>'+
    '<button type="button" class="x" data-fdel="'+esc(f.id)+'" aria-label="Rimuovi '+esc(f.n)+' dall\'elenco">&times;</button></li>').join('')+'</ul>';
}
function updatePreview(){
  const g=parseFloat($('#pickG').value), el=$('#pickPreview');
  if(!pick||!(g>0)){el.textContent='';return;}
  const k=g/100;
  el.innerHTML='<b>'+fmt(pick.k*k)+'</b> kcal<br>P '+f1(pick.p*k)+' · C '+f1(pick.c*k)+' · G '+f1(pick.f*k);
}
function openPick(f){
  pick=f;
  $('#foodPick').hidden=false;
  $('#pickName').textContent=f.n;
  $('#pickNote').textContent=f.note||'';
  $('#pickG').value=f.g||100;
  updatePreview();
  const g=$('#pickG'); g.focus(); g.select();
}
function closePick(){pick=null;$('#foodPick').hidden=true;}
let msgTimer=null;
function flash(id,text){
  const el=$(id); el.textContent=text;
  clearTimeout(msgTimer); msgTimer=setTimeout(()=>{el.textContent='';},2500);
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
function renderTargets(){
  const p=S.profile;
  const base={swimMin:p.swimMin,swimInt:p.swimInt,gymMin:p.gymMin,gymInt:p.gymInt};
  const rows=ACTS.map(a=>{const c=calc(p,base,a[0]);
    return '<tr><th scope="row">'+a[1]+'</th><td class="k">'+fmt(c.target)+'</td><td>'+fmt(c.prot)+'</td><td>'+fmt(c.carb)+'</td><td>'+fmt(c.fat)+'</td></tr>';}).join('');
  $('#targetsTable').innerHTML='<table class="tbl"><thead><tr><th>Giornata</th><th>kcal</th><th>Prot. g</th><th>Carbo g</th><th>Grassi g</th></tr></thead><tbody>'+rows+'</tbody></table>';
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

/* ---------- navigation ---------- */
function showTab(name){
  ['oggi','obiettivi','peso'].forEach(t=>{$('#tab-'+t).hidden=(t!==name);});
  $$('nav.tabs [data-tab]').forEach(b=>{if(b.dataset.tab===name) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');});
  if(name==='obiettivi'){syncProfileForm();renderTargets();}
  if(name==='peso') renderWeight();
  window.scrollTo(0,0);
}
function renderAll(){
  renderHeader(); renderDayCard(); renderNumbers(); renderMeals(); renderMealChips();
  renderResults(); syncProfileForm(); renderTargets(); renderWeight();
}
function onProfileChanged(){
  S.profile.touched=true;
  queueSave('profile');
  renderHeader(); renderDayCard(); renderNumbers(); renderTargets();
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');
  if(!t) return;
  if(t.dataset.tab){showTab(t.dataset.tab);return;}
  if(t.dataset.goto){showTab(t.dataset.goto);return;}
  if(t.dataset.nav){S.date=addDays(S.date,+t.dataset.nav);renderHeader();renderDayCard();renderNumbers();renderMeals();return;}
  if(t.dataset.act){const d=editDay(S.date);d.act=t.dataset.act;queueSave('d-'+S.date);renderDayCard();renderNumbers();return;}
  if(t.dataset.meal){S.meal=t.dataset.meal;renderMealChips();return;}
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
  onProfileChanged();
}
$('#planForm').addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.plan===undefined) return;
  S.profile.plan[+el.dataset.plan]=el.value;
  onProfileChanged();
});
$('#foodSearch').addEventListener('input',renderResults);
$('#pickG').addEventListener('input',updatePreview);
$('#pickCancel').addEventListener('click',closePick);
$('#pickAdd').addEventListener('click',()=>{
  const g=parseFloat($('#pickG').value);
  if(!pick||!(g>0)){$('#pickG').setAttribute('aria-invalid','true');return;}
  $('#pickG').setAttribute('aria-invalid','false');
  const k=g/100;
  addEntry({meal:S.meal,name:pick.n,g:g,kcal:r1(pick.k*k),p:r1(pick.p*k),c:r1(pick.c*k),f:r1(pick.f*k)});
  pick.u=Date.now();
  queueSave('foods');
  closePick();
  $('#foodSearch').value='';
  renderResults();
});
$('#cAdd').addEventListener('click',()=>{
  const num=id=>{const v=parseFloat(String($(id).value).replace(',','.'));return isFinite(v)&&v>=0?v:0;};
  const name=$('#cName').value.trim();
  const p=num('#cP'),c=num('#cC'),f=num('#cF');
  let k=num('#cK');
  if(!name){flash('#addMsg','Scrivi il nome dell\'alimento.');return;}
  if(!k) k=4*p+4*c+9*f;
  if(!(k>0)){flash('#addMsg','Inserisci almeno le calorie o i macro.');return;}
  const g=num('#cG')||100;
  const key=norm(name);
  let food=S.foods.find(x=>norm(x.n)===key);
  if(!food){food={id:uid()};S.foods.push(food);}
  Object.assign(food,{n:name,k:r1(k),p:r1(p),c:r1(c),f:r1(f),g:g,u:Date.now()});
  queueSave('foods');
  ['#cName','#cK','#cP','#cC','#cF','#cG'].forEach(id=>{$(id).value='';});
  $('#foodSearch').value='';
  renderResults();
  openPick(food);
  flash('#addMsg','Salvato nei tuoi alimenti.');
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
  if(latest.d===d){S.profile.weight=entry.kg;S.profile.touched=true;queueSave('profile');renderHeader();renderDayCard();renderNumbers();renderTargets();}
  renderWeight();
  $('#wKg').value='';
  flash('#wMsg','Salvato.');
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
  renderAll();
  if(!S.foods.length) $('#newFood').open=true;
  setStatus('ready');
  if(migrate){['profile','weights','foods'].concat(Object.keys(S.days).map(k=>'d-'+k)).forEach(queueSave);}
}
boot();
})();
