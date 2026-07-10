const MANIFEST_CANDIDATES=['./data/files.json','./Data/files.json'];
const DEF={xMin:20,xMax:20000,yMin:60,yMax:120};
let items=[],correctionFiles=[],csvCache=new Map(),txtCache=new Map(),chart;
const $=s=>document.querySelector(s), list=$('#list'), status=$('#status'), tbody=$('#tbody');

function msg(t,e=false){status.textContent=t;status.classList.toggle('error',e)}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}

async function fetchFirst(paths){
  const errors=[];
  for(const p of paths){
    const u=new URL(p,document.baseURI);
    try{
      const r=await fetch(u.href+'?v='+Date.now(),{cache:'no-store'});
      if(r.ok)return {response:r,url:u};
      errors.push(`${u.href} → ${r.status}`);
    }catch(e){errors.push(`${u.href} → ${e.message}`)}
  }
  throw new Error(errors.join(' | '));
}

async function loadManifest(){
  msg('파일 목록을 불러오는 중입니다.');
  try{
    const {response}=await fetchFirst(MANIFEST_CANDIDATES);
    const j=await response.json();
    correctionFiles=(j.corrections||[]).map(v=>typeof v==='string'?{file:v,name:v}:v);
    items=(j.files||[]).map((v,i)=>({
      id:'d'+i,file:typeof v==='string'?v:v.file,name:typeof v==='string'?v:(v.name||v.file),
      sel:typeof v==='string'?false:!!v.selected,
      correctionFile:typeof v==='string'?'':(v.correctionFile||''),
      applyCorrection:typeof v==='string'?false:!!v.applyCorrection
    })).filter(v=>v.file);
    renderCards();
    msg(`${items.length}개 데이터 파일, ${correctionFiles.length}개 보정 파일`);
    await Promise.all(items.filter(v=>v.sel).map(loadCsv));
    await Promise.all(items.filter(v=>v.sel&&v.applyCorrection&&v.correctionFile).map(loadCorrection));
    draw();
  }catch(e){console.error(e);msg('files.json을 찾지 못했습니다. '+e.message,true)}
}

function renderCards(){
  const opts=['<option value="">보정 파일 없음</option>',...correctionFiles.map(c=>`<option value="${esc(c.file)}">${esc(c.name||c.file)}</option>`)].join('');
  list.innerHTML=items.map(v=>`<article class="card" data-id="${v.id}">
    <div class="title"><input class="pick" type="checkbox" ${v.sel?'checked':''}><div><div class="name">${esc(v.name)}</div><div class="path">data/${esc(v.file)}</div></div></div>
    <div class="correction">
      <label>주파수별 보정 TXT</label>
      <select class="corr-file">${opts}</select>
      <label><input class="corr-apply" type="checkbox" ${v.applyCorrection?'checked':''}> TXT 보정값 적용</label>
    </div></article>`).join('');

  list.querySelectorAll('.card').forEach(card=>{
    const v=items.find(x=>x.id===card.dataset.id), pick=card.querySelector('.pick'), sel=card.querySelector('.corr-file'), apply=card.querySelector('.corr-apply');
    sel.value=v.correctionFile;
    pick.onchange=async()=>{v.sel=pick.checked;if(v.sel){await loadCsv(v);if(v.applyCorrection&&v.correctionFile)await loadCorrection(v)}draw()};
    sel.onchange=async()=>{v.correctionFile=sel.value;if(v.sel&&v.applyCorrection&&v.correctionFile)await loadCorrection(v);draw()};
    apply.onchange=async()=>{v.applyCorrection=apply.checked;if(v.sel&&v.applyCorrection&&v.correctionFile)await loadCorrection(v);draw()};
  });
}

async function fetchDataFile(filename){
  const variants=[`./data/${filename}`,`./Data/${filename}`];
  return fetchFirst(variants);
}

async function loadCsv(v){
  if(csvCache.has(v.file))return csvCache.get(v.file);
  try{
    const {response}=await fetchDataFile(v.file);
    const parsed=Papa.parse(await response.text(),{header:true,dynamicTyping:true,skipEmptyLines:true});
    const rows=normalizeCsv(parsed.data); csvCache.set(v.file,rows); return rows;
  }catch(e){console.error(e);msg(`${v.file} 로드 실패`,true);return[]}
}

function normalizeCsv(rows){
  if(!rows.length)return[];
  const keys=Object.keys(rows[0]);
  const fk=keys.find(x=>['frequency','freq','hz','주파수'].includes(x.trim().toLowerCase()))||keys[0];
  const dk=keys.find(x=>['db','spl','level','magnitude','값'].includes(x.trim().toLowerCase()))||keys[1];
  return rows.map(r=>({x:Number(r[fk]),y:Number(r[dk])})).filter(p=>p.x>0&&Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.x-b.x);
}

async function loadCorrection(v){
  if(!v.correctionFile)return[];
  if(txtCache.has(v.correctionFile))return txtCache.get(v.correctionFile);
  try{
    const {response}=await fetchDataFile(v.correctionFile);
    const text=await response.text();
    const rows=parseCorrectionText(text); txtCache.set(v.correctionFile,rows); return rows;
  }catch(e){console.error(e);msg(`${v.correctionFile} 보정 파일 로드 실패`,true);return[]}
}

