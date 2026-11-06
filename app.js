'use strict';
/* Rapport Frigotec — versão para celular (PWA).
   Mesmo formato de dados do editor de PC (JSON v2, embutido no PDF na chave RapportFrigotecData),
   então rapports feitos aqui abrem no PC e vice-versa. */

const APP_VERSION = '1.0.2';
const PW = 595.276, PH = 841.89;
const DATA_KEY = 'RapportFrigotecData';
const LANGS = ['en', 'de', 'es'];
const SIG_BOX = { x: 365, y: 20, w: 54 };
const DRAW_BOX = { cliente: { x0: 40, x1: 222, y0: 37, y1: 84 }, tecnico: { x0: 334, x1: 516, y0: 37, y1: 84 } };
const HEAD_TXT = ['Client', 'Client_line_1', 'Client_line_2', 'Client_line_3', 'Job_number', 'Responsible_technician', 'Report_No', 'System_designation'];
const TOTAL_EXTRA = ['Total_Outbound_travel', 'Total_Return_travel', 'Total_25pct', 'Total_50pct', 'Total_100pct', 'Total_Allowance', 'Total_Km_round'];
const REPORT_W = 557.5 - 37.5 - 3.2, REPORT_SIZE = 9;
const FIELD = Object.fromEntries(FIELDS.map(f => [f.n, f]));

let lang = 'en';
let HELV = null;               // fonte Helvetica do pdf-lib, para medir larguras
const $ = id => document.getElementById(id);

