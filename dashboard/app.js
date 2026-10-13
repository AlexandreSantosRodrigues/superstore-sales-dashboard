const DATA_URL = './data/superstore-month-region-category.json';
const EXPECTED = { rows: 573, lines: 9994, sales: 22972008603, profit: 2863970217 };
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const compact = value => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const integer = value => new Intl.NumberFormat('pt-BR').format(value);
const percent = value => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
const $ = selector => document.querySelector(selector);
const svgNS = 'http://www.w3.org/2000/svg';
let allRows = [];

function svg(tag, attributes = {}, parent) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (parent) parent.appendChild(node);
  return node;
}

function assertData(data) {
  if (data.schema !== 'superstore-month-region-category/v1' || data.scale !== 10000 || data.rows.length !== EXPECTED.rows) throw Error('Esquema ou número de grupos inesperado.');
  const keys = new Set();
  let lines = 0, sales = 0, profit = 0;
  for (const row of data.rows) {
    if (!Array.isArray(row) || row.length !== 7 || !/^201[4-7]-(0[1-9]|1[0-2])$/.test(row[0]) || row.slice(3).some(x => !Number.isSafeInteger(x))) throw Error('Linha de dados inválida.');
    const key = row.slice(0, 3).join('|');
    if (keys.has(key)) throw Error('Grupo mensal duplicado.');
    keys.add(key); lines += row[3]; sales += row[5]; profit += row[6];
  }
  if (lines !== EXPECTED.lines || sales !== EXPECTED.sales || profit !== EXPECTED.profit) throw Error('Totais do JSON não conciliam com o Databricks.');
  return data.rows.map(([month, region, category, orderLines, units, salesFixed, profitFixed]) => ({ month, region, category, orderLines, units, salesFixed, profitFixed }));
}

function options(id, values) {
  const select = $(id);
  for (const value of [...new Set(values)].sort()) {
    const option = document.createElement('option'); option.value = value; option.textContent = value;
    select.appendChild(option);
  }
}

