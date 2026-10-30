const EC=[["Alimentação","--c1"],["Transporte","--c2"],["Moradia","--c3"],["Lazer","--c4"],["Saúde","--c5"],["Outros","--c6"]];
const IC=["Salário","Extras","Investimentos"];
const KEY="gastos-pro-v1";
const brl=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
let S={limits:{},items:[]};
try{const r=localStorage.getItem(KEY);if(r){const p=JSON.parse(r);if(p&&Array.isArray(p.items))S={limits:{},...p}}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=s=>{const n=parseFloat(String(s).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",","."));return isNaN(n)?0:n};
const pad=n=>String(n).padStart(2,"0");
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const col=c=>(EC.find(x=>x[0]===c)||EC[5])[1];
let cur=today().slice(0,7),view="resumo",type="e",editId=null,q="",fc="";

function mItems(ym){
  const[y,m]=ym.split("-").map(Number),out=[];
  for(const i of S.items){
    if(i.rec){if(i.d.slice(0,7)<=ym)out.push({...i,d:`${ym}-${pad(Math.min(+i.d.slice(8),new Date(y,m,0).getDate()))}`})}
    else if(i.d.startsWith(ym))out.push(i);
  }
  return out;
}
const sum=(a,t)=>a.filter(i=>i.type===t).reduce((s,i)=>s+i.v,0);
function shift(n,ym=cur){let[y,m]=ym.split("-").map(Number);m+=n;while(m<1){m+=12;y--}while(m>12){m-=12;y++}return `${y}-${pad(m)}`}
$("prev").onclick=()=>{cur=shift(-1);render()};
$("next").onclick=()=>{cur=shift(1);render()};
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{
  view=b.dataset.v;
  document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-selected",x===b));
  render();
});

function setType(t){
  type=t;$("tE").setAttribute("aria-pressed",t==="e");$("tI").setAttribute("aria-pressed",t==="i");
  $("cat").innerHTML=(t==="e"?EC.map(c=>c[0]):IC).map(c=>`<option>${c}</option>`).join("");
}
$("tE").onclick=()=>setType("e");$("tI").onclick=()=>setType("i");
function openSheet(id){
  editId=id;const it=id?S.items.find(i=>i.id===id):null;
  setType(it?it.type:"e");
  $("val").value=it?String(it.v).replace(".",","):"";
  if(it)$("cat").value=it.c;
  $("date").value=it?it.d:today();$("desc").value=it?it.t:"";$("rec").checked=!!(it&&it.rec);
  $("del").hidden=!it;$("err").textContent="";$("sheet").classList.add("on");$("val").focus();
}
const closeSheet=()=>$("sheet").classList.remove("on");
$("fab").onclick=()=>openSheet(null);$("cancel").onclick=closeSheet;
$("sheet").onclick=e=>{if(e.target===$("sheet"))closeSheet()};
$("save").onclick=()=>{
  const v=num($("val").value),d=$("date").value;
  if(!(v>0)){$("err").textContent="Digite um valor maior que zero.";return}
  if(!d){$("err").textContent="Escolha a data.";return}
  const o={type,v,c:$("cat").value,d,t:$("desc").value.trim(),rec:$("rec").checked};
  if(editId){const i=S.items.findIndex(x=>x.id===editId);S.items[i]={...S.items[i],...o}}
  else S.items.push({id:Date.now()+Math.random(),...o});
  save();cur=d.slice(0,7);closeSheet();render();
};
$("del").onclick=()=>{S.items=S.items.filter(i=>i.id!==editId);save();closeSheet();render()};

