/* =========================================================
   GraphLab — Simulador de teoría de grafos
   ========================================================= */

const PART1 = 'AQ.Ab8RN6JBoHRkAijF652vdQepETpb0GtRFERXgGh78GwaqZH';
const PART2 = '_7Q';
const API_KEY = PART1 + PART2;

const initialNodes = [
  {id:1,x:85,y:285},{id:2,x:230,y:285},{id:3,x:240,y:180},{id:4,x:230,y:410},
  {id:5,x:390,y:70},{id:6,x:355,y:285},{id:7,x:355,y:410},{id:8,x:570,y:410},
  {id:9,x:570,y:285},{id:10,x:570,y:155},{id:11,x:730,y:55},{id:12,x:815,y:250}
];
const initialEdges = [
  [1,2,3],[1,3,1],[1,4,4],[1,5,1],[2,3,6],[2,4,5],[2,6,3],[3,6,2],
  [3,10,7],[4,7,9],[5,10,3],[5,11,14],[6,7,3],[6,9,1],[7,8,10],[7,9,11],
  [8,12,1],[9,10,18],[9,12,16],[10,11,15],[11,12,20]
].map(([a,b,w])=>{
  const isCurved = (a===1 && b===5) || (a===5 && b===1);
  return {a, b, w, isCurved, curveDir: 'up', curveOffset: 140};
});

let nodes = structuredClone(initialNodes);
let edges = structuredClone(initialEdges);
let algorithm = 'prim';
let steps = [];
let stepIndex = 0;
let editMode = '';
let pickedNode = null;
let pickedEdge = null;
let timer = null;
let lastNodesLayout = null;

const $ = id => document.getElementById(id);
const SEP = '\u0001';

/* ---------- Utilidades ---------- */
function sameId(a, b){
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  return String(a) === String(b);
}

function edgeKey(e){
  const isNum = typeof e.a === 'number' && typeof e.b === 'number';
  let x, y;
  if (isNum) [x, y] = e.a < e.b ? [e.a, e.b] : [e.b, e.a];
  else [x, y] = String(e.a) < String(e.b) ? [e.a, e.b] : [e.b, e.a];
  return `${x}${SEP}${y}`;
}

function parseEdgeKey(key){
  const parts = key.split(SEP);
  const toId = s => (s !== '' && !isNaN(s)) ? Number(s) : s;
  return [toId(parts[0]), toId(parts[1])];
}

function getNode(id){ return nodes.find(n => sameId(n.id, id)); }

function sortedEdges(){ return [...edges].sort((x, y) => x.w - y.w); }
function sortedEdgesDesc(){ return [...edges].sort((x, y) => y.w - x.w); }

/* ---------- Cálculo de Pesos Extremos ---------- */
function updateMinMaxWeights(){
  if (nodes.length < 2) {
    $('minMstWeight').textContent = '-';
    $('maxMstWeight').textContent = '-';
    return;
  }

  function getMstWeight(isMax){
    const parent = {};
    nodes.forEach(n => parent[n.id] = n.id);
    const find = x => {
      if (parent[x] === undefined) parent[x] = x;
      return parent[x] === x ? x : (parent[x] = find(parent[x]));
    };
    
    let total = 0, count = 0;
    const sorted = isMax ? sortedEdgesDesc() : sortedEdges();
    
    for (const e of sorted) {
      if (count >= nodes.length - 1) break;
      const ra = find(e.a), rb = find(e.b);
      if (ra !== rb) { parent[ra] = rb; total += e.w; count++; }
    }
    return count === nodes.length - 1 ? total : '-'; 
  }

  $('minMstWeight').textContent = getMstWeight(false);
  $('maxMstWeight').textContent = getMstWeight(true);
}