/* ------------------------------------------------------------------ util */
const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M18 6L6 18M6 6l12 12"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  check: '<path d="M20 6L9 17l-5-5"/>', pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
  plane: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13l4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  note: '<path d="M4 6h16M4 12h16M4 18h10"/>', box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  down: '<path d="M6 9l6 6 6-6"/>', alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  wrap: '<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-5M4 18h4"/><path d="M14 16l-2 2 2 2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', later: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function icon(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const pad2 = n => String(n).padStart(2, '0');
function pref(k, v) {
  try { if (v === undefined) return localStorage.getItem('rp_' + k); localStorage.setItem('rp_' + k, v); } catch (e) { return null; }
}
let toastT;
function toast(msg, cls, ms) {
  const t = $('toast'); t.textContent = msg; t.className = 'show ' + (cls || '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = cls || ''; }, ms || 3800);
}
function t(k, ...a) { const v = (I18N[lang] || I18N.en)[k] ?? I18N.en[k]; return typeof v === 'function' ? v(...a) : (v ?? k); }

/* ------------------------------------------------------------------ datas e horas */
function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function parseDateTxt(v) {          // texto do formulário -> {d,m,y|null} | null | NaN
  const s = (v || '').trim(); if (!s) return null;
  const r = s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?$/) || s.match(/^(\d{2})(\d{2})(\d{2}|\d{4})?$/);
  if (!r) return NaN;
  const d = +r[1], m = +r[2]; if (d < 1 || d > 31 || m < 1 || m > 12) return NaN;
  return { d, m, y: r[3] ? (r[3].length === 2 ? 2000 + +r[3] : +r[3]) : null };
}
function txtToISO(v, fy) { const o = parseDateTxt(v); if (!o || isNaN(o.d)) return ''; return (o.y || fy || new Date().getFullYear()) + '-' + pad2(o.m) + '-' + pad2(o.d); }
function isoToTxt(iso, full, L) {
  if (!iso) return ''; const [y, m, d] = iso.split('-'); const sp = (L || lang) === 'de' ? '.' : '/';
  return d + sp + m + sp + (full ? y : y.slice(2));
}
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function parseT(v, clock) {         // minutos | null (vazio) | NaN (inválido)
  v = (v || '').trim().toLowerCase(); if (!v) return null;
  let r, h, m;
  if ((r = v.match(/^(\d{1,3})\s*[:h.,]\s*(\d{1,2})?$/))) { h = +r[1]; m = r[2] ? +r[2] : 0; }
  else if ((r = v.match(/^(\d{1,2})$/))) { h = +r[1]; m = 0; }
  else if ((r = v.match(/^(\d{1,2})(\d{2})$/))) { h = +r[1]; m = +r[2]; }
  else return NaN;
  if (m > 59 || (clock && h > 23)) return NaN;
  return h * 60 + m;
}
const hmStr = min => pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
const num = x => (x === null || Number.isNaN(x)) ? null : x;

/* ------------------------------------------------------------------ modelo de dados do celular
   doc = { idioma, head{...,Date(ISO),office 0-3}, report[linhas], times[{date,dateRaw,tech,ob,s,e,rt,total,p25,p50,p100,allow,km}],
           material[{qty,desc,item,price}], totals{Total_*}, sig{tecnico,cliente}, assinar, fileName } */
function blankDoc() {
  return {
    idioma: lang,
    head: { Client: '', Client_line_1: '', Client_line_2: '', Client_line_3: '', Date: todayISO(), DateRaw: '', Job_number: '',
            Responsible_technician: pref('tech') || '', Report_No: todayISO().split('-').reverse().join(''), System_designation: '',
            office: +(pref('office') || 0) },
    report: [], times: [], material: [], totals: {}, sig: { tecnico: null, cliente: null }, assinar: false, fileName: ''
  };
}
const TIME_KEYS = ['date', 'dateRaw', 'tech', 'ob', 's', 'e', 'rt', 'total', 'p25', 'p50', 'p100', 'allow', 'km'];
const emptyTime = r => !TIME_KEYS.some(k => String(r[k] || '').trim());
const emptyMat = m => !['qty', 'desc', 'item', 'price'].some(k => String(m[k] || '').trim());
function trimEnd(a, isEmpty) { let n = a.length; while (n > 0 && isEmpty(a[n - 1])) n--; return a.slice(0, n); }
function layout(d) {
  const rep = trimEnd(d.report, l => !String(l).trim()), tm = trimEnd(d.times, emptyTime), mt = trimEnd(d.material, emptyMat);
  return { rep, tm, mt, n: Math.max(1, Math.ceil(rep.length / 8), Math.ceil(tm.length / 8), Math.ceil(mt.length / 13)) };
}
function rowCalc(r) {
  const S = num(parseT(r.s, true)), E = num(parseT(r.e, true)), OB = num(parseT(r.ob)), RT = num(parseT(r.rt));
  const auto = [r.s, r.e, r.ob, r.rt].some(v => String(v || '').trim());
  if (!auto) return { auto: false, total: num(parseT(r.total)), work: null, S: null };
  let work = null; if (S !== null && E !== null) { work = E - S; if (work < 0) work += 1440; }
  const travel = (OB || 0) + (RT || 0);
  return { auto: true, work, S, travel, total: (work !== null || travel) ? (work || 0) + travel : null };
}
// Grand total: no mesmo dia, horários de trabalho sobrepostos contam uma vez só; viagens entram inteiras.
function calcAll(times) {
  const rows = times.map(rowCalc), days = new Map(); let grand = 0, any = false;
  rows.forEach((c, i) => {
    if (c.total === null) return;
    any = true;
    if (!c.auto) { grand += c.total; return; }
    grand += c.travel;
    if (c.work !== null) {
      const r = times[i], key = r.date || ('#' + i);
      if (!days.has(key)) days.set(key, { date: r.date, iv: [] });
      days.get(key).iv.push([c.S, c.S + c.work]);
    }
  });
  const overlaps = [];
  for (const d of days.values()) {
    d.iv.sort((a, b) => a[0] - b[0]);
    let raw = 0, uni = 0, cs = null, ce = null;
    for (const [a, b] of d.iv) { raw += b - a; if (cs === null || a > ce) { if (cs !== null) uni += ce - cs; cs = a; ce = b; } else ce = Math.max(ce, b); }
    if (cs !== null) uni += ce - cs;
    grand += uni;
    if (raw > uni) overlaps.push({ min: raw - uni, date: d.date });
  }
  return { rows, grand, any, overlaps };
}
function autoName(d) { return ['Rapport', d.head.Client.trim(), d.head.Report_No.trim()].filter(Boolean).join(' '); }
function fileNameOf(d) { return ((d.fileName || '').trim() || autoName(d)).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Rapport'; }

// celular -> formato do PC (JSON v2)
function toDoc(d) {
  const L = d.idioma, { rep, tm, mt, n } = layout(d);
  const set = (o, k, v) => { if (v !== undefined && v !== null && String(v).trim() !== '') o[k] = String(v); };
  const comuns = {};
  for (const k of HEAD_TXT) set(comuns, k, d.head[k]);
  set(comuns, 'Date', d.head.Date ? isoToTxt(d.head.Date, true, L) : d.head.DateRaw);
  if (d.head.office) comuns['Office_' + d.head.office] = true;
  const folhas = Array.from({ length: n }, () => ({}));
  rep.forEach((l, i) => set(folhas[Math.floor(i / 8)], 'Report_line_' + (i % 8 + 1), l));
  const calc = calcAll(tm); let last = -1;
  tm.forEach((r, i) => {
    const f = folhas[Math.floor(i / 8)], p = 'Times_row' + (i % 8 + 1) + '_', c = calc.rows[i];
    set(f, p + 'Date', r.date ? isoToTxt(r.date, false, L) : r.dateRaw);
    set(f, p + 'Technician', r.tech); set(f, p + 'Outbound_travel', r.ob); set(f, p + 'Work_time_start', r.s);
    set(f, p + 'Work_time_end', r.e); set(f, p + 'Return_travel', r.rt);
    if (c.total !== null) { f[p + 'Total_hours'] = hmStr(c.total); last = i; }
    set(f, p + '25pct', r.p25); set(f, p + '50pct', r.p50); set(f, p + '100pct', r.p100);
    set(f, p + 'Allowance', r.allow); set(f, p + 'Km_round', r.km);
  });
  const gs = last >= 0 ? Math.floor(last / 8) : Math.max(0, Math.ceil(tm.length / 8) - 1);
  if (calc.any) folhas[gs].Total_Total_hours = hmStr(calc.grand);
  for (const k of TOTAL_EXTRA) set(folhas[gs], k, d.totals[k]);
  mt.forEach((m, i) => {
    const f = folhas[Math.floor(i / 13)], p = 'Material_row' + (i % 13 + 1) + '_';
    set(f, p + 'Qty', m.qty); set(f, p + 'Description', m.desc); set(f, p + 'Item_No', m.item); set(f, p + 'Price', m.price);
  });
  const ass = {}; for (const k of ['tecnico', 'cliente']) if (d.sig[k]) ass[k] = d.sig[k];
  return { _programa: 'Editor de Rapport Frigotec', _versao: 2, _origem: 'celular ' + APP_VERSION, idioma: L, comuns, folhas,
           assinar: !!d.assinar, assinaturas: ass, nomeArquivo: fileNameOf(d) };
}
// formato do PC -> celular (mantém linhas vazias no meio, para o PDF sair igual)
function fromDoc(j) {
  let comuns = j.comuns || {}, folhas = j.folhas;
  if (!folhas && j.campos) {
    const SH = new Set([...HEAD_TXT, 'Date', 'Office_1', 'Office_2', 'Office_3']); comuns = {}; const f1 = {};
    for (const [k, v] of Object.entries(j.campos)) if (k !== 'Page') (SH.has(k) ? comuns : f1)[k] = v;
    folhas = [f1];
  }
  folhas = folhas && folhas.length ? folhas : [{}];
  const d = blankDoc();
  d.idioma = LANGS.includes(j.idioma) ? j.idioma : 'en';
  for (const k of HEAD_TXT) d.head[k] = comuns[k] || '';
  const hd = parseDateTxt(comuns.Date), fy = hd && !isNaN(hd.d) && hd.y ? hd.y : null;
  d.head.Date = txtToISO(comuns.Date, fy); d.head.DateRaw = d.head.Date ? '' : (comuns.Date || '');
  d.head.office = [1, 2, 3].find(i => comuns['Office_' + i]) || 0;
  d.report = []; d.times = []; d.material = []; d.totals = {};
  for (const f of folhas) {
    for (let i = 1; i <= 8; i++) d.report.push(f['Report_line_' + i] || '');
    for (let i = 1; i <= 8; i++) {
      const p = 'Times_row' + i + '_', dt = f[p + 'Date'] || '', iso = txtToISO(dt, fy);
      d.times.push({ date: iso, dateRaw: iso ? '' : dt, tech: f[p + 'Technician'] || '', ob: f[p + 'Outbound_travel'] || '',
        s: f[p + 'Work_time_start'] || '', e: f[p + 'Work_time_end'] || '', rt: f[p + 'Return_travel'] || '', total: f[p + 'Total_hours'] || '',
        p25: f[p + '25pct'] || '', p50: f[p + '50pct'] || '', p100: f[p + '100pct'] || '', allow: f[p + 'Allowance'] || '', km: f[p + 'Km_round'] || '' });
    }
    for (let i = 1; i <= 13; i++) {
      const p = 'Material_row' + i + '_';
      d.material.push({ qty: f[p + 'Qty'] || '', desc: f[p + 'Description'] || '', item: f[p + 'Item_No'] || '', price: f[p + 'Price'] || '' });
    }
    for (const k of TOTAL_EXTRA) if (f[k]) d.totals[k] = f[k];
  }
  d.report = trimEnd(d.report, l => !l.trim()); d.times = trimEnd(d.times, emptyTime); d.material = trimEnd(d.material, emptyMat);
  d.sig = { tecnico: (j.assinaturas || {}).tecnico || null, cliente: (j.assinaturas || {}).cliente || null };
  d.assinar = !!j.assinar;
  d.fileName = j.nomeArquivo && j.nomeArquivo !== autoName(d) ? j.nomeArquivo : '';
  return d;
}

/* ------------------------------------------------------------------ PDF */
const TPL = {};
async function template(L) {
  if (!TPL[L]) TPL[L] = new Uint8Array(await (await fetch('forms/blank_' + L + '.pdf')).arrayBuffer());
  return TPL[L];
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function safeText(font, s) { let o = ''; for (const ch of s) { try { font.encodeText(ch); o += ch; } catch (e) { o += '?'; } } return o; }
function fitSize(text, f) {
  if (!HELV) return f.s;
  const maxW = (f.x1 - f.x0) - 3.2; let size = f.s;
  while (size > 4.5 && HELV.widthOfTextAtSize(text, size) > maxW) size -= 0.25;
  return size;
}
async function buildPdf(doc) {
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFHexString } = PDFLib;
  const blank = await PDFDocument.load(await template(doc.idioma));
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const imgs = {};
  for (const [k, v] of Object.entries(doc.assinaturas || {})) if (v) imgs[k] = await out.embedPng(b64ToBytes(v.split(',')[1]));
  let legacy = null; const localSig = pref('sig');
  if (doc.assinar && localSig && !imgs.tecnico) legacy = await out.embedPng(b64ToBytes(localSig.split(',')[1]));
  const n = doc.folhas.length;
  for (let p = 0; p < n; p++) {
    const [tp] = await out.copyPages(blank, [0]); const pg = out.addPage(tp);
    const vals = Object.assign({}, doc.comuns, doc.folhas[p]); vals.Page = (p + 1) + '/' + n;
    for (const f of FIELDS) {
      const v = vals[f.n]; if (!v) continue;
      if (f.t === '/Btn') {
        const q = 2.2;
        pg.drawLine({ start: { x: f.x0 + q, y: f.y0 + q }, end: { x: f.x1 - q, y: f.y1 - q }, thickness: 1, color: rgb(0, 0, 0) });
        pg.drawLine({ start: { x: f.x0 + q, y: f.y1 - q }, end: { x: f.x1 - q, y: f.y0 + q }, thickness: 1, color: rgb(0, 0, 0) });
        continue;
      }
      const text = safeText(font, String(v)), maxW = (f.x1 - f.x0) - 3.2; let size = f.s;
      while (size > 4.5 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.25;
      pg.drawText(text, { x: f.x0 + 1.6, y: f.y0 + ((f.y1 - f.y0) - size * 0.72) / 2, size, font, color: rgb(0, 0, 0) });
    }
    if (legacy) pg.drawImage(legacy, { x: SIG_BOX.x, y: SIG_BOX.y, width: SIG_BOX.w, height: SIG_BOX.w * legacy.height / legacy.width });
    for (const [k, img] of Object.entries(imgs)) {
      const b = DRAW_BOX[k], bw = b.x1 - b.x0, bh = b.y1 - b.y0, sc = Math.min(bw / img.width, bh / img.height);
      pg.drawImage(img, { x: b.x0 + (bw - img.width * sc) / 2, y: b.y0, width: img.width * sc, height: img.height * sc });
    }
  }
  out.setTitle(doc.nomeArquivo || 'Rapport'); out.setProducer('Editor de Rapport Frigotec (celular)');
  out.setLanguage({ de: 'de-DE', es: 'es-ES' }[doc.idioma] || 'en');
  out.getInfoDict().set(PDFName.of(DATA_KEY), PDFHexString.fromText(JSON.stringify(doc)));
  return await out.save();
}
async function readFileData(file) {
  if (/\.json$/i.test(file.name) || file.type === 'application/json') return { data: JSON.parse(await file.text()), pdf: null };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
  const v = pdf.getInfoDict().lookup(PDFLib.PDFName.of(DATA_KEY));
  if (!v) throw new Error(t('notOurPdf'));
  return { data: JSON.parse(v.decodeText()), pdf: new Blob([bytes], { type: 'application/pdf' }) };
}

/* ------------------------------------------------------------------ banco local (IndexedDB) */
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('rapportCelular', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rapports', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tr = db.transaction('rapports', mode), st = tr.objectStore('rapports'); const out = fn(st);
      tr.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined); tr.onerror = () => rej(tr.error);
    });
  },
  all() { return this.tx('readonly', st => st.getAll()); },
  get(id) { return this.tx('readonly', st => st.get(id)); },
  put(rec) { return this.tx('readwrite', st => st.put(rec)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); }
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ------------------------------------------------------------------ navegação (botão voltar do Android) */
const stack = ['home'];
let screen = 'home';
function showScreen(name) {
  for (const s of ['home', 'editor', 'preview']) $(s).hidden = s !== name;
  screen = name; window.scrollTo(0, 0);
}
function push(name) { stack.push(name); history.pushState({ idx: stack.length - 1 }, ''); }
function replaceTop(name) { stack[stack.length - 1] = name; }
function back() { history.back(); }
window.addEventListener('popstate', e => {
  const target = e.state && typeof e.state.idx === 'number' ? e.state.idx : 0;
  while (stack.length - 1 > target) undo(stack.pop());
});
function undo(what) {
  if (what === 'sheet') hideSheet();
  else if (what === 'pad') hidePad();
  else if (what === 'preview') showScreen('editor');
  else if (what === 'editor') { flushSave(); cur = null; renderHome(); showScreen('home'); }
}

