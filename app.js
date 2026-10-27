const initialNodes = [
{id:1,x:85,y:285},{id:2,x:230,y:285},{id:3,x:240,y:180},{id:4,x:230,y:410},
{id:5,x:390,y:70},{id:6,x:355,y:285},{id:7,x:355,y:410},{id:8,x:570,y:410},
{id:9,x:570,y:285},{id:10,x:570,y:155},{id:11,x:730,y:55},{id:12,x:815,y:250}
];
const initialEdges = [
[1,2,3],[1,3,1],[1,4,4],[1,5,1],[2,3,6],[2,4,5],[2,6,3],[3,6,2],
[3,10,7],[4,7,9],[5,10,3],[5,11,14],[6,7,3],[6,9,1],[7,8,10],[7,9,11],
[8,12,1],[9,10,18],[9,12,16],[10,11,15],[11,12,20]
].map(([a,b,w])=>({a,b,w}));
let nodes=structuredClone(initialNodes), edges=structuredClone(initialEdges), algorithm='prim', steps=[], stepIndex=0, editMode='', pickedNode=null, pickedEdge=null, timer=null;
let lastNodesLayout = null; 

const $=id=>document.getElementById(id);
function edgeKey(e){
  // Si los IDs son números, los ordena numéricamente. Si son letras, alfabéticamente.
  const isNum = typeof e.a === 'number' && typeof e.b === 'number';
  if(isNum) return e.a<e.b?`${e.a}-${e.b}`:`${e.b}-${e.a}`;
  return e.a.toString() < e.b.toString() ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
}
function getNode(id){return nodes.find(n=>n.id===id)}
function sortedEdges(){return [...edges].sort((x,y)=>x.w-y.w||Math.min(x.a,x.b)-Math.min(y.a,y.b)||Math.max(x.a,x.b)-Math.max(y.a,y.b))}
function buildSteps(){
 steps=[];stepIndex=0;algorithm=$('algorithm').value;
 const accepted=new Set(), rejected=new Set(); let total=0;
 if(nodes.length<2){renderAll();return}
 if(algorithm==='kruskal'){
  const parent={};nodes.forEach(n=>parent[n.id]=n.id);
  const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
  for(const e of sortedEdges()){
   if(accepted.size>=nodes.length-1)break;
   const ra=find(e.a),rb=find(e.b),ok=ra!==rb;
   if(ok){parent[ra]=rb;accepted.add(edgeKey(e));total+=e.w}else rejected.add(edgeKey(e));
   steps.push({e,ok,accepted:new Set(accepted),rejected:new Set(rejected),total,title:ok?`Aceptar ${e.a}–${e.b}`:`Descartar ${e.a}–${e.b}`,text:ok?`Peso ${e.w}. Une dos componentes diferentes; no crea un ciclo.`:`Peso ${e.w}. Los vértices ${e.a} y ${e.b} ya están conectados por otro camino; añadir esta arista crearía un ciclo.`});
  }
 }else{
  let start=$('startNode').value || nodes[0].id;
  const visited=new Set([start]);
  steps.push({e:null,ok:true,accepted:new Set(),rejected:new Set(),total:0,title:`Empezar en el vértice ${start}`,text:'Prim comienza con un solo vértice. En cada paso busca la arista más barata que salga del conjunto conectado hacia un vértice nuevo.'});
  while(visited.size<nodes.length){
   const candidates=sortedEdges().filter(e=>(visited.has(e.a)&&!visited.has(e.b))||(visited.has(e.b)&&!visited.has(e.a)));
   if(!candidates.length){steps.push({e:null,ok:false,accepted:new Set(accepted),rejected:new Set(rejected),total,title:'Grafo desconectado',text:'No quedan aristas que conecten con los vértices restantes. Este grafo no está conectado.'});break}
   const e=candidates[0], newNode=visited.has(e.a)?e.b:e.a; visited.add(newNode);accepted.add(edgeKey(e));total+=e.w;
   steps.push({e,ok:true,accepted:new Set(accepted),rejected:new Set(rejected),total,title:`Aceptar ${e.a}–${e.b}`,text:`Es la arista más barata que conecta el árbol actual con un vértice nuevo. Peso ${e.w}; el total acumulado es ${total}.`});
  }
 }
 lastNodesLayout = nodes.map(n => ({...n}));
 renderAll();
}
function currentStep(){return steps[Math.max(0,Math.min(stepIndex-1,steps.length-1))]||null}
function renderGraph(){
 const svg=$('graphSvg');svg.innerHTML='';
 const s=currentStep(), accepted=s?s.accepted:new Set(), rejected=s?s.rejected:new Set(), current=s&&s.e?edgeKey(s.e):null;
 svg.insertAdjacentHTML('beforeend',`<defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#34445c" opacity=".45"/></pattern></defs><rect width="900" height="540" fill="url(#dots)"/>`);
 
 edges.forEach(e=>{
  const a=getNode(e.a),b=getNode(e.b);if(!a||!b)return;
  let x1=a.x,y1=a.y,x2=b.x,y2=b.y;
  
  let path, lx=(x1+x2)/2, ly=(y1+y2)/2;
  
  // Mantener la curva original solo para el ejercicio de la pizarra
  if((e.a==='1'&&e.b==='5')||(e.a===1&&e.b===5)||(e.a==='5'&&e.b==='1')||(e.a===5&&e.b===1)){
    path=`M ${x1} ${y1} Q 175 -35 ${x2} ${y2}`;
    lx=230; ly=45;
  } else {
    path=`M ${x1} ${y1} L ${x2} ${y2}`;
    let dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1;
    lx=(x1+x2)/2 - dy/len*13;
    ly=(y1+y2)/2 + dx/len*13;
  }

  let cls='edge';if(accepted.has(edgeKey(e)))cls+=' selected';if(rejected.has(edgeKey(e)))cls+=' rejected';if(current===edgeKey(e))cls+=' current';
  svg.insertAdjacentHTML('beforeend',`<path class="${cls}" d="${path}" data-edge="${edgeKey(e)}"/><text class="edge-label" x="${lx}" y="${ly}" text-anchor="middle">${e.w}</text>`);
 });
 
 nodes.forEach(n=>{
  const selected=pickedNode===n.id?' selected-node':'';
  // Aseguramos que el ID se pinte como texto por si acaso
  svg.insertAdjacentHTML('beforeend',`<g data-node="${n.id}"><circle class="node${selected}" cx="${n.x}" cy="${n.y}" r="18"/><text class="node-label" x="${n.x}" y="${n.y}">${n.id}</text></g>`);
 });
 svg.querySelectorAll('[data-node]').forEach(el=>{
  const idStr = el.dataset.node;
  // Si es un número, lo convertimos a número. Si es letra, lo dejamos como letra.
  const id = (!isNaN(idStr) && !isNaN(parseFloat(idStr))) ? Number(idStr) : idStr;
  
  el.addEventListener('click',()=>{ if(!window.__graphDragged) nodeClick(id); });
  el.addEventListener('pointerdown',ev=>{
   if(editMode) return;
   const node=getNode(id); if(!node) return;
   window.__graphDragged=false;
   const rect=svg.getBoundingClientRect();
   const scaleX=900/rect.width, scaleY=540/rect.height;
   const startX=ev.clientX,startY=ev.clientY,origX=node.x,origY=node.y;
   const move=e=>{
    if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>3) window.__graphDragged=true;
    if(!window.__graphDragged)return;
    node.x=Math.max(25,Math.min(875,origX+(e.clientX-startX)*scaleX));
    node.y=Math.max(25,Math.min(515,origY+(e.clientY-startY)*scaleY));
    renderGraph();
   };
   const up=()=>{
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',up);
    if(window.__graphDragged){steps=[];stepIndex=0;renderAll();}
    setTimeout(()=>window.__graphDragged=false,0);
   };
   window.addEventListener('pointermove',move);
   window.addEventListener('pointerup',up);
  });
 });
 svg.querySelectorAll('[data-edge]').forEach(el=>el.addEventListener('click',()=>edgeClick(el.dataset.edge)));
}
function renderMatrix(){
 const table=$('matrixTable');let html='<thead><tr><th>V</th>'+nodes.map(n=>`<th>${n.id}</th>`).join('')+'</tr></thead><tbody>';
 const s=currentStep(),accepted=s?s.accepted:new Set(),rejected=s?s.rejected:new Set(),current=s&&s.e?edgeKey(s.e):null;
 nodes.forEach(n=>{html+=`<tr><th>${n.id}</th>`;nodes.forEach(m=>{
  if(n.id===m.id){html+='<td class="diag">—</td>';return}
  const e=edges.find(e=>(e.a===n.id&&e.b===m.id)||(e.b===n.id&&e.a===m.id));
  let cls=!e?'zero':'',val=e?e.w:0;
  if(e&&accepted.has(edgeKey(e)))cls='path';if(e&&rejected.has(edgeKey(e)))cls='rejected';if(e&&current===edgeKey(e))cls='current';
  html+=`<td class="${cls}">${val}</td>`;
 });html+='</tr>'});table.innerHTML=html+'</tbody>';
}
function renderLog(){
 const log=$('edgeLog'),s=currentStep();$('progressText').textContent=`${stepIndex} / ${steps.length} pasos`;
 if(!s||!steps.length){log.innerHTML='<div class="muted">Pulsa "Resolver" para comenzar.</div>';return}
 const visible=steps.slice(1,stepIndex);
 log.innerHTML=visible.length?visible.map((st,i)=>`<div class="edge-row ${st.ok?'good':'bad'}"><span><strong>${st.e?`${st.e.a}–${st.e.b}`:st.title}</strong><br><small>${st.e?`Peso ${st.e.w}`:'Inicio'}</small></span><span>${st.ok?'✓ Aceptada':'× Descartada'}</span></div>`).join(''):'<div class="muted">Aún no se han revisado aristas.</div>';
 log.scrollTop=log.scrollHeight;
}
function renderAll(){
 renderGraph();renderMatrix();renderLog();
 const s=currentStep();$('chosenCount').textContent=s?s.accepted.size:0;$('totalWeight').textContent=s?s.total:0;$('vertexCount').textContent=nodes.length;
 $('stepNumber').textContent=s?`PASO ${stepIndex} DE ${steps.length}`:'LISTO PARA EMPEZAR';
 $('stepTitle').textContent=s?s.title:'Elige un algoritmo';
 $('stepText').textContent=s?s.text:'Selecciona Prim o Kruskal y pulsa "Resolver" para ver cada decisión.';
 $('prevBtn').disabled=stepIndex<=0;$('nextBtn').disabled=stepIndex>=steps.length;
 $('runBtn').textContent=stepIndex>=steps.length?'✓ Completado':'▶ Resolver';
 $('graphSubtitle').textContent=`${nodes.length} vértices · ${edges.length} aristas`;
}
function updateStart(){
  const sel=$('startNode'), old=sel.value;
  sel.innerHTML=nodes.map(n=>`<option value="${n.id}">Vértice ${n.id}</option>`).join('');
  // Mantenemos la selección si el valor aún existe
  if(nodes.some(n=>n.id == old || n.id.toString() === old)) sel.value=old;
}
function start(){if(!steps.length)buildSteps();if(stepIndex<steps.length)stepIndex++;renderAll()}
function nodeClick(id){
 if(!editMode){return}
 if(editMode==='connect'){
  if(pickedNode===null){pickedNode=id;$('editorHint').textContent=`Vértice ${id} seleccionado. Ahora elige el segundo.`;renderGraph();return}
  if(pickedNode===id){pickedNode=null;$('editorHint').textContent='Selección cancelada.';renderGraph();return}
  const a=pickedNode,b=id; pickedNode=null;
  const old=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
  if(old){alert('Ya existe una arista entre esos vértices.');renderGraph();return}
  const raw=prompt(`Peso de la arista ${a}–${b}:`,'1');if(raw===null||raw.trim()===''||!Number.isFinite(Number(raw))||Number(raw)<0){$('editorHint').textContent='Peso cancelado o no válido.';renderGraph();return}
  edges.push({a,b,w:Number(raw)});afterEdit(`Arista ${a}–${b} añadida.`);
 }else if(editMode==='delete'){
  pickedNode=id;$('editorHint').textContent=`Ahora haz clic en la arista que quieres eliminar.`;renderGraph();
 }
}
function edgeClick(key){
 const parts = key.split('-');
 const a = (!isNaN(parts[0])) ? Number(parts[0]) : parts[0];
 const b = (!isNaN(parts[1])) ? Number(parts[1]) : parts[1];
 
 if(editMode==='delete'){edges=edges.filter(e=>edgeKey(e)!==key);afterEdit(`Arista ${key} eliminada.`)}
 else if(editMode==='connect'){return}
 else {pickedEdge=key;const e=edges.find(e=>edgeKey(e)===key);if(e){$('stepTitle').textContent=`Arista ${e.a}–${e.b}`;$('stepText').textContent=`Peso ${e.w}. Selecciona un algoritmo y pulsa Resolver para ver cómo se evalúa.`}}
}
function afterEdit(msg){pickedNode=null;steps=[];stepIndex=0;updateStart();$('editorHint').textContent=msg;renderAll()}
function switchView(which){$('graphView').classList.toggle('hidden',which!=='graph');$('matrixView').classList.toggle('hidden',which!=='matrix');$('graphTab').classList.toggle('active',which==='graph');$('matrixTab').classList.toggle('active',which==='matrix')}
$('graphTab').onclick=()=>switchView('graph');$('matrixTab').onclick=()=>switchView('matrix');
function chooseAlgorithm(value){$('algorithm').value=value;$('primOption').classList.toggle('active',value==='prim');$('kruskalOption').classList.toggle('active',value==='kruskal');$('algorithmHelp').textContent=value==='prim'?'Prim comienza en un vértice y agrega la arista más barata que conecta un vértice nuevo.':'Kruskal ordena todas las aristas por peso y acepta las que no forman ciclos.';$('startNode').disabled=value==='kruskal';buildSteps()}
$('primOption').onclick=()=>chooseAlgorithm('prim');$('kruskalOption').onclick=()=>chooseAlgorithm('kruskal');$('algorithm').onchange=()=>chooseAlgorithm($('algorithm').value);
$('startNode').onchange=buildSteps;
$('runBtn').onclick=()=>{if(stepIndex===0)start();else if(stepIndex<steps.length){if($('speed').value==='manual')start();else{if(timer)clearInterval(timer);timer=setInterval(()=>{if(stepIndex>=steps.length){clearInterval(timer);return}start()},$('speed').value==='slow'?1100:300)}}};
$('nextBtn').onclick=()=>start();
$('prevBtn').onclick=()=>{if(timer)clearInterval(timer);stepIndex=Math.max(0,stepIndex-1);renderAll()};