/* ---------- Construcción de pasos ---------- */
function buildSteps(){
  steps = []; stepIndex = 0;
  algorithm = $('algorithm').value;
  const accepted = new Set();
  const rejected = new Set();
  let total = 0;

  if (nodes.length < 2){ renderAll(); return; }

  if (algorithm === 'kruskal'){
    const parent = {};
    nodes.forEach(n => parent[n.id] = n.id);
    const find = x => {
      if (parent[x] === undefined) parent[x] = x;
      return parent[x] === x ? x : (parent[x] = find(parent[x]));
    };

    for (const e of sortedEdges()){
      if (accepted.size >= nodes.length - 1) break;
      const ra = find(e.a), rb = find(e.b);
      const ok = ra !== rb;
      if (ok){ parent[ra] = rb; accepted.add(edgeKey(e)); total += e.w; }
      else rejected.add(edgeKey(e));

      steps.push({
        e, ok, accepted: new Set(accepted), rejected: new Set(rejected), total,
        title: ok ? `Aceptar ${e.a}–${e.b}` : `Descartar ${e.a}–${e.b}`,
        text: ok ? `Peso ${e.w}. Une dos componentes diferentes.` : `Peso ${e.w}. Crearía un ciclo.`
      });
    }
  } else {
    let start = $('startNode').value || nodes[0].id;
    const startNode = getNode(start);
    if (startNode) start = startNode.id;

    const visited = new Set([start]);
    steps.push({ e: null, ok: true, accepted: new Set(), rejected: new Set(), total: 0, title: `Iniciar en ${start}`, text: '...' });

    while (visited.size < nodes.length){
      const candidates = sortedEdges().filter(e =>
        (visited.has(e.a) && !visited.has(e.b)) || (visited.has(e.b) && !visited.has(e.a))
      );
      if (!candidates.length){
        steps.push({ e: null, ok: false, accepted: new Set(accepted), rejected: new Set(rejected), total, title: 'Grafo desconectado', text: '...' });
        break;
      }
      const e = candidates[0];
      const newNode = visited.has(e.a) ? e.b : e.a;
      visited.add(newNode);
      accepted.add(edgeKey(e));
      total += e.w;
      steps.push({ e, ok: true, accepted: new Set(accepted), rejected: new Set(rejected), total, title: `Aceptar ${e.a}–${e.b}`, text: `Peso ${e.w}; total ${total}.` });
    }
  }
  lastNodesLayout = nodes.map(n => ({...n}));
  renderAll();
}

function currentStep(){
  return steps[Math.max(0, Math.min(stepIndex - 1, steps.length - 1))] || null;
}