/* ------------------------------------------------------------------ idioma */
function setLang(l, fromUser) {
  lang = LANGS.includes(l) ? l : 'en';
  document.documentElement.lang = lang;
  pref('lang', lang);
  if (cur && fromUser) { cur.doc.idioma = lang; touch(); }
  applyStatic();
  if (screen === 'home') renderHome();
  if (cur) { renderEditor(); if (screen === 'preview') renderPreview(); }
}
function applyStatic() {
  document.title = t('appName');
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  for (const e of document.querySelectorAll('[data-tl]')) e.setAttribute('aria-label', t(e.dataset.tl));
  for (const e of document.querySelectorAll('[data-icon]')) if (!e.firstElementChild) e.insertAdjacentHTML('afterbegin', icon(e.dataset.icon));
  for (const e of document.querySelectorAll('[data-icon-before]')) if (!e.querySelector('svg')) e.insertAdjacentHTML('afterbegin', icon(e.dataset.iconBefore));
  for (const box of document.querySelectorAll('[data-langs]')) {
    box.innerHTML = '';
    for (const L of LANGS) box.append(el('button', { class: L === lang ? 'on' : '', onclick: () => setLang(L, true), 'aria-label': t('lang_' + L) }, L.toUpperCase()));
  }
  $('verInfo').textContent = t('version', APP_VERSION);
  if (installEvt) { $('bInstall').hidden = false; $('bInstall').innerHTML = icon('phone') + t('install'); }
}