$('resetBtn').onclick=()=>{
  if(timer) clearInterval(timer);
  stepIndex=0;
  if(lastNodesLayout){
    nodes = lastNodesLayout.map(n => ({...n}));
    if(nodes.length === 12 && nodes[0].id === 1) {
       nodes = structuredClone(initialNodes);
    }
  }
  renderAll();
  $('editorHint').textContent = 'Algoritmo reiniciado y posiciones restauradas.';
};

$('presetBtn').onclick=()=>{
  nodes=structuredClone(initialNodes);
  edges=structuredClone(initialEdges);
  editMode='';
  pickedNode=null;
  $('editorHint').textContent='Ejercicio original cargado.';
  $('presetBtn').classList.add('active');
  steps=[];stepIndex=0;
  lastNodesLayout = nodes.map(n => ({...n}));
  updateStart();
  renderAll();
};

$('newGraphBtn').onclick=()=>{nodes=[];edges=[];editMode='';pickedNode=null;$('presetBtn').classList.remove('active');lastNodesLayout=null;afterEdit('Grafo vacío. Añade vértices para comenzar.')};

$('addNodeBtn').onclick=()=>{
 // Para añadir nodos nuevos, si el último es letra, busca la siguiente letra. Si es número, suma 1.
 let newId;
 if(nodes.length === 0){
   newId = 1;
 } else {
   const ids = nodes.map(n => n.id);
   const allNums = ids.every(id => typeof id === 'number');
   if(allNums) {
     newId = Math.max(...ids) + 1;
   } else {
     // Lógica simple para letras (A, B, C...)
     const letters = ids.filter(id => typeof id === 'string' && id.length === 1);
     if(letters.length > 0) {
       const maxCharCode = Math.max(...letters.map(l => l.toUpperCase().charCodeAt(0)));
       newId = String.fromCharCode(maxCharCode + 1);
     } else {
       newId = ids.length + 1;
     }
   }
 }

 const MARGIN=50, W=900, H=540;
 const minX=MARGIN, maxX=W-MARGIN, minY=MARGIN, maxY=H-MARGIN;
 const MIN_DIST=55;
 const cols=6, rows=4;
 const stepX=(maxX-minX)/(cols-1);
 const stepY=(maxY-minY)/(rows-1);
 const candidates=[];
 for(let r=0;r<rows;r++){
  for(let c=0;c<cols;c++){
   candidates.push({x:minX+c*stepX, y:minY+r*stepY});
  }
 }
 let pos=null;
 for(const p of candidates){
  const free=nodes.every(n=>Math.hypot(n.x-p.x, n.y-p.y)>=MIN_DIST);
  if(free){ pos=p; break; }
 }
 if(!pos){
  for(let i=0;i<200 && !pos;i++){
   const p={x:minX+Math.random()*(maxX-minX), y:minY+Math.random()*(maxY-minY)};
   if(nodes.every(n=>Math.hypot(n.x-p.x, n.y-p.y)>=MIN_DIST)) pos=p;
  }
 }
 if(!pos) pos={x:(minX+maxX)/2, y:(minY+maxY)/2};
 nodes.push({id:newId, x:pos.x, y:pos.y});
 lastNodesLayout = nodes.map(n => ({...n}));
 $('presetBtn').classList.remove('active');
 afterEdit(`Vértice ${newId} añadido.`);
};

