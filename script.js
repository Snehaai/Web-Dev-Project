/* Frontend logic:
 - mood selection
 - creating entries via POST /api/entries
 - fetching entries via GET /api/entries
 - deleting entries via DELETE /api/entries/:id
 - building mood chart for last 7 days
*/

const API_BASE = 'http://localhost:9000/api'; // change if needed

let selectedMood = null;
const moodButtons = document.querySelectorAll('.mood');
const saveBtn = document.getElementById('saveBtn');
const entryText = document.getElementById('entryText');
const entriesList = document.getElementById('entriesList');
const avgMoodEl = document.getElementById('avgMood');
const trendChangeEl = document.getElementById('trendChange');
const ctx = document.getElementById('moodChart').getContext('2d');
let moodChart = null;

// mood buttons selection
moodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    moodButtons.forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = Number(btn.dataset.mood); // 1..5
  });
});

// Save entry
saveBtn.addEventListener('click', async () => {
  const text = entryText.value.trim();
  if (!selectedMood) {
    alert('Please select a mood (emoji).');
    return;
  }
  if (!text) {
    alert('Please write something about your day.');
    return;
  }

  saveBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, mood: selectedMood })
    });
    if (!res.ok) throw new Error('Failed to save');
    entryText.value = '';
    moodButtons.forEach(b=>b.classList.remove('selected'));
    selectedMood = null;
    await loadEntries();
  } catch (e) {
    console.error(e);
    alert('Could not save entry. Is the server running?');
  } finally {
    saveBtn.disabled = false;
  }
});

// load entries & draw chart
async function loadEntries(){
  try{
    const res = await fetch(`${API_BASE}/entries`);
    const data = await res.json();
    renderEntries(data);
    drawMoodChart(data);
  }catch(e){
    console.error(e);
    entriesList.innerHTML = '<div style="color:#666">Unable to fetch entries. Start the server.</div>';
  }
}

// render past entries (most recent first)
function renderEntries(entries){
  if (!Array.isArray(entries)) entries=[];
  entries.sort((a,b)=>new Date(b.createdAt) - new Date(a.createdAt));
  entriesList.innerHTML = '';
  for(const entry of entries){
    const d = new Date(entry.createdAt);
    const dateStr = d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    const item = document.createElement('div');
    item.className='entry';
    item.innerHTML = `
      <div class="icon">📅</div>
      <div class="meta">
        <h4>${dateStr}</h4>
        <p>${escapeHtml(entry.text)}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div style="font-size:20px">${moodEmoji(entry.mood)}</div>
        <button class="del" data-id="${entry._id}">Delete</button>
      </div>
    `;
    entriesList.appendChild(item);
  }

  // attach delete events
  document.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Delete this entry?')) return;
      btn.disabled = true;
      await fetch(`${API_BASE}/entries/${id}`, { method:'DELETE' });
      await loadEntries();
    });
  });
}

// draw mood trend for last 7 days
function drawMoodChart(entries){
  // group entries per day (last 7 days)
  const today = new Date();
  const dates = [];
  for(let i=6;i>=0;i--){
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDateKey(d));
  }
  const moodMap = {};
  for(const e of entries){
    const key = formatDateKey(new Date(e.createdAt));
    moodMap[key] = moodMap[key] || [];
    moodMap[key].push(e.mood);
  }
  const averages = dates.map(k=>{
    const arr = moodMap[k] || [];
    if (arr.length===0) return null;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  });

  // compute overall average and percent change vs previous 7 (basic)
  const valid = averages.filter(v=>v!=null);
  const avg = valid.length? (valid.reduce((a,b)=>a+b,0)/valid.length) : null;
  avgMoodEl.textContent = avg? `Average: ${round(avg,1)}` : 'Average: —';

  // chart data: show 0..5 scale, nulls cause gaps
  const chartData = averages.map(v=> v===null ? null : round(v,2));
  if (moodChart) moodChart.destroy();
  moodChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: dates.map(d=>shortDayLabel(d)),
      datasets:[{
        data: chartData,
        fill:true,
        tension:0.45,
        borderWidth:2,
        pointRadius:0
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{
        y:{display:false},
        x:{grid:{display:false}, ticks:{color:'#777'}}
      },
      elements:{line:{borderColor:'#6b6b6b',backgroundColor:'rgba(107,107,107,0.06)'}}
    }
  });
}

// helpers
function moodEmoji(m){
  return {1:'😄',2:'🙂',3:'😐',4:'😔',5:'😩'}[m] || '—';
}
function formatDateKey(d){
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}
function shortDayLabel(key){
  const parts = key.split('-');
  const d = new Date(parts[0], parts[1]-1, parts[2]);
  return d.toLocaleDateString(undefined,{weekday:'short'});
}
function round(v, n=1){
  const p = Math.pow(10,n); return Math.round(v*p)/p;
}
function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// initial load
loadEntries();