/* ------------------------------------------------------------------ início */
let listCache = [];
async function renderHome() {
  let recs = [];
  try { recs = await DB.all(); } catch (e) { toast(t('dbErr'), 'warn'); }
  recs.sort((a, b) => b.updated - a.updated); listCache = recs;
  const list = $('list'); list.innerHTML = '';
  $('emptyList').hidden = recs.length > 0;
  const pend = recs.filter(r => r.status === 'saved').length;
  $('pendingBanner').hidden = !pend;
  $('pendingBanner').innerHTML = icon('send') + '<span>' + t('pending', pend) + '</span>';
  $('home').querySelector('.appbar small').textContent = recs.length ? t('countReports', recs.length) : t('appSub');
  for (const r of recs) {
    const d = r.doc, L = layout(d);
    const when = d.head.Date ? isoToTxt(d.head.Date, true, d.idioma) : (d.head.DateRaw || '');
    const sub = [when, d.head.Report_No && ('Nº ' + d.head.Report_No), t('sheets', L.n), d.idioma.toUpperCase()].filter(Boolean).join(' · ');
    const badge = r.status === 'sent' ? el('span', { class: 'badge sent' }, t('stSent', fmtStamp(r.sentAt), r.sentVia ? t('via_' + r.sentVia) : ''))
      : r.status === 'saved' ? el('span', { class: 'badge saved' }, t('stSaved')) : el('span', { class: 'badge draft' }, t('stDraft'));
    const item = el('div', { class: 'item', role: 'button', tabindex: 0, onclick: () => itemMenu(r) },
      el('div', { class: 'ico', html: icon('file') }),
      el('div', { class: 'txt' }, el('b', null, d.head.Client.trim() || t('noClient')), el('small', null, sub), badge));
    if (r.status === 'saved') item.append(el('button', { class: 'send', html: icon('send') + '<span>' + t('send') + '</span>',
      onclick: e => { e.stopPropagation(); askSend(r, true); } }));
    list.append(item);
  }
}
function fmtStamp(ms) {
  if (!ms) return ''; const d = new Date(ms);
  return isoToTxt(d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), false) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function itemMenu(r) {
  openSheet([
    el('h2', null, r.doc.head.Client.trim() || t('noClient')),
    el('p', null, fileNameOf(r.doc) + '.pdf'),
    el('div', { class: 'opts' },
      opt('main', 'edit', t('openEdit'), null, () => { hideSheet(); replaceTop('editor'); openEditor(r); }),
      r.pdf && r.status !== 'draft' && opt('', 'send', t('send'), r.status === 'sent' ? t('sendAgainHint') : null, () => askSend(r, true)),
      (!r.pdf || r.status === 'draft') && opt('', 'save', t('saveAndSend'), null, () => { hideSheet(); replaceTop('editor'); openEditor(r); saveFlow(); }),
      r.pdf && opt('', 'save', t('downloadAgain'), null, async () => { const x = await saveToDevice(new File([r.pdf], fileNameOf(r.doc) + '.pdf', { type: 'application/pdf' })); if (x.ok) toast(x.where === 'downloads' ? t('savedDownloads', fileNameOf(r.doc) + '.pdf') : t('savedAt', x.where)); }),
      opt('', 'copy', t('duplicate'), t('duplicateHint'), async () => { await duplicate(r); }),
      opt('danger', 'trash', t('delete'), null, () => confirmDelete(r))),
    el('button', { class: 'cancel', onclick: back }, t('cancel'))
  ]);
}
function opt(cls, ic, title, sub, fn) {
  return el('button', { class: 'opt ' + cls, onclick: fn }, el('span', { class: 'oi', html: icon(ic) }),
    el('span', { class: 'ot' }, title, sub && el('small', null, sub)));
}
async function duplicate(r) {
  const d = JSON.parse(JSON.stringify(r.doc));
  d.sig = { tecnico: null, cliente: null }; d.fileName = ''; d.head.Date = todayISO();
  const rec = { id: newId(), created: Date.now(), updated: Date.now(), status: 'draft', doc: d, pdf: null };
  await DB.put(rec); hideSheet(); replaceTop('editor'); openEditor(rec); toast(t('duplicated'));
}
function confirmDelete(r) {
  openSheet([el('h2', null, t('deleteQ')), el('p', null, t('deleteHint', r.doc.head.Client.trim() || t('noClient'))),
    el('div', { class: 'opts' },
      opt('danger', 'trash', t('delete'), null, async () => { await DB.del(r.id); back(); renderHome(); toast(t('deleted')); }),
      opt('', 'back', t('cancel'), null, back))]);
}

/* ------------------------------------------------------------------ editor */
let cur = null, tab = 'head', saveT = null;
async function newReport() {
  const rec = { id: newId(), created: Date.now(), updated: Date.now(), status: 'draft', doc: blankDoc(), pdf: null };
  await DB.put(rec); push('editor'); openEditor(rec); tab = 'head'; showTab('head');
}
function openEditor(rec) {
  cur = rec; lang = rec.doc.idioma; document.documentElement.lang = lang; applyStatic();
  renderEditor(); showScreen('editor'); showTab(tab);
}
function touch() {
  if (!cur) return;
  cur.updated = Date.now(); if (cur.status !== 'draft') cur.status = 'draft';
  clearTimeout(saveT); saveT = setTimeout(flushSave, 500);
  updateBadges();
}
function flushSave() { clearTimeout(saveT); saveT = null; if (cur) DB.put(cur).catch(() => toast(t('dbErr'), 'warn')); }
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

function showTab(name) {
  tab = name;
  for (const b of $('tabs').querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === name);
  for (const s of ['head', 'report', 'times', 'material', 'sign']) $('tab-' + s).hidden = s !== name;
  const b = $('tabs').querySelector('[data-tab="' + name + '"]'); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' });
  window.scrollTo(0, 0);
}
function renderEditor() {
  if (!cur) return;
  renderHead(); renderReport(); renderTimes(); renderMaterial(); renderSign(); updateBadges();
}
function updateBadges() {
  if (!cur) return;
  const d = cur.doc, L = layout(d);
  $('edTitle').textContent = d.head.Client.trim() || t('newReport');
  $('edSub').textContent = t('sheets', L.n) + ' · ' + (cur.status === 'draft' ? t('autosaved') : cur.status === 'sent' ? t('stSentShort') : t('stSaved'));
  $('cntReport').textContent = L.rep.filter(l => l.trim()).length || '';
  $('cntTimes').textContent = L.tm.length || '';
  $('cntMaterial').textContent = L.mt.length || '';
  const ns = (d.sig.tecnico || d.assinar ? 1 : 0) + (d.sig.cliente ? 1 : 0);
  $('cntSign').textContent = ns ? ns + '/2' : '';
}
// campo de texto genérico ligado a obj[key]
function inp(label, obj, key, opts = {}) {
  const i = el('input', { type: opts.type || 'text', value: obj[key] || '', inputmode: opts.inputmode, placeholder: opts.ph,
    autocomplete: 'off', autocapitalize: opts.cap || 'sentences', enterkeyhint: 'next', list: opts.list, maxlength: opts.max });
  i.addEventListener('input', () => { obj[key] = i.value; i.classList.remove('bad'); touch(); if (opts.oninput) opts.oninput(i); });
  if (opts.hm) {                                    // horas: 0740 -> 07:40 ao sair do campo
    i.addEventListener('blur', () => {
      const m = parseT(i.value, opts.hm === 'clock');
      if (m === null) { if (i.value) { i.value = ''; obj[key] = ''; touch(); } return; }
      if (Number.isNaN(m)) { i.classList.add('bad'); toast(t('badTime', i.value), 'warn'); return; }
      const v = hmStr(m); if (v !== i.value) { i.value = v; obj[key] = v; touch(); if (opts.oninput) opts.oninput(i); }
    });
  }
  return el('label', { class: 'f' }, el('span', null, label), i);
}
function techList() {
  let l = []; try { l = JSON.parse(pref('techs') || '[]'); } catch (e) {}
  const dl = document.getElementById('dlTech') || document.body.appendChild(el('datalist', { id: 'dlTech' }));
  dl.innerHTML = ''; for (const n of l) dl.append(el('option', { value: n }));
  return 'dlTech';
}
function rememberTechs(d) {
  let l = []; try { l = JSON.parse(pref('techs') || '[]'); } catch (e) {}
  const add = [d.head.Responsible_technician, ...d.times.map(r => r.tech)].map(s => (s || '').trim()).filter(Boolean);
  l = [...new Set([...add, ...l])].slice(0, 25); pref('techs', JSON.stringify(l));
  if (d.head.Responsible_technician) pref('tech', d.head.Responsible_technician.trim());
}