$('editEdgesBtn').onclick=()=>{editMode=editMode==='connect'?'':'connect';pickedNode=null;$('editorHint').textContent=editMode?'Modo conectar: pulsa dos vértices y escribe el peso.':'Edición desactivada.';$('editEdgesBtn').classList.toggle('active',!!editMode);renderGraph()};
$('deleteEdgeBtn').onclick=()=>{editMode=editMode==='delete'?'':'delete';pickedNode=null;$('editorHint').textContent=editMode?'Modo eliminar: pulsa la arista que quieres borrar.':'Edición desactivada.';$('deleteEdgeBtn').classList.toggle('active',editMode==='delete');renderGraph()};
$('clearBtn').onclick=()=>{if(confirm('¿Vaciar completamente el grafo?')){nodes=[];edges=[];$('presetBtn').classList.remove('active');lastNodesLayout=null;afterEdit('Grafo vacío. Añade vértices para comenzar.')}};
$('restoreBtn').onclick=()=>{$('presetBtn').click()};
$('downloadMatrix').onclick=()=>{const ids=nodes.map(n=>n.id),rows=[['V',...ids]];ids.forEach(a=>rows.push([a,...ids.map(b=>{const e=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));return a===b?0:(e?e.w:0)})]));const csv=rows.map(r=>r.join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='matriz-grafo.csv';a.click();URL.revokeObjectURL(url)};