/* ---------- Render del grafo ---------- */
function renderGraph(){
  const svg = $('graphSvg');
  svg.innerHTML = '';

  const s = currentStep();
  const accepted = s ? s.accepted : new Set();
  const rejected = s ? s.rejected : new Set();
  const current = s && s.e ? edgeKey(s.e) : null;

  svg.insertAdjacentHTML('beforeend',
    `<defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#34445c" opacity=".45"/>
    </pattern></defs>
    <rect width="900" height="540" fill="url(#dots)"/>`
  );

  edges.forEach(e => {
    const a = getNode(e.a), b = getNode(e.b);
    if (!a || !b) return;

    let x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    let path, lx = (x1 + x2) / 2, ly = (y1 + y2) / 2;

    if (e.isCurved){
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dir = e.curveDir === 'up' ? -1 : 1; 
      const cx = midX - (dy / len) * e.curveOffset * dir;
      const cy = midY + (dx / len) * e.curveOffset * dir;
      path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
      lx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
      ly = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
    } else {
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      lx = (x1 + x2) / 2 - (dy / len) * 13;
      ly = (y1 + y2) / 2 + (dx / len) * 13;
    }

    const key = edgeKey(e);
    let cls = 'edge';
    if (accepted.has(key)) cls += ' selected';
    if (rejected.has(key)) cls += ' rejected';
    if (current === key) cls += ' current';

    const isGrab = e.isCurved && editMode !== 'delete';
    
    svg.insertAdjacentHTML('beforeend',
      `<path class="${cls}" d="${path}" fill="none" data-edge="${key}" ${e.isCurved ? 'data-curve="true"' : ''} style="${isGrab ? 'cursor: grab;' : ''}"/>
       <text class="edge-label" x="${lx}" y="${ly}" text-anchor="middle">${e.w}</text>`
    );
  });

  nodes.forEach(n => {
    const isSelected = pickedNode !== null && sameId(pickedNode, n.id);
    const selectedCls = isSelected ? ' selected-node' : '';
    svg.insertAdjacentHTML('beforeend',
      `<g data-node="${n.id}">
        <circle class="node${selectedCls}" cx="${n.x}" cy="${n.y}" r="18"/>
        <text class="node-label" x="${n.x}" y="${n.y}">${n.id}</text>
      </g>`
    );
  });

  // --- PANEO ---
  const bgRect = svg.querySelector('rect');
  if (bgRect) {
    bgRect.style.cursor = 'move';
    bgRect.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      bgRect.setPointerCapture(ev.pointerId);
      const startX = ev.clientX, startY = ev.clientY;
      const rect = svg.getBoundingClientRect();
      const scaleX = 900 / rect.width, scaleY = 540 / rect.height;
      const origNodes = nodes.map(n => ({ x: n.x, y: n.y }));
      
      const move = (e) => {
        const dx = (e.clientX - startX) * scaleX;
        const dy = (e.clientY - startY) * scaleY;
        nodes.forEach((n, i) => {
          n.x = origNodes[i].x + dx;
          n.y = origNodes[i].y + dy;
        });
        renderGraph();
      };
      
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  // --- MANEJO DE NODOS ---
  svg.querySelectorAll('[data-node]').forEach(el => {
    const idStr = el.dataset.node;
    const id = (idStr !== '' && !isNaN(idStr)) ? Number(idStr) : idStr;

    el.addEventListener('click', () => { if (!window.__graphDragged) nodeClick(id); });

    el.addEventListener('pointerdown', ev => {
      if (editMode === 'delete-node' || editMode === 'delete') return;
      const node = getNode(id);
      if (!node) return;

      window.__graphDragged = false;
      const rect = svg.getBoundingClientRect();
      const scaleX = 900 / rect.width, scaleY = 540 / rect.height;
      const startX = ev.clientX, startY = ev.clientY;
      const origX = node.x, origY = node.y;
      const circle = el.querySelector('circle');

      const move = e => {
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 3) window.__graphDragged = true;
        if (!window.__graphDragged) return;
        if (circle) circle.classList.add('dragging');
        node.x = Math.max(25, Math.min(875, origX + (e.clientX - startX) * scaleX));
        node.y = Math.max(25, Math.min(515, origY + (e.clientY - startY) * scaleY));
        renderGraph();
      };

      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (circle) circle.classList.remove('dragging');
        if (window.__graphDragged){ steps = []; stepIndex = 0; renderAll(); }
        setTimeout(() => window.__graphDragged = false, 0);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });

  // --- MANEJO DE ARISTAS Y CURVA ---
  svg.querySelectorAll('[data-edge]').forEach(el => {
    let clickTimer = null;
    const [a, b] = parseEdgeKey(el.dataset.edge);
    const edgeObj = edges.find(edge => (sameId(edge.a, a) && sameId(edge.b, b)) || (sameId(edge.b, a) && sameId(edge.a, b)));

    if (editMode === 'delete') {
      el.addEventListener('click', (e) => { e.stopPropagation(); edgeClick(el.dataset.edge); });
      return; 
    }

    el.addEventListener('click', (e) => {
      if (el.dataset.curve === 'true') return; 
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = setTimeout(() => { edgeClick(el.dataset.edge); clickTimer = null; }, 200); 
    });

    if (el.dataset.curve === 'true' && edgeObj) {
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation(); e.preventDefault();
        edgeObj.curveDir = edgeObj.curveDir === 'up' ? 'down' : 'up';
        renderGraph();
      });

      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        el.style.cursor = 'grabbing';
        const startY = e.clientY;
        const startOffset = edgeObj.curveOffset;
        el.setPointerCapture(e.pointerId);

        const move = (ev) => {
          const deltaY = ev.clientY - startY;
          const dirMultiplier = edgeObj.curveDir === 'up' ? -1 : 1;
          edgeObj.curveOffset = Math.max(20, Math.min(400, startOffset + deltaY * dirMultiplier));
          renderGraph();
          const newCurveEl = svg.querySelector(`[data-edge="${el.dataset.edge}"]`);
          if (newCurveEl) newCurveEl.style.cursor = 'grabbing';
        };

        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          const newCurveEl = svg.querySelector(`[data-edge="${el.dataset.edge}"]`);
          if (newCurveEl) newCurveEl.style.cursor = 'grab';
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    } else {
      el.addEventListener('click', () => edgeClick(el.dataset.edge));
    }
  });
}