function renderHead() {
  const d = cur.doc, h = d.head, box = $('tab-head'); box.innerHTML = '';
  const dlt = techList();
  const date = el('input', { type: 'date', value: h.Date || '' });
  date.addEventListener('change', () => { h.Date = date.value; h.DateRaw = ''; touch(); });
  box.append(
    el('div', { class: 'card' }, el('h3', { html: icon('user') + '<span>' + t('cardClient') + '</span>' }),
      inp(t('client'), h, 'Client', { oninput: updateBadges }),
      inp(t('addr1'), h, 'Client_line_1'), inp(t('addr2'), h, 'Client_line_2'), inp(t('addr3'), h, 'Client_line_3')),
    el('div', { class: 'card' }, el('h3', { html: icon('note') + '<span>' + t('cardJob') + '</span>' }),
      el('div', { class: 'row2' }, el('label', { class: 'f' }, el('span', null, t('date')), date),
        inp(t('reportNo'), h, 'Report_No', { inputmode: 'numeric' })),
      h.DateRaw ? el('p', { class: 'help' }, t('rawDate', h.DateRaw)) : null,
      inp(t('jobNo'), h, 'Job_number', { inputmode: 'numeric' }),
      inp(t('techResp'), h, 'Responsible_technician', { list: dlt, cap: 'words' }),
      inp(t('system'), h, 'System_designation')),
    el('div', { class: 'card' }, el('h3', { html: icon('folder') + '<span>' + t('cardOffice') + '</span>' }),
      el('div', { class: 'offices' }, [1, 2, 3].map(i => {
        const b = el('button', { class: 'office' + (h.office === i ? ' on' : ''), type: 'button' },
          el('span', { class: 'dot' }), el('span', null, el('b', null, t('office' + i)), el('small', null, t('office' + i + 'c'))));
        b.addEventListener('click', () => { h.office = h.office === i ? 0 : i; pref('office', h.office); touch(); renderHead(); });
        return b;
      }))),
    el('div', { class: 'card' }, el('h3', { html: icon('file') + '<span>' + t('cardFile') + '</span>' }),
      inp(t('fileName'), d, 'fileName', { ph: autoName(d) }), el('p', { class: 'help' }, t('fileNameHint')))
  );
}

function wrapLines(lines) {
  if (!HELV) return lines;
  const out = [];
  for (const line of lines) {
    if (HELV.widthOfTextAtSize(safeText(HELV, line), REPORT_SIZE) <= REPORT_W) { out.push(line); continue; }
    const m = line.match(/^(\s*[-•*]?\s*)/); const pre = m ? m[1] : ''; const indent = ' '.repeat(pre.length);
    let curL = pre; const words = line.slice(pre.length).split(/(\s+)/);
    for (const w of words) {
      const test = curL + w;
      if (HELV.widthOfTextAtSize(safeText(HELV, test), REPORT_SIZE) > REPORT_W && curL.trim()) { out.push(curL.replace(/\s+$/, '')); curL = indent + w.replace(/^\s+/, ''); }
      else curL = test;
    }
    if (curL.trim()) out.push(curL.replace(/\s+$/, ''));
  }
  return out;
}
function renderReport() {
  const d = cur.doc, box = $('tab-report'); box.innerHTML = '';
  const ta = el('textarea', { rows: 12, placeholder: t('reportPh'), autocapitalize: 'sentences', spellcheck: 'true' });
  ta.value = d.report.join('\n');
  const info = el('div', { class: 'help' }), warn = el('div');
  const upd = () => {
    const lines = ta.value.split('\n'); const used = trimEnd(lines, l => !l.trim()).length;
    info.textContent = t('linesInfo', used, Math.max(1, Math.ceil(used / 8)));
    warn.innerHTML = '';
    if (HELV) {
      const long = lines.map((l, i) => [i + 1, l]).filter(([, l]) => HELV.widthOfTextAtSize(safeText(HELV, l), REPORT_SIZE) > REPORT_W).map(([i]) => i);
      if (long.length) warn.append(el('div', { class: 'warnbox' }, t('longLines', long.join(', ')),
        el('br'), el('button', { type: 'button', onclick: () => { ta.value = wrapLines(ta.value.split('\n')).join('\n'); d.report = ta.value.split('\n'); touch(); upd(); toast(t('wrapped')); } }, t('wrapBtn'))));
    }
  };
  ta.addEventListener('input', () => { d.report = ta.value.split('\n'); touch(); upd(); });
  const dash = el('button', { type: 'button', class: 'more', onclick: () => {
    const p = ta.selectionStart, before = ta.value.slice(0, p), start = before.lastIndexOf('\n') + 1;
    if (!ta.value.slice(start).startsWith('-')) { ta.value = ta.value.slice(0, start) + '-    ' + ta.value.slice(start); d.report = ta.value.split('\n'); touch(); upd(); }
    ta.focus(); } }, t('addDash'));
  box.append(el('div', { class: 'info' }, t('reportInfo')),
    el('div', { class: 'card' }, el('h3', { html: icon('note') + '<span>' + t('tabReport') + '</span>' }),
      el('label', { class: 'f' }, ta), info, dash, warn));
  upd();
}