function parseCorrectionText(text){
  const rows=[];
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#')||line.startsWith('//'))continue;
    const parts=line.split(/[,\t; ]+/).filter(Boolean);
    if(parts.length<2)continue;
    const f=Number(parts[0]), c=Number(parts[1]);
    if(Number.isFinite(f)&&f>0&&Number.isFinite(c))rows.push({x:f,y:c});
  }
  return rows.sort((a,b)=>a.x-b.x);
}

function interpolateCorrection(freq, curve){
  if(!curve.length)return 0;
  if(freq<=curve[0].x)return curve[0].y;
  if(freq>=curve[curve.length-1].x)return curve[curve.length-1].y;
  let lo=0,hi=curve.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(curve[mid].x<=freq)lo=mid;else hi=mid}
  const a=curve[lo],b=curve[hi];
  const t=(Math.log10(freq)-Math.log10(a.x))/(Math.log10(b.x)-Math.log10(a.x));
  return a.y+(b.y-a.y)*t;
}

function axis(){return{xMin:num('#xMin',20,true),xMax:num('#xMax',20000,true),yMin:num('#yMin',60),yMax:num('#yMax',120)}}
function num(s,d,pos=false){const n=Number($(s).value);return Number.isFinite(n)&&(!pos||n>0)?n:d}
function color(n){return getComputedStyle(document.body).getPropertyValue(n).trim()}
function tick(v){return({20:'20',50:'50',100:'100',200:'200',500:'500',1000:'1k',2000:'2k',5000:'5k',10000:'10k',20000:'20k'})[v]||''}
function ff(v){return v>=1000?(v/1000).toFixed(v%1000?1:0)+'k':String(v)}

function draw(){
  const a=axis(), chosen=items.filter(v=>v.sel);
  const datasets=chosen.map(v=>{
    const corr=(v.applyCorrection&&v.correctionFile)?(txtCache.get(v.correctionFile)||[]):[];
    const points=(csvCache.get(v.file)||[]).filter(p=>p.x>=a.xMin&&p.x<=a.xMax).map(p=>({x:p.x,y:p.y+interpolateCorrection(p.x,corr)}));
    return{label:v.name+(corr.length?` [${v.correctionFile}]`:''),data:points,parsing:false,borderWidth:2,pointRadius:points.length>150?0:1.5,tension:0};
  });

  chart?.destroy();
  chart=new Chart($('#chart'),{type:'line',data:{datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},
    scales:{
      x:{type:'logarithmic',min:a.xMin,max:a.xMax,title:{display:true,text:'Frequency (Hz)',color:color('--text')},ticks:{color:color('--text'),callback:v=>tick(Number(v))},grid:{color:color('--border')}},
      y:{min:a.yMin,max:a.yMax,title:{display:true,text:'Level (dB)',color:color('--text')},ticks:{color:color('--text'),stepSize:5},grid:{color:color('--border')}}
    },
    plugins:{
      legend:{labels:{color:color('--text'),usePointStyle:true}},
      tooltip:{callbacks:{title:i=>ff(i[0].parsed.x)+' Hz',label:c=>c.dataset.label+': '+c.parsed.y.toFixed(2)+' dB'}},
      zoom:{limits:{x:{min:a.xMin,max:a.xMax},y:{min:a.yMin,max:a.yMax}},pan:{enabled:true,mode:'x'},zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x'}}
    }
  }});

  $('#selected').textContent=chosen.length;
  $('#corrected').textContent=chosen.filter(v=>v.applyCorrection&&v.correctionFile).length;
  $('#freqRange').textContent=ff(a.xMin)+'–'+ff(a.xMax)+' Hz';
  $('#dbRange').textContent=a.yMin+'–'+a.yMax+' dB';
  tbody.innerHTML=chosen.map(v=>{const r=csvCache.get(v.file)||[];return`<tr><td>${esc(v.name)}</td><td>${r.length.toLocaleString()}</td><td>${v.correctionFile?esc(v.correctionFile):'-'}</td><td>${v.applyCorrection&&v.correctionFile?'적용':'미적용'}</td><td>${r.length?ff(r[0].x)+'–'+ff(r.at(-1).x)+' Hz':'-'}</td></tr>`}).join('');
}

$('#reload').onclick=loadManifest;
$('#all').onclick=async()=>{items.forEach(v=>v.sel=true);document.querySelectorAll('.pick').forEach(x=>x.checked=true);await Promise.all(items.map(loadCsv));await Promise.all(items.filter(v=>v.applyCorrection&&v.correctionFile).map(loadCorrection));draw()};
$('#none').onclick=()=>{items.forEach(v=>v.sel=false);document.querySelectorAll('.pick').forEach(x=>x.checked=false);draw()};
$('#draw').onclick=draw;
$('#axisReset').onclick=()=>{Object.entries(DEF).forEach(([k,v])=>$('#'+k).value=v);draw()};
$('#zoomReset').onclick=()=>chart?.resetZoom();
$('#save').onclick=()=>{if(!chart)return;const a=document.createElement('a');a.download='frequency-response.png';a.href=chart.toBase64Image();a.click()};
$('#theme').onclick=e=>{document.body.classList.toggle('dark');e.target.textContent=document.body.classList.contains('dark')?'라이트 모드':'다크 모드';draw()};
loadManifest();