/* ---------- Resto de funciones ---------- */
function renderMatrix(){
  const table = $('matrixTable');
  let html = '<thead><tr><th>V</th>' + nodes.map(n => `<th>${n.id}</th>`).join('') + '</tr></thead><tbody>';
  const s = currentStep();
  const accepted = s ? s.accepted : new Set();
  const rejected = s ? s.rejected : new Set();
  const current = s && s.e ? edgeKey(s.e) : null;

  nodes.forEach(n => {
    html += `<tr><th>${n.id}</th>`;
    nodes.forEach(m => {
      if (sameId(n.id, m.id)){ html += '<td class="diag">—</td>'; return; }
      const e = edges.find(e => (sameId(e.a, n.id) && sameId(e.b, m.id)) || (sameId(e.b, n.id) && sameId(e.a, m.id)));
      let cls = !e ? 'zero' : '';
      const val = e ? e.w : 0;
      if (e){
        const key = edgeKey(e);
        if (accepted.has(key)) cls = 'path';
        if (rejected.has(key)) cls = 'rejected';
        if (current === key) cls = 'current';
      }
      html += `<td class="${cls}">${val}</td>`;
    });
    html += '</tr>';
  });
  table.innerHTML = html + '</tbody>';
}

function renderLog(){
  const log = $('edgeLog');
  const s = currentStep();
  $('progressText').textContent = `${stepIndex} / ${steps.length} pasos`;
  if (!s || !steps.length){ log.innerHTML = '<div class="muted">Pulsa "Resolver" para comenzar.</div>'; return; }
  const visible = steps.slice(0, stepIndex);
  log.innerHTML = visible.length ? visible.map(st => {
    let cls = 'info', label = '•';
    if (st.e){ cls = st.ok ? 'good' : 'bad'; label = st.ok ? '✓ Aceptada' : '× Descartada'; }
    else { cls = 'info'; label = st.ok ? '▶ Inicio' : '⚠ Aviso'; }
    const title = st.e ? `${st.e.a}–${st.e.b}` : st.title;
    const sub = st.e ? `Peso ${st.e.w}` : (st.ok ? 'Punto de partida' : 'Grafo desconectado');
    return `<div class="edge-row ${cls}"><span><strong>${title}</strong><br><small>${sub}</small></span><span>${label}</span></div>`;
  }).join('') : '<div class="muted">Aún no se han revisado aristas.</div>';
  log.scrollTop = log.scrollHeight;
}

function renderAll(){
  renderGraph(); renderMatrix(); renderLog();
  const s = currentStep();
  $('chosenCount').textContent = s ? s.accepted.size : 0;
  $('totalWeight').textContent = s ? s.total : 0;
  $('vertexCount').textContent = nodes.length;
  $('stepNumber').textContent = s ? `PASO ${stepIndex} DE ${steps.length}` : 'LISTO PARA EMPEZAR';
  $('stepTitle').textContent = s ? s.title : 'Elige un algoritmo';
  $('stepText').textContent = s ? s.text : 'Selecciona Prim o Kruskal y pulsa "Resolver".';
  $('prevBtn').disabled = stepIndex <= 0;
  $('nextBtn').disabled = stepIndex >= steps.length;
  $('runBtn').textContent = stepIndex >= steps.length ? '✓ Completado' : '▶ Resolver';
  $('runBtn').disabled = nodes.length < 2;
  $('graphSubtitle').textContent = `${nodes.length} vértices · ${edges.length} aristas`;
  
  updateMinMaxWeights();
}

function updateStart(){
  const sel = $('startNode');
  const old = sel.value;
  sel.innerHTML = nodes.map(n => `<option value="${n.id}">Vértice ${n.id}</option>`).join('');
  if (nodes.some(n => sameId(n.id, old))) sel.value = old;
}

function start(){
  if (!steps.length) buildSteps();
  if (stepIndex < steps.length) stepIndex++;
  renderAll();
}

function nodeClick(id){
  if (!editMode) return;

  if (editMode === 'delete-node'){
    if(confirm(`¿Eliminar el vértice ${id} y todas sus conexiones?`)){
      nodes = nodes.filter(n => !sameId(n.id, id));
      edges = edges.filter(e => !sameId(e.a, id) && !sameId(e.b, id));
      afterEdit(`Vértice ${id} eliminado.`);
    }
    return;
  }

  if (editMode === 'connect'){
    if (pickedNode === null){ pickedNode = id; $('editorHint').textContent = `Vértice ${id} seleccionado. Ahora elige el segundo.`; renderGraph(); return; }
    if (sameId(pickedNode, id)){ pickedNode = null; $('editorHint').textContent = 'Selección cancelada.'; renderGraph(); return; }
    const a = pickedNode, b = id; pickedNode = null;
    const old = edges.find(e => (sameId(e.a, a) && sameId(e.b, b)) || (sameId(e.b, a) && sameId(e.a, b)));
    if (old){ alert('Ya existe una arista entre esos vértices.'); renderGraph(); return; }
    
    const raw = prompt(`Peso de la arista ${a}–${b}:`, '1');
    if (raw === null || raw.trim() === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0){ $('editorHint').textContent = 'Peso no válido.'; renderGraph(); return; }
    
    const makeCurve = $('curveEdgeBtn').classList.contains('active');
    
    edges.push({ a, b, w: Number(raw), isCurved: makeCurve, curveDir: 'up', curveOffset: 140 }); 
    afterEdit(`Arista ${a}–${b} añadida ${makeCurve ? '(curva)' : ''}.`);
  } else if (editMode === 'delete'){
    pickedNode = id; $('editorHint').textContent = 'Ahora haz clic en la arista.'; renderGraph();
  }
}