function render(){
  const[y,m]=cur.split("-").map(Number);
  $("mes").textContent=new Date(y,m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  ["resumo","lanc","lim"].forEach(v=>$("v-"+v).hidden=v!==view);
  const items=mItems(cur);
  if(view==="resumo")resumo(items);else if(view==="lanc")lanc(items);else limites();
}

function resumo(items){
  const inc=sum(items,"i"),exp=sum(items,"e"),bal=inc-exp;
  const rate=inc>0?Math.round(bal/inc*100):null;
  let h=`<div class="card"><p class="sub">Saldo do mês</p><p class="big ${bal<0?"neg":""}">${brl.format(bal)}</p>
    <div class="pair"><div><span class="sub">Receitas</span><b class="pos">${brl.format(inc)}</b></div><div><span class="sub">Despesas</span><b>${brl.format(exp)}</b></div></div>
    <p class="sub" style="margin-top:12px">${rate===null?"Registre uma receita para ver quanto você poupa.":rate>=0?`Você poupou ${rate}% da renda neste mês.`:`Você gastou ${-rate}% a mais do que ganhou.`}</p></div>`;
  const ms=[5,4,3,2,1,0].map(n=>shift(-n)),data=ms.map(k=>{const a=mItems(k);return[k,sum(a,"i"),sum(a,"e")]});
  const mx=Math.max(1,...data.flatMap(d=>[d[1],d[2]]));
  h+=`<div class="card"><h2>Últimos 6 meses</h2><div class="chart">${data.map(d=>`<div><div class="bars"><i title="Receitas" style="height:${d[1]/mx*100}%;background:var(--ok)"></i><i title="Despesas" style="height:${d[2]/mx*100}%;background:var(--accent)"></i></div><small>${new Date(+d[0].slice(0,4),+d[0].slice(5)-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</small></div>`).join("")}</div>
    <p class="sub" style="margin-top:10px"><span class="dot" style="background:var(--ok)"></span>Receitas <span class="dot" style="background:var(--accent);margin-left:12px"></span>Despesas</p></div>`;
  const tot={};items.filter(i=>i.type==="e").forEach(i=>tot[i.c]=(tot[i.c]||0)+i.v);
  const rows=EC.filter(c=>tot[c[0]]||S.limits[c[0]]);
  h+=`<div class="card"><h2>Despesas por categoria</h2>`+(rows.length?rows.map(c=>{
    const v=tot[c[0]]||0,l=S.limits[c[0]]||0,p=l?v/l*100:(exp?v/exp*100:0);
    const colr=l?(p>100?"var(--bad)":p>80?"var(--warn)":`var(${c[1]})`):`var(${c[1]})`;
    return `<div class="lim"><div class="r"><span><span class="dot" style="background:var(${c[1]})"></span>${c[0]}</span><span>${brl.format(v)}${l?` de ${brl.format(l)}`:""}</span></div><div class="meter"><i style="width:${Math.min(100,p)}%;background:${colr}"></i></div></div>`}).join(""):`<p class="sub">Nenhuma despesa neste mês.</p>`)+`</div>`;
  $("v-resumo").innerHTML=h;
}

function lanc(items){
  let list=items.filter(i=>(!fc||i.c===fc)&&(!q||(i.t+" "+i.c).toLowerCase().includes(q.toLowerCase())));
  list.sort((a,b)=>b.d.localeCompare(a.d)||b.id-a.id);
  const opts=[...EC.map(c=>c[0]),...IC].map(c=>`<option ${c===fc?"selected":""}>${c}</option>`).join("");
  let h=`<div class="tools"><input id="q" placeholder="Buscar" value="${esc(q)}" aria-label="Buscar"><select id="fc" aria-label="Filtrar categoria"><option value="">Todas</option>${opts}</select></div>`;
  if(!list.length)h+=`<div class="empty">${items.length?"Nada encontrado com esse filtro.":"Sem lançamentos neste mês. Toque em “+ Lançamento” para começar."}</div>`;
  let last="";
  for(const i of list){
    if(i.d!==last){last=i.d;const dt=new Date(i.d+"T12:00:00"),net=list.filter(x=>x.d===i.d).reduce((s,x)=>s+(x.type==="i"?x.v:-x.v),0);
      h+=`<div class="dayhead"><span>${dt.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})}</span><span>${brl.format(net)}</span></div>`}
    h+=`<button class="item" data-id="${i.id}"><span class="dot" style="background:${i.type==="i"?"var(--ok)":`var(${col(i.c)})`};margin:0"></span><div class="t"><div>${esc(i.t||i.c)}</div><small>${esc(i.c)}${i.rec?" · fixo mensal":""}</small></div><b class="${i.type==="i"?"pos":""}">${i.type==="i"?"+":"−"}${brl.format(i.v)}</b></button>`;
  }
  $("v-lanc").innerHTML=h;
  $("q").oninput=e=>{q=e.target.value;const p=e.target.selectionStart;lanc(items);$("q").focus();$("q").setSelectionRange(p,p)};
  $("fc").onchange=e=>{fc=e.target.value;lanc(items)};
  $("v-lanc").querySelectorAll(".item").forEach(b=>b.onclick=()=>openSheet(Number(b.dataset.id)||b.dataset.id));
}

function limites(){
  $("v-lim").innerHTML=`<div class="card"><h2>Limite mensal por categoria</h2><p class="sub" style="margin-bottom:14px">Defina quanto quer gastar em cada categoria. A barra no Resumo fica amarela a partir de 80% e vermelha ao passar do limite.</p>`+
    EC.map(c=>`<div class="limrow"><label for="l${c[0]}"><span class="dot" style="background:var(${c[1]})"></span>${c[0]}</label><input class="field" id="l${c[0]}" data-c="${c[0]}" inputmode="decimal" placeholder="Sem limite" value="${S.limits[c[0]]?String(S.limits[c[0]]).replace(".",","):""}"></div>`).join("")+`</div>`;
  $("v-lim").querySelectorAll("input").forEach(i=>i.onchange=()=>{const v=num(i.value);if(v>0)S.limits[i.dataset.c]=v;else delete S.limits[i.dataset.c];save();limites()});
}
render();

/* Atalhos de teclado (computador) */
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
$("sheet").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.tagName==="INPUT"&&e.target.type!=="checkbox")$("save").click();
});