function renderTimes() {
  const d = cur.doc, box = $('tab-times'); box.innerHTML = '';
  const grand = el('div', { class: 'grand' });
  const list = el('div');
  const totalsEls = [];
  const refresh = () => {
    const c = calcAll(d.times);
    c.rows.forEach((r, i) => {
      const te = totalsEls[i]; if (!te) return;
      if (r.auto) { te.className = 'total'; te.innerHTML = '<span>' + t('rowTotal') + '</span><span>' + (r.total !== null ? hmStr(r.total) : '—') + '</span>'; te.manual.hidden = true; }
      else { te.className = 'total manual'; te.innerHTML = '<span>' + t('rowTotal') + (r.total !== null ? ' (' + t('manual') + ')' : '') + '</span><span>' + (r.total !== null ? hmStr(r.total) : '—') + '</span>'; te.manual.hidden = false; }
    });
    grand.innerHTML = '<small>' + t('grandTotal') + (layout(d).n > 1 ? ' · ' + t('allSheets') : '') + '</small><div class="big">' + (c.any ? hmStr(c.grand) : '—') + '</div>' +
      (c.overlaps.length ? '<div class="ovl">' + t('ovl', c.overlaps.map(o => hmStr(o.min) + ' ' + t('on') + ' ' + (o.date ? isoToTxt(o.date, false) : '?')).join(', ')) + '</div>' : '<small>' + t('grandHint') + '</small>');
  };
  const dlt = techList();
  d.times.forEach((r, i) => {
    const date = el('input', { type: 'date', value: r.date || '' });
    date.addEventListener('change', () => { r.date = date.value; r.dateRaw = ''; touch(); refresh(); head.querySelector('.dl').textContent = date.value ? isoToTxt(date.value, false) : ''; });
    const time = (lbl, key) => {
      const ti = el('input', { type: 'time', value: r[key] || '', step: 60 });
      ti.addEventListener('input', () => { r[key] = ti.value; touch(); refresh(); });
      return el('label', { class: 'f' }, el('span', null, lbl), ti);
    };
    const manual = inp(t('rowTotalField'), r, 'total', { inputmode: 'numeric', ph: '00:00', hm: 'dur', oninput: refresh });
    const te = el('div', { class: 'total' }); te.manual = manual; totalsEls[i] = te;
    const moreBox = el('div', { hidden: !(r.p25 || r.p50 || r.p100 || r.allow || r.km || (r.total && !rowCalc(r).auto)) }, manual,
      el('div', { class: 'row3' }, inp('25%', r, 'p25', { inputmode: 'numeric', hm: 'dur', ph: '00:00' }), inp('50%', r, 'p50', { inputmode: 'numeric', hm: 'dur', ph: '00:00' }),
        inp('100%', r, 'p100', { inputmode: 'numeric', hm: 'dur', ph: '00:00' })),
      el('div', { class: 'row2' }, inp(t('allowance'), r, 'allow'), inp(t('km'), r, 'km', { inputmode: 'decimal' })));
    const moreBtn = el('button', { type: 'button', class: 'more' + (moreBox.hidden ? '' : ' open'), html: '<span>' + t('moreFields') + '</span>' + icon('down') });
    moreBtn.addEventListener('click', () => { moreBox.hidden = !moreBox.hidden; moreBtn.classList.toggle('open', !moreBox.hidden); });
    const head = el('h3', null, el('span', null, t('day', i + 1)), el('span', { class: 'dl', style: 'font-weight:500;color:var(--muted)' }, r.date ? isoToTxt(r.date, false) : (r.dateRaw || '')),
      el('span', { class: 'grow' }), el('button', { class: 'del', type: 'button', html: icon('trash'), 'aria-label': t('delete'),
        onclick: () => { d.times.splice(i, 1); touch(); renderTimes(); toast(t('rowDeleted')); } }));
    list.append(el('div', { class: 'card' }, head,
      el('div', { class: 'row2' }, el('label', { class: 'f' }, el('span', null, t('date')), date), inp(t('technician'), r, 'tech', { list: dlt, cap: 'words' })),
      r.dateRaw && !r.date ? el('p', { class: 'help' }, t('rawDate', r.dateRaw)) : null,
      el('div', { class: 'row2' }, inp(t('travelOut'), r, 'ob', { inputmode: 'numeric', ph: '00:00', hm: 'dur', oninput: refresh }),
        inp(t('travelBack'), r, 'rt', { inputmode: 'numeric', ph: '00:00', hm: 'dur', oninput: refresh })),
      el('div', { class: 'row2' }, time(t('workStart'), 's'), time(t('workEnd'), 'e')),
      te, moreBtn, moreBox));
  });
  const add = el('button', { class: 'add', type: 'button', html: icon('plus') + '<span>' + t('addDay') + '</span>' });
  add.addEventListener('click', () => {
    const last = d.times[d.times.length - 1];
    d.times.push({ date: last && last.date ? addDays(last.date, 1) : (d.head.Date || todayISO()), dateRaw: '', tech: last ? last.tech : (d.head.Responsible_technician || ''),
      ob: '', s: '', e: '', rt: '', total: '', p25: '', p50: '', p100: '', allow: '', km: '' });
    touch(); renderTimes();
    const cards = $('tab-times').querySelectorAll('.card'); const c = cards[d.times.length - 1]; if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const ex = el('div', { hidden: !TOTAL_EXTRA.some(k => d.totals[k]) },
    el('div', { class: 'row2' }, inp(t('totTravelOut'), d.totals, 'Total_Outbound_travel', { inputmode: 'numeric', hm: 'dur' }), inp(t('totTravelBack'), d.totals, 'Total_Return_travel', { inputmode: 'numeric', hm: 'dur' })),
    el('div', { class: 'row3' }, inp('25%', d.totals, 'Total_25pct', { inputmode: 'numeric', hm: 'dur' }), inp('50%', d.totals, 'Total_50pct', { inputmode: 'numeric', hm: 'dur' }), inp('100%', d.totals, 'Total_100pct', { inputmode: 'numeric', hm: 'dur' })),
    el('div', { class: 'row2' }, inp(t('allowance'), d.totals, 'Total_Allowance'), inp(t('km'), d.totals, 'Total_Km_round', { inputmode: 'decimal' })));
  const exBtn = el('button', { type: 'button', class: 'more' + (ex.hidden ? '' : ' open'), html: '<span>' + t('otherTotals') + '</span>' + icon('down') });
  exBtn.addEventListener('click', () => { ex.hidden = !ex.hidden; exBtn.classList.toggle('open', !ex.hidden); });
  box.append(...[grand, d.times.length ? null : el('div', { class: 'info' }, t('timesInfo')), list, add,
    el('div', { class: 'card' }, exBtn, ex)].filter(Boolean));
  refresh();
}

function renderMaterial() {
  const d = cur.doc, box = $('tab-material'); box.innerHTML = '';
  d.material.forEach((m, i) => {
    box.append(el('div', { class: 'card' },
      el('h3', null, el('span', null, t('item', i + 1)), el('span', { class: 'grow' }),
        el('button', { class: 'del', type: 'button', html: icon('trash'), 'aria-label': t('delete'), onclick: () => { d.material.splice(i, 1); touch(); renderMaterial(); toast(t('rowDeleted')); } })),
      inp(t('desc'), m, 'desc'),
      el('div', { class: 'row3' }, inp(t('qty'), m, 'qty', { inputmode: 'decimal' }), inp(t('itemNo'), m, 'item'), inp(t('price'), m, 'price', { inputmode: 'decimal' }))));
  });
  const add = el('button', { class: 'add', type: 'button', html: icon('plus') + '<span>' + t('addItem') + '</span>' });
  add.addEventListener('click', () => {
    d.material.push({ qty: '', desc: '', item: '', price: '' }); touch(); renderMaterial();
    const cards = box.querySelectorAll('.card'); const c = cards[cards.length - 1];
    if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.querySelector('input').focus(); }
  });
  if (!d.material.length) box.append(el('div', { class: 'info' }, t('materialInfo')));
  box.append(add);
}

function renderSign() {
  const d = cur.doc, box = $('tab-sign'); box.innerHTML = '';
  const tile = kind => {
    const img = d.sig[kind] || (kind === 'tecnico' && d.assinar ? pref('sig') : null);
    return el('button', { class: 'sigtile' + (img ? ' done' : ''), type: 'button', onclick: () => openPad(kind) },
      el('span', { class: 'lbl', html: icon(img ? 'check' : 'pen') + '<span>' + t(kind === 'tecnico' ? 'sigTech' : 'sigClient') + '</span>' }),
      img ? el('img', { src: img, alt: '' }) : el('span', { class: 'ph' }, t('tapToSign')));
  };
  const saved = pref('sig');
  box.append(el('div', { class: 'info' }, t('signInfo')), tile('tecnico'),
    el('div', { class: 'siglinks' },
      saved && el('button', { type: 'button', onclick: () => { d.sig.tecnico = saved; d.assinar = false; touch(); renderSign(); toast(t('sigPlaced')); } }, t('useSaved')),
      el('button', { type: 'button', onclick: () => $('fSig').click() }, saved ? t('changeSaved') : t('chooseImg')),
      (d.sig.tecnico || d.assinar) && el('button', { type: 'button', onclick: () => { d.sig.tecnico = null; d.assinar = false; touch(); renderSign(); toast(t('sigRemoved')); } }, t('removeSig'))),
    tile('cliente'),
    d.sig.cliente ? el('div', { class: 'siglinks' }, el('button', { type: 'button', onclick: () => { d.sig.cliente = null; touch(); renderSign(); toast(t('sigRemoved')); } }, t('removeSig'))) : null);
}
// imagem da assinatura salva no aparelho (sempre convertida para PNG)
$('fSig').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f); });
  const im = new Image(); im.src = url; await im.decode().catch(() => {});
  const c = document.createElement('canvas'); const sc = Math.min(1, 900 / im.naturalWidth);
  c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  const png = c.toDataURL('image/png'); pref('sig', png);
  if (cur) { cur.doc.sig.tecnico = png; cur.doc.assinar = false; touch(); renderSign(); }
  toast(t('sigSavedDevice'));
});