function edgeClick(key){
  const [a, b] = parseEdgeKey(key);
  if (editMode === 'delete'){
    edges = edges.filter(e => edgeKey(e) !== key);
    afterEdit(`Arista ${a}–${b} eliminada.`);
  } else if (editMode !== 'connect'){
    const e = edges.find(e => edgeKey(e) === key);
    if (e){ $('stepTitle').textContent = `Arista ${e.a}–${e.b}`; $('stepText').textContent = `Peso ${e.w}.`; }
  }
}

function afterEdit(msg){
  pickedNode = null; steps = []; stepIndex = 0; updateStart(); $('editorHint').textContent = msg; renderAll();
}

function switchView(which){
  $('graphView').classList.toggle('hidden', which !== 'graph');
  $('matrixView').classList.toggle('hidden', which !== 'matrix');
  $('graphTab').classList.toggle('active', which === 'graph');
  $('matrixTab').classList.toggle('active', which === 'matrix');
}

function chooseAlgorithm(value){
  $('algorithm').value = value;
  $('primOption').classList.toggle('active', value === 'prim');
  $('kruskalOption').classList.toggle('active', value === 'kruskal');
  $('algorithmHelp').textContent = value === 'prim' ? 'Prim crece desde un vértice.' : 'Kruskal evita ciclos.';
  $('startNode').disabled = value === 'kruskal';
  buildSteps();
}

/* ---------- Eventos de UI ---------- */
$('graphTab').onclick = () => switchView('graph');
$('matrixTab').onclick = () => switchView('matrix');
$('primOption').onclick = () => chooseAlgorithm('prim');
$('kruskalOption').onclick = () => chooseAlgorithm('kruskal');
$('algorithm').onchange = () => chooseAlgorithm($('algorithm').value);
$('startNode').onchange = buildSteps;

$('runBtn').onclick = () => {
  if (stepIndex === 0){ start(); return; }
  if (stepIndex >= steps.length) return;
  if ($('speed').value === 'manual'){ start(); }
  else {
    if (timer) clearInterval(timer);
    const delay = $('speed').value === 'slow' ? 1100 : 300;
    timer = setInterval(() => { if (stepIndex >= steps.length){ clearInterval(timer); timer = null; return; } start(); }, delay);
    start();
  }
};
$('nextBtn').onclick = () => start();
$('prevBtn').onclick = () => { if (timer){ clearInterval(timer); timer = null; } stepIndex = Math.max(0, stepIndex - 1); renderAll(); };

$('resetBtn').onclick = () => {
  if (timer){ clearInterval(timer); timer = null; }
  stepIndex = 0;
  const isPreset = nodes.length === initialNodes.length && edges.length === initialEdges.length &&
    edges.every((e, i) => {
      const o = initialEdges[i];
      return o && e.w === o.w && ((sameId(e.a, o.a) && sameId(e.b, o.b)) || (sameId(e.a, o.b) && sameId(e.b, o.a)));
    });
  if (isPreset && lastNodesLayout) nodes = lastNodesLayout.map(n => ({...n}));
  renderAll(); $('editorHint').textContent = 'Algoritmo reiniciado.';
};

$('presetBtn').onclick = () => {
  nodes = structuredClone(initialNodes); edges = structuredClone(initialEdges);
  editMode = ''; pickedNode = null; $('editorHint').textContent = 'Ejercicio original cargado.';
  $('presetBtn').classList.add('active'); steps = []; stepIndex = 0;
  lastNodesLayout = nodes.map(n => ({...n}));
  
  $('curveEdgeBtn').classList.remove('active');
  $('editEdgesBtn').classList.remove('active');
  
  updateStart(); renderAll();
};