// ==========================================
// MOTOR DE FUERZAS CON ESCALADO AUTOMÁTICO (AUTO-FIT)
// ==========================================
$('importExcelBtn').onclick = () => $('excelFileInput').click();

function autoLayout() {
  if (nodes.length === 0) return;

  const SIM_W = 1600, SIM_H = 1200;
  const CX = SIM_W / 2, CY = SIM_H / 2;
  const k = Math.sqrt((SIM_W * SIM_H) / Math.max(1, nodes.length)) * 0.8;
  const iterations = 600;

  nodes.forEach(n => {
    n.x = CX + (Math.random() - 0.5) * SIM_W * 0.8;
    n.y = CY + (Math.random() - 0.5) * SIM_H * 0.8;
  });

  for (let iter = 0; iter < iterations; iter++) {
    const temp = (1 - iter / iterations) * 200;
    nodes.forEach(v => { v.dx = 0; v.dy = 0; });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const v = nodes[i], u = nodes[j];
        let dx = v.x - u.x, dy = v.y - u.y;
        let dist = Math.hypot(dx, dy) || 0.1;
        let force = (k * k * 1.5) / dist;
        v.dx += (dx / dist) * force; v.dy += (dy / dist) * force;
        u.dx -= (dx / dist) * force; u.dy -= (dy / dist) * force;
      }
    }

    edges.forEach(e => {
      const v = getNode(e.a), u = getNode(e.b);
      if (!v || !u) return;
      let dx = v.x - u.x, dy = v.y - u.y;
      let dist = Math.hypot(dx, dy) || 0.1;
      let force = (dist * dist) / k;
      v.dx -= (dx / dist) * force; v.dy -= (dy / dist) * force;
      u.dx += (dx / dist) * force; u.dy += (dy / dist) * force;
    });

    nodes.forEach(v => {
      let dx = CX - v.x, dy = CY - v.y;
      let dist = Math.hypot(dx, dy) || 0.1;
      v.dx += (dx / dist) * (dist * 0.1); 
      v.dy += (dy / dist) * (dist * 0.1);
    });

    nodes.forEach(v => {
      let dist = Math.hypot(v.dx, v.dy) || 0.1;
      let step = Math.min(dist, temp);
      v.x += (v.dx / dist) * step;
      v.y += (v.dy / dist) * step;
    });
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const graphW = maxX - minX;
  const graphH = maxY - minY;

  const W = 900, H = 540;
  const PADDING_X = 90;
  const PADDING_Y = 70;
  const targetW = W - (PADDING_X * 2);
  const targetH = H - (PADDING_Y * 2);

  const scaleX = graphW > 0 ? targetW / graphW : 1;
  const scaleY = graphH > 0 ? targetH / graphH : 1;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = PADDING_X + (targetW - graphW * scale) / 2;
  const offsetY = PADDING_Y + (targetH - graphH * scale) / 2;

  nodes.forEach(n => {
    n.x = offsetX + (n.x - minX) * scale;
    n.y = offsetY + (n.y - minY) * scale;
  });
}