/* ------------------------------------------------------------------ quadro de assinatura */
let padRatio = 2.6;
let padKind = null, strokes = [], curStroke = null;
const cv = $('padCanvas'), ctx = cv.getContext('2d');
function openPad(kind) {
  padKind = kind; strokes = []; curStroke = null;
  $('padTitle').textContent = t(kind === 'tecnico' ? 'sigTech' : 'sigClient');
  $('pad').hidden = false; push('pad'); sizePad();
}
function hidePad() { $('pad').hidden = true; padKind = null; }
function sizePad() {
  if ($('pad').hidden) return;
  const area = cv.parentElement.getBoundingClientRect();
  if (!strokes.length) padRatio = area.width > area.height ? 2.8 : 1.9;   // não muda a proporção no meio de uma assinatura
  let w = area.width - 20, h = w / padRatio;
  if (h > area.height - 20) { h = area.height - 20; w = h * padRatio; }
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const line = document.querySelector('.padLine'), hint = document.querySelector('.padHint');
  const ox = (area.width - w) / 2, oy = (area.height - h) / 2;
  Object.assign(line.style, { left: ox + w * 0.06 + 'px', width: w * 0.88 + 'px', top: oy + h * 0.74 + 'px' });
  Object.assign(hint.style, { left: ox + w * 0.06 + 'px', top: oy + h * 0.74 - 26 + 'px' });
  hint.hidden = strokes.length > 0;
  redraw();
}
function redraw() {
  const W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#13308f'; ctx.fillStyle = '#13308f';
  for (const s of strokes) drawStroke(s, 0);
}
function drawStroke(s, from) {
  const W = cv.width, H = cv.height, k = W / 1000;     // espessura proporcional ao tamanho do quadro
  for (let i = Math.max(1, from); i < s.length; i++) {
    const a = s[i - 1], b = s[i]; ctx.lineWidth = Math.max(1.2, (s.pen ? 1.4 + b[2] * 4 : 3) * k * 1.6);
    ctx.beginPath(); ctx.moveTo(a[0] * W, a[1] * H); ctx.lineTo(b[0] * W, b[1] * H); ctx.stroke();
  }
  if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0][0] * W, s[0][1] * H, 2.2 * k * 1.6, 0, Math.PI * 2); ctx.fill(); }
}
function ptOf(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pressure || 0.5]; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); cv.setPointerCapture(e.pointerId);
  curStroke = [ptOf(e)]; curStroke.pen = e.pointerType === 'pen'; strokes.push(curStroke);
  document.querySelector('.padHint').hidden = true; drawStroke(curStroke, 0);
});
cv.addEventListener('pointermove', e => {
  if (!curStroke) return; e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; const from = curStroke.length;
  for (const ev of evs) curStroke.push(ptOf(ev));
  drawStroke(curStroke, from);
});
['pointerup', 'pointercancel'].forEach(tp => cv.addEventListener(tp, () => { curStroke = null; }));
window.addEventListener('resize', () => setTimeout(sizePad, 120));
$('padClear').addEventListener('click', () => { strokes = []; redraw(); document.querySelector('.padHint').hidden = false; });
$('padClose').addEventListener('click', back);
$('padOk').addEventListener('click', () => {
  if (!strokes.length) { toast(t('padEmpty'), 'warn'); return; }
  // recorta a área desenhada
  const W = cv.width, H = cv.height, data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { toast(t('padEmpty'), 'warn'); return; }
  const m = 6; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const kind = padKind; cur.doc.sig[kind] = out.toDataURL('image/png'); if (kind === 'tecnico') cur.doc.assinar = false;
  touch(); back(); renderSign(); toast(t(kind === 'tecnico' ? 'sigTechOk' : 'sigClientOk'));
});

/* ------------------------------------------------------------------ visualizar */
function renderPreview() {
  const doc = toDoc(cur.doc), n = doc.folhas.length, box = $('prevPages'); box.innerHTML = '';
  $('prevSub').textContent = fileNameOf(cur.doc) + '.pdf · ' + t('sheets', n);
  for (let p = 0; p < n; p++) {
    const vals = Object.assign({}, doc.comuns, doc.folhas[p]); vals.Page = (p + 1) + '/' + n;
    const pg = el('div', { class: 'ppage', style: 'background-image:url(forms/bg_' + doc.idioma + '.png)' });
    for (const f of FIELDS) {
      const v = vals[f.n]; if (!v) continue;
      const pos = 'left:' + (f.x0 / PW * 100) + '%;top:' + ((PH - f.y1) / PH * 100) + '%;width:' + ((f.x1 - f.x0) / PW * 100) + '%;height:' + ((f.y1 - f.y0) / PH * 100) + '%;';
      if (f.t === '/Btn') { pg.append(el('div', { class: 'x', style: pos, html: '<svg viewBox="0 0 10 10" width="100%" height="100%"><path d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8" stroke="#000" stroke-width="1"/></svg>' })); continue; }
      const s = fitSize(String(v), f);
      pg.append(el('div', { class: 't', style: pos + 'font-size:calc(var(--k) * ' + s + 'px)' }, String(v)));
    }
    const legacy = doc.assinar && !doc.assinaturas.tecnico ? pref('sig') : null;
    for (const [k, src] of Object.entries(Object.assign({}, doc.assinaturas, legacy ? { tecnico: legacy } : {}))) {
      const b = DRAW_BOX[k];
      pg.append(el('img', { src, alt: '', style: 'left:' + (b.x0 / PW * 100) + '%;top:' + ((PH - b.y1) / PH * 100) + '%;width:' + ((b.x1 - b.x0) / PW * 100) + '%;height:' + ((b.y1 - b.y0) / PH * 100) + '%;object-fit:contain;object-position:center bottom' }));
    }
    box.append(el('p', { class: 'plabel' }, t('sheetOf', p + 1, n)), pg);
  }
  scalePreview();
}
function scalePreview() { const pg = document.querySelector('.ppage'); if (pg) $('prevPages').style.setProperty('--k', pg.clientWidth / PW); }
window.addEventListener('resize', scalePreview);