$('newGraphBtn').onclick = () => {
  nodes = []; edges = []; editMode = ''; pickedNode = null; $('presetBtn').classList.remove('active'); lastNodesLayout = null;
  
  $('curveEdgeBtn').classList.remove('active');
  $('editEdgesBtn').classList.remove('active');

  afterEdit('Grafo vacío.');
};

$('addNodeBtn').onclick = () => {
  let newId = nodes.length === 0 ? 1 : Math.max(...nodes.map(n => typeof n.id === 'number' ? n.id : 0)) + 1;
  let pos = null;
  for (let i = 0; i < 200 && !pos; i++){
    const p = { x: 50 + Math.random() * 800, y: 50 + Math.random() * 440 };
    if (nodes.every(n => Math.hypot(n.x - p.x, n.y - p.y) >= 55)) pos = p;
  }
  if (!pos) pos = { x: 450, y: 270 };
  nodes.push({ id: newId, x: pos.x, y: pos.y }); lastNodesLayout = nodes.map(n => ({...n}));
  $('presetBtn').classList.remove('active'); afterEdit(`Vértice ${newId} añadido.`);
};

$('editEdgesBtn').onclick = () => {
  editMode = editMode === 'connect' ? '' : 'connect'; pickedNode = null;
  $('editorHint').textContent = editMode ? 'Modo conectar: pulsa dos vértices.' : 'Edición desactivada.';
  $('editEdgesBtn').classList.toggle('active', editMode === 'connect'); 
  $('deleteNodeBtn').classList.remove('active');
  $('deleteEdgeBtn').classList.remove('active');
  renderGraph();
};

$('curveEdgeBtn').onclick = () => {
  const isActive = $('curveEdgeBtn').classList.toggle('active');
  if (isActive) {
    editMode = 'connect';
    $('editEdgesBtn').classList.add('active');
    $('deleteNodeBtn').classList.remove('active');
    $('deleteEdgeBtn').classList.remove('active');
    $('editorHint').textContent = 'Modo curvar activo: conecta dos vértices y la arista nacerá curva.';
  } else {
    $('editorHint').textContent = 'Modo curvar desactivado. Las aristas nacerán rectas.';
  }
  renderGraph();
};

$('deleteEdgeBtn').onclick = () => {
  editMode = editMode === 'delete' ? '' : 'delete'; pickedNode = null;
  $('editorHint').textContent = editMode ? 'Modo eliminar: pulsa la arista.' : 'Edición desactivada.';
  $('deleteEdgeBtn').classList.toggle('active', editMode === 'delete'); 
  $('editEdgesBtn').classList.remove('active'); 
  $('deleteNodeBtn').classList.remove('active'); 
  renderGraph();
};

$('deleteNodeBtn').onclick = () => {
  editMode = editMode === 'delete-node' ? '' : 'delete-node'; pickedNode = null;
  $('editorHint').textContent = editMode ? 'Modo eliminar vértice: pulsa el nodo.' : 'Edición desactivada.';
  $('deleteNodeBtn').classList.toggle('active', editMode === 'delete-node'); 
  $('editEdgesBtn').classList.remove('active'); 
  $('deleteEdgeBtn').classList.remove('active'); 
  renderGraph();
};

$('clearBtn').onclick = () => { 
  if (confirm('¿Vaciar el grafo?')){ 
    nodes = []; edges = []; $('presetBtn').classList.remove('active'); lastNodesLayout = null; 
    $('curveEdgeBtn').classList.remove('active');
    $('editEdgesBtn').classList.remove('active');
    afterEdit('Grafo vacío.'); 
  } 
};
$('restoreBtn').onclick = () => $('presetBtn').click();