$('autoFormatBtn').onclick = () => {
  autoLayout();
  lastNodesLayout = nodes.map(n => ({...n}));
  renderAll();
  $('editorHint').textContent = 'Grafo reordenado con Auto-Fit (todos los nodos y aristas visibles).';
};

$('excelFileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (json.length < 2) {
        alert('El archivo Excel está vacío o no tiene suficientes filas.');
        return;
      }

      const headers = json[0].map(h => String(h).trim().toLowerCase());
      const idxOrigen = headers.findIndex(h => h.includes('origen') || h.includes('source') || h === 'a');
      const idxDestino = headers.findIndex(h => h.includes('destino') || h.includes('target') || h === 'b');
      const idxPeso = headers.findIndex(h => h.includes('peso') || h.includes('weight') || h === 'w');

      if (idxOrigen === -1 || idxDestino === -1) {
        alert('La primera fila debe tener columnas "Origen" y "Destino".');
        return;
      }

      const newEdges = [];
      const nodeIds = new Set();

      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        // LEER ORIGEN Y DESTINO COMO STRING PARA SOPORTAR LETRAS Y NÚMEROS
        let rawA = String(row[idxOrigen]).trim();
        let rawB = String(row[idxDestino]).trim();
        
        if (!rawA || !rawB) continue;
        
        // Si es un número entero puro, lo guardamos como número. Si no, como letra.
        const a = (!isNaN(rawA) && rawA !== '') ? Number(rawA) : rawA;
        const b = (!isNaN(rawB) && rawB !== '') ? Number(rawB) : rawB;
        
        if (a === b) continue;

        let w = 1;
        if (idxPeso !== -1 && row[idxPeso] !== undefined) {
          const parsed = parseFloat(row[idxPeso]);
          if (!isNaN(parsed) && parsed >= 0) w = parsed;
        }

        newEdges.push({ a, b, w });
        nodeIds.add(a);
        nodeIds.add(b);
      }

      if (newEdges.length === 0) {
        alert('No se encontraron aristas válidas en el archivo.');
        return;
      }

      // ORDENAR IDs: Números primero, luego Letras
      const sortedIds = Array.from(nodeIds).sort((x, y) => {
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y);
        return typeof x === 'number' ? -1 : 1;
      });

      nodes = sortedIds.map(id => ({ id, x: 0, y: 0 }));
      edges = newEdges;

      autoLayout();
      lastNodesLayout = nodes.map(n => ({...n}));

      steps = [];
      stepIndex = 0;
      editMode = '';
      pickedNode = null;
      $('presetBtn').classList.remove('active');
      $('editorHint').textContent = `Grafo importado y distribuido: ${nodes.length} vértices, ${edges.length} aristas.`;

      updateStart();
      chooseAlgorithm($('algorithm').value);
      switchView('graph');
      renderAll();

    } catch (err) {
      console.error('Error al leer el Excel:', err);
      alert('No se pudo leer el archivo. Asegúrate de que tiene el formato correcto.');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
});

// Inicialización
updateStart();chooseAlgorithm('prim');switchView('graph');
lastNodesLayout = nodes.map(n => ({...n}));