/* ------------------------------------------------------------------ salvar e enviar */
let busy = false;
async function saveFlow() {
  if (!cur || busy) return;
  const d = cur.doc;
  if (!d.head.Client.trim()) {
    openSheet([el('h2', null, t('noClientQ')), el('p', null, t('noClientHint')),
      el('div', { class: 'opts' },
        opt('main', 'edit', t('fillClient'), null, () => {
          history.go(screen === 'preview' ? -2 : -1);
          setTimeout(() => { showTab('head'); const i = $('tab-head').querySelector('input'); if (i) i.focus(); }, 350);
        }),
        opt('', 'save', t('saveAnyway'), null, doSave))]);
    return;
  }
  doSave();
}
async function doSave() {
  if (busy) return; busy = true;
  const d = cur.doc;
  try {
    toast(t('making'), '', 1500);
    const doc = toDoc(d), bytes = await buildPdf(doc), name = fileNameOf(d);
    cur.pdf = new Blob([bytes], { type: 'application/pdf' }); cur.status = 'saved'; cur.savedAt = Date.now(); cur.updated = Date.now();
    await DB.put(cur); rememberTechs(d); updateBadges();
    const file = new File([cur.pdf], name + '.pdf', { type: 'application/pdf' });
    const r = await saveToDevice(file);
    $('toast').className = '';
    askSend(cur, false, r);
  } catch (e) { console.error(e); toast(t('pdfErr', e.message), 'warn', 6000); }
  finally { busy = false; }
}
async function saveToDevice(file) {
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: file.name, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] });
      const w = await h.createWritable(); await w.write(file); await w.close();
      return { ok: true, where: h.name };
    } catch (e) { if (e.name === 'AbortError') return { ok: false }; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  return { ok: true, where: 'downloads' };
}
// pergunta "enviar agora ou mais tarde"; direct = já foi direto para as opções de envio
function askSend(rec, direct, saved) {
  const name = fileNameOf(rec.doc) + '.pdf';
  const ways = [el('h2', null, t('sendHow')), el('p', null, t('sendHowHint', name)),
    el('div', { class: 'opts' },
      opt('wa', 'chat', 'WhatsApp', null, () => share(rec, 'wa')),
      opt('tg', 'plane', 'Telegram', null, () => share(rec, 'tg')),
      opt('em', 'mail', t('email'), null, () => share(rec, 'em')),
      opt('', 'share', t('otherApp'), null, () => share(rec, 'other'))),
    el('button', { class: 'cancel', onclick: () => later(rec) }, t('later'))];
  if (direct) { openSheet(ways); return; }
  const where = !saved ? '' : saved.ok ? (saved.where === 'downloads' ? t('savedDownloads', name) : t('savedAt', saved.where)) : t('savedAppOnly');
  openSheet([el('h2', { html: icon('check') + ' ' + t('pdfReady') }), el('p', null, where),
    el('div', { class: 'opts' },
      opt('main', 'send', t('sendNow'), t('sendNowHint'), () => openSheet(ways)),
      opt('', 'later', t('later'), t('laterHint'), () => later(rec)))]);
}
function goHome() { const n = stack.length - 1; if (n > 0) history.go(-n); }
function later(rec) { goHome(); toast(t('laterToast')); }   // o rapport fica na lista marcado "a enviar"
// plain = true: manda só o arquivo, sem título/texto (alguns navegadores recusam arquivo + texto)
async function share(rec, via, plain) {
  const file = new File([rec.pdf], fileNameOf(rec.doc) + '.pdf', { type: 'application/pdf' });
  if (!(navigator.canShare && navigator.canShare({ files: [file] }))) { shareFail(rec, via, null, true); return; }
  if (via !== 'other') toast(t('pickApp', via === 'wa' ? 'WhatsApp' : via === 'tg' ? 'Telegram' : t('emailApp')), '', 2500);
  const h = rec.doc.head;
  const data = plain ? { files: [file] }
    : { files: [file], title: fileNameOf(rec.doc), text: t('shareText', h.Client.trim(), h.Date ? isoToTxt(h.Date, true, rec.doc.idioma) : '', h.Report_No.trim()) };
  try {
    await navigator.share(data);
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.warn('share', plain ? 'plain' : 'full', e);
    shareFail(rec, via, e, plain);
    return;
  }
  markSent(rec, via);
}
async function markSent(rec, via) {
  rec.status = 'sent'; rec.sentAt = Date.now(); rec.sentVia = via; await DB.put(rec);
  if (cur && cur.id === rec.id) { cur.status = 'sent'; updateBadges(); }
  goHome(); setTimeout(renderHome, 250);
  toast(t('sentToast'));
}
// o envio falhou: oferece tentar de novo só com o PDF (precisa de um toque novo) ou enviar à mão
function shareFail(rec, via, e, final) {
  $('toast').className = '';
  const samsung = /SamsungBrowser/i.test(navigator.userAgent);
  openSheet([el('h2', { html: icon('alert') + ' ' + t('shareFailT') }),
    el('p', null, e ? t('shareErr', e.message || e.name) : t('noShare')),
    samsung ? el('div', { class: 'warnbox' }, t('samsungHint')) : null,
    el('p', null, t('manualHint', fileNameOf(rec.doc) + '.pdf')),
    el('div', { class: 'opts' },
      final ? null : opt('main', 'send', t('retryPlain'), t('retryPlainHint'), () => share(rec, via, true)),
      opt('', 'check', t('markSent'), t('markSentHint'), () => markSent(rec, 'manual')),
      opt('', 'later', t('later'), t('laterHint'), () => later(rec)))]);
}

/* ------------------------------------------------------------------ folha de opções */
function openSheet(children) {
  const s = $('sheet'), wasOpen = !s.hidden;
  s.innerHTML = ''; s.append(el('div', { class: 'grab' }), ...children.filter(Boolean));
  s.hidden = false; $('scrim').hidden = false; document.body.classList.add('sheetOpen');
  if (!wasOpen) push('sheet');
}
function hideSheet() { $('sheet').hidden = true; $('scrim').hidden = true; document.body.classList.remove('sheetOpen'); }
$('scrim').addEventListener('click', back);

/* ------------------------------------------------------------------ importar PDF/JSON do PC */
$('bImport').addEventListener('click', () => $('fImport').click());
$('fImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const { data, pdf } = await readFileData(f);
    if (!data || !(data.folhas || data.campos)) throw new Error(t('noData'));
    const rec = { id: newId(), created: Date.now(), updated: Date.now(), status: pdf ? 'saved' : 'draft', doc: fromDoc(data), pdf };
    await DB.put(rec); push('editor'); tab = 'head'; openEditor(rec); toast(t('imported', f.name));
  } catch (err) { console.error(err); toast(t('openErr', f.name, err.message), 'warn', 6000); }
});

/* ------------------------------------------------------------------ botões fixos */
$('bNew').addEventListener('click', newReport);
$('bBack').addEventListener('click', back);
$('bBackPrev').addEventListener('click', back);
$('bPrevEdit').addEventListener('click', back);
$('bPreview').addEventListener('click', () => { flushSave(); push('preview'); showScreen('preview'); renderPreview(); });
$('bSave').addEventListener('click', saveFlow);
$('bPrevSave').addEventListener('click', saveFlow);
for (const b of $('tabs').querySelectorAll('button')) b.addEventListener('click', () => showTab(b.dataset.tab));

/* ------------------------------------------------------------------ instalar / atualizar */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; applyStatic(); });
$('bInstall').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('bInstall').hidden = true; });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  // mostra o aviso de versão nova; também quando ela já estava baixada e esperando (app reaberto)
  const askUpdate = (reg, w) => {
    if (!navigator.serviceWorker.controller || !$('sheet').hidden) return;
    openSheet([el('h2', null, t('updTitle')), el('p', null, t('updHint')),
      el('div', { class: 'opts' }, opt('main', 'check', t('updNow'), null, () => { (reg.waiting || w).postMessage('skip'); }), opt('', 'later', t('later'), null, back))]);
  };
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting) askUpdate(reg, reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => { if (nw.state === 'installed') askUpdate(reg, nw); });
    });
    // procura versão nova sempre que o app volta para a tela
    document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (reg.waiting) askUpdate(reg, reg.waiting); else reg.update().catch(() => {}); });
  }).catch(() => {});
}

/* ------------------------------------------------------------------ início do app */
(async () => {
  history.replaceState({ idx: 0 }, '');
  const l0 = pref('lang'); lang = LANGS.includes(l0) ? l0 : ((navigator.language || '').slice(0, 2) === 'de' ? 'de' : (navigator.language || '').slice(0, 2) === 'es' ? 'es' : 'en');
  applyStatic();
  try { const d = await PDFLib.PDFDocument.create(); HELV = await d.embedFont(PDFLib.StandardFonts.Helvetica); } catch (e) {}
  await renderHome();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