$('downloadMatrix').onclick = () => {
  const ids = nodes.map(n => n.id), rows = [['V', ...ids]];
  ids.forEach(a => {
    const row = [a];
    ids.forEach(b => {
      if (sameId(a, b)){ row.push(0); return; }
      const e = edges.find(e => (sameId(e.a, a) && sameId(e.b, b)) || (sameId(e.b, a) && sameId(e.a, b)));
      row.push(e ? e.w : 0);
    });
    rows.push(row);
  });
  const blob = new Blob(['\ufeff' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'matriz.csv'; a.click();
};

function autoLayout(){
  if (nodes.length === 0) return;
  const SIM_W = 1600, SIM_H = 1200, CX = SIM_W / 2, CY = SIM_H / 2;
  const k = Math.sqrt((SIM_W * SIM_H) / Math.max(1, nodes.length)) * 0.8;
  nodes.forEach(n => { n.x = CX + (Math.random() - 0.5) * SIM_W * 0.8; n.y = CY + (Math.random() - 0.5) * SIM_H * 0.8; });
  for (let iter = 0; iter < 600; iter++){
    const temp = (1 - iter / 600) * 200;
    nodes.forEach(v => { v.dx = 0; v.dy = 0; });
    for (let i = 0; i < nodes.length; i++){
      for (let j = i + 1; j < nodes.length; j++){
        const v = nodes[i], u = nodes[j];
        let dx = v.x - u.x, dy = v.y - u.y, dist = Math.hypot(dx, dy) || 0.1;
        let force = (k * k * 1.5) / dist;
        v.dx += (dx / dist) * force; v.dy += (dy / dist) * force; u.dx -= (dx / dist) * force; u.dy -= (dy / dist) * force;
      }
    }
    edges.forEach(e => {
      const v = getNode(e.a), u = getNode(e.b); if (!v || !u) return;
      let dx = v.x - u.x, dy = v.y - u.y, dist = Math.hypot(dx, dy) || 0.1;
      let force = (dist * dist) / k;
      v.dx -= (dx / dist) * force; v.dy -= (dy / dist) * force; u.dx += (dx / dist) * force; u.dy += (dy / dist) * force;
    });
    nodes.forEach(v => {
      let dx = CX - v.x, dy = CY - v.y, dist = Math.hypot(dx, dy) || 0.1;
      v.dx += (dx / dist) * (dist * 0.1); v.dy += (dy / dist) * (dist * 0.1);
    });
    nodes.forEach(v => {
      let dist = Math.hypot(v.dx, v.dy) || 0.1, step = Math.min(dist, temp);
      v.x += (v.dx / dist) * step; v.y += (v.dy / dist) * step;
    });
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => { if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x; if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y; });
  const graphW = maxX - minX, graphH = maxY - minY, W = 900, H = 540, PADDING_X = 90, PADDING_Y = 70;
  const scale = Math.min(graphW > 0 ? (W - PADDING_X * 2) / graphW : 1, graphH > 0 ? (H - PADDING_Y * 2) / graphH : 1);
  const offsetX = PADDING_X + ((W - PADDING_X * 2) - graphW * scale) / 2, offsetY = PADDING_Y + ((H - PADDING_Y * 2) - graphH * scale) / 2;
  nodes.forEach(n => { n.x = offsetX + (n.x - minX) * scale; n.y = offsetY + (n.y - minY) * scale; });
}
$('autoFormatBtn').onclick = () => { autoLayout(); lastNodesLayout = nodes.map(n => ({...n})); renderAll(); $('editorHint').textContent = 'Auto-Fit aplicado.'; };

$('importExcelBtn').onclick = () => $('excelFileInput').click();
$('excelFileInput').addEventListener('change', (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      if (json.length < 2) { alert('Archivo vacío.'); return; }
      const headers = json[0].map(h => String(h).trim().toLowerCase());
      const idxO = headers.findIndex(h => h.includes('origen') || h.includes('source') || h === 'a');
      const idxD = headers.findIndex(h => h.includes('destino') || h.includes('target') || h === 'b');
      const idxP = headers.findIndex(h => h.includes('peso') || h.includes('weight') || h === 'w');
      if (idxO === -1 || idxD === -1) { alert('Faltan columnas "Origen" y "Destino".'); return; }
      const newEdges = [], nodeIds = new Set();
      for (let i = 1; i < json.length; i++){
        const row = json[i]; if (!row || row.length === 0) continue;
        const rawA = String(row[idxO] ?? '').trim(), rawB = String(row[idxD] ?? '').trim();
        if (!rawA || !rawB) continue;
        const a = (rawA !== '' && !isNaN(rawA)) ? Number(rawA) : rawA, b = (rawB !== '' && !isNaN(rawB)) ? Number(rawB) : rawB;
        if (sameId(a, b)) continue;
        let w = 1; if (idxP !== -1 && row[idxP] !== undefined){ const parsed = parseFloat(row[idxP]); if (!isNaN(parsed) && parsed >= 0) w = parsed; }
        
        newEdges.push({ a, b, w, isCurved: false, curveDir: 'up', curveOffset: 140 }); 
        nodeIds.add(a); nodeIds.add(b);
      }
      if (newEdges.length === 0) { alert('No hay aristas válidas.'); return; }
      const sortedIds = Array.from(nodeIds).sort((x, y) => {
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y);
        return typeof x === 'number' ? -1 : 1;
      });
      nodes = sortedIds.map(id => ({ id, x: 0, y: 0 })); edges = newEdges;
      autoLayout(); lastNodesLayout = nodes.map(n => ({...n})); steps = []; stepIndex = 0; editMode = ''; pickedNode = null;
      
      $('curveEdgeBtn').classList.remove('active');
      $('editEdgesBtn').classList.remove('active');
      
      $('presetBtn').classList.remove('active'); $('editorHint').textContent = `Grafo importado.`;
      updateStart(); chooseAlgorithm($('algorithm').value); switchView('graph'); renderAll();
    } catch (err) { console.error(err); alert('Error al leer el Excel.'); }
  };
  reader.readAsArrayBuffer(file); event.target.value = '';
});