function aggregate(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const name = row[key];
    const entry = grouped.get(name) || { name, salesFixed: 0, profitFixed: 0, orderLines: 0, units: 0 };
    entry.salesFixed += row.salesFixed; entry.profitFixed += row.profitFixed;
    entry.orderLines += row.orderLines; entry.units += row.units;
    grouped.set(name, entry);
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function monthlySeries(rows, selectedYear) {
  const groups = new Map(aggregate(rows, 'month').map(group => [group.name, group]));
  const months = [];
  for (let year = selectedYear === 'all' ? 2014 : Number(selectedYear); year <= (selectedYear === 'all' ? 2017 : Number(selectedYear)); year++) {
    for (let month = 1; month <= 12; month++) {
      const name = `${year}-${String(month).padStart(2, '0')}`;
      months.push(groups.get(name) || { name, salesFixed: 0, profitFixed: 0, orderLines: 0, units: 0, observed: false });
    }
  }
  return months;
}

function margin(row) { return row.salesFixed ? 100 * row.profitFixed / row.salesFixed : 0; }
function render() {
  const year = $('#year-filter').value, region = $('#region-filter').value, category = $('#category-filter').value;
  const rows = allRows.filter(row => (year === 'all' || row.month.startsWith(year)) && (region === 'all' || row.region === region) && (category === 'all' || row.category === category));
  const total = rows.reduce((a, r) => ({ salesFixed: a.salesFixed + r.salesFixed, profitFixed: a.profitFixed + r.profitFixed, orderLines: a.orderLines + r.orderLines }), { salesFixed: 0, profitFixed: 0, orderLines: 0 });
  $('#sales-kpi').textContent = money(total.salesFixed / 10000);
  $('#profit-kpi').textContent = money(total.profitFixed / 10000);
  $('#margin-kpi').textContent = percent(margin(total));
  $('#lines-kpi').textContent = integer(total.orderLines);
  $('#selection-caption').textContent = [year === 'all' ? '2014–2017' : year, region === 'all' ? 'Todas as regiões' : region, category === 'all' ? 'Todas as categorias' : category].join(' · ');
  renderChart(monthlySeries(rows, year));
  renderBars(aggregate(rows, 'category'), total.salesFixed);
  renderRegions(aggregate(rows, 'region'));
}

function renderBars(groups, totalSales) {
  const container = $('#category-bars'); container.replaceChildren();
  if (!groups.length) { container.textContent = 'Sem dados para o filtro.'; return; }
  const max = Math.max(...groups.map(g => g.salesFixed), 1);
  for (const g of groups.sort((a, b) => b.salesFixed - a.salesFixed)) {
    const item = document.createElement('div'); item.className = 'bar-row';
    const meta = document.createElement('div'); meta.className = 'bar-meta';
    const name = document.createElement('b'); name.textContent = g.name;
    const value = document.createElement('span'); value.textContent = money(g.salesFixed / 10000);
    meta.append(name, value);
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = `${100 * g.salesFixed / max}%`; track.append(fill);
    const sub = document.createElement('div'); sub.className = 'bar-sub';
    sub.textContent = `${percent(totalSales ? 100 * g.salesFixed / totalSales : 0)} da receita · margem ${percent(margin(g))}`;
    item.append(meta, track, sub); container.append(item);
  }
}

function renderRegions(groups) {
  const container = $('#region-list'); container.replaceChildren();
  if (!groups.length) { container.textContent = 'Sem dados para o filtro.'; return; }
  const max = Math.max(...groups.map(g => g.salesFixed), 1);
  for (const g of groups.sort((a, b) => b.salesFixed - a.salesFixed)) {
    const row = document.createElement('div'); row.className = 'region-row';
    const name = document.createElement('b'); name.textContent = g.name;
    const track = document.createElement('div'); track.className = 'mini-track';
    const bar = document.createElement('i'); bar.style.width = `${100 * g.salesFixed / max}%`; track.append(bar);
    const amount = document.createElement('span'); amount.className = 'amount'; amount.textContent = compact(g.salesFixed / 10000);
    const rate = document.createElement('span'); rate.className = `margin${margin(g) < 0 ? ' negative' : ''}`; rate.textContent = percent(margin(g));
    row.append(name, track, amount, rate); container.append(row);
  }
}

function renderChart(months) {
  const root = $('#trend-chart'); root.replaceChildren(); root.setAttribute('viewBox', '0 0 1000 270');
  const tooltip = $('#chart-tooltip'); tooltip.hidden = true;
  if (!months.length) return;
  const left = 55, right = 944, top = 17, bottom = 226;
  const salesMax = Math.max(...months.map(m => m.salesFixed / 10000), 1) * 1.14;
  const profitValues = months.map(m => m.profitFixed / 10000);
  const profitMin = Math.min(0, ...profitValues), profitMax = Math.max(1, ...profitValues);
  const profitSpan = (profitMax - profitMin) * 1.12 || 1;
  const x = i => left + (right - left) * (months.length === 1 ? .5 : i / (months.length - 1));
  const ySales = m => bottom - (m.salesFixed / 10000 / salesMax) * (bottom - top);
  const yProfit = m => bottom - ((m.profitFixed / 10000 - profitMin) / profitSpan) * (bottom - top);
  for (let i = 0; i <= 4; i++) {
    const y = bottom - i * (bottom - top) / 4;
    svg('line', { x1:left, x2:right, y1:y, y2:y, stroke:'#2b3950', 'stroke-dasharray':i === 0 ? '0' : '3 5' }, root);
    const t = svg('text', { x: left - 9, y:y + 4, 'text-anchor':'end' }, root); t.textContent = compact(salesMax * i / 4);
    const p = svg('text', { x: right + 8, y:y + 4 }, root); p.textContent = compact(profitMin + profitSpan * i / 4);
  }
  const tickEvery = months.length > 24 ? 6 : months.length > 12 ? 3 : 1;
  months.forEach((m, i) => {
    if (i % tickEvery === 0 || i === months.length - 1) {
      const t = svg('text', { x:x(i), y:251, 'text-anchor':'middle' }, root);
      t.textContent = m.name.slice(5) + '/' + m.name.slice(2, 4);
    }
  });
  const salesPath = months.map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${ySales(m).toFixed(2)}`).join(' ');
  const area = `${salesPath} L${x(months.length - 1)},${bottom} L${x(0)},${bottom} Z`;
  const defs = svg('defs', {}, root), gradient = svg('linearGradient', { id:'area-gradient', x1:'0', y1:'0', x2:'0', y2:'1' }, defs);
  svg('stop', { offset:'0%', 'stop-color':'#61e3d3', 'stop-opacity':'.21' }, gradient);
  svg('stop', { offset:'100%', 'stop-color':'#61e3d3', 'stop-opacity':'0' }, gradient);
  svg('path', { d:area, fill:'url(#area-gradient)' }, root);
  svg('path', { d:salesPath, fill:'none', stroke:'#61e3d3', 'stroke-width':2.5, 'vector-effect':'non-scaling-stroke' }, root);
  svg('path', { d:months.map((m,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${yProfit(m).toFixed(2)}`).join(' '), fill:'none', stroke:'#aa97f6', 'stroke-width':2, 'vector-effect':'non-scaling-stroke' }, root);
  const guide = svg('line', { x1:0, x2:0, y1:top, y2:bottom, stroke:'#8195a9', 'stroke-dasharray':'4 4', visibility:'hidden' }, root);
  months.forEach((m, i) => {
    const hit = svg('rect', { x:x(i) - Math.max(9, (right-left) / months.length / 2), y:top, width:Math.max(18,(right-left)/months.length), height:bottom-top, fill:'transparent' }, root);
    hit.addEventListener('pointerenter', () => {
      guide.setAttribute('x1', x(i)); guide.setAttribute('x2', x(i)); guide.setAttribute('visibility','visible');
      tooltip.replaceChildren();
      const title = document.createElement('b'); title.textContent = m.name;
      tooltip.append(title, document.createElement('br'), `Vendas: ${money(m.salesFixed / 10000)}`, document.createElement('br'), `Lucro: ${money(m.profitFixed / 10000)}`);
      if (m.observed === false) tooltip.append(document.createElement('br'), 'Nenhum item registrado neste recorte');
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(75, Math.max(4, x(i) / 10))}%`;
      tooltip.style.top = '15%';
    });
    hit.addEventListener('pointerleave', () => { guide.setAttribute('visibility','hidden'); tooltip.hidden = true; });
  });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw Error(`Não foi possível carregar o JSON (${response.status}).`);
    allRows = assertData(await response.json());
    options('#year-filter', allRows.map(r => r.month.slice(0, 4)));
    options('#region-filter', allRows.map(r => r.region));
    options('#category-filter', allRows.map(r => r.category));
    for (const id of ['#year-filter','#region-filter','#category-filter']) $(id).addEventListener('change', render);
    $('#reset-filters').addEventListener('click', () => { for (const id of ['#year-filter','#region-filter','#category-filter']) $(id).value = 'all'; render(); });
    render();
  } catch (error) { $('#data-error').hidden = false; $('#data-error').textContent = `Falha na validação dos dados: ${error.message}`; }
}
init();