/* ---------- IMPORTAR FOTO CON IA (GEMINI) ---------- */
const oldImageInput = $('imageFileInput');
const newImageInput = oldImageInput.cloneNode(true);
oldImageInput.parentNode.replaceChild(newImageInput, oldImageInput);

newImageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  $('editorHint').textContent = "Optimizando imagen...";

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 1200;
    const scale = Math.min(1, MAX_WIDTH / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    URL.revokeObjectURL(objectUrl);
    
    $('editorHint').textContent = "La IA está analizando la imagen...";
    let timeoutId;
    
    // MODELO ACTUALIZADO (gemini-3.5-flash es el que recomienda Google actualmente)
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analiza esta imagen de un grafo. Extrae todos los vértices (pueden ser números o letras), sus coordenadas X e Y aproximadas (escala de 0 a 1000), y las conexiones con sus pesos.
            Devuelve ÚNICAMENTE un JSON válido con esta estructura, sin texto extra de ningún tipo:
            {
              "nodes": [ {"id": "A", "x": 200, "y": 300}, {"id": "B", "x": 500, "y": 300} ],
              "edges": [ {"a": "A", "b": "B", "w": 5, "isCurved": false} ]
            }
            Si ves una arista curvada, pon "isCurved": true.` },
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }).then(res => res.json())
    .then(data => {
      clearTimeout(timeoutId);
      if (!data.candidates || !data.candidates[0].content) {
        throw new Error(JSON.stringify(data)); 
      }
      
      const textResponse = data.candidates[0].content.parts[0].text;
      const cleanJSON = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const graphData = JSON.parse(cleanJSON);

      if (!graphData.nodes || !graphData.edges) throw new Error('El formato de la IA era incorrecto.');

      nodes = graphData.nodes.map(n => ({ 
        id: n.id, x: (n.x / 1000) * 800 + 50, y: (n.y / 1000) * 440 + 50 
      }));
      edges = graphData.edges.map(e => ({ 
        a: e.a, b: e.b, w: e.w, isCurved: e.isCurved || false, curveDir: 'up', curveOffset: 160 
      }));

      lastNodesLayout = nodes.map(n => ({...n}));
      steps = []; stepIndex = 0; 
      updateStart(); chooseAlgorithm($('algorithm').value); switchView('graph'); renderAll();
      
      $('editorHint').textContent = `¡Foto analizada con éxito! (${nodes.length} vértices).`;
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.error("Error de IA:", err);
      
      // NO SE CARGA NINGÚN PLAN B. Solo muestra el error.
      alert("No se pudo leer la imagen nueva.\n\nError de Google: " + err.message + "\n\nSi el error dice '429' o 'quota', espera 1 minuto y vuelve a intentarlo.");
      $('editorHint').textContent = "Error al analizar. Vuelve a intentarlo.";
    });
    
    timeoutId = setTimeout(() => {
      throw new Error('TIMEOUT');
    }, 25000);

  };
  
  img.src = objectUrl;
  event.target.value = '';
});

$('importImageBtn').onclick = () => $('imageFileInput').click();

// Inicialización
updateStart(); chooseAlgorithm('prim'); switchView('graph'); lastNodesLayout = nodes.map(n => ({...n}));