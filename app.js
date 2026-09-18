'use strict';

/* =========================================================
   饼饼记账 · bing-daily-expenses
   V1.2.0
   ========================================================= */

const CATS = {
  交通: ['🚕', '上班打车', '下班打车', '周末出行', '其他打车', '公交地铁', '火车高铁', '机票', '其他'],
  吃饭: ['🍚', '早餐', '午餐', '晚餐', '外卖', '聚餐', '其他'],
  咖啡奶茶: ['☕', '咖啡', '奶茶', '果茶饮料', '其他'],
  零食甜点: ['🍰', '零食', 'Bread 面包', 'Tart 挞类', '蛋黄酥', 'Cake 蛋糕', '水果', '其他'],
  购物: ['🛍️', '衣服鞋包', '数码', '日用品', '家居', '网购', '其他'],
  娱乐: ['🎮', '游戏', '电影', '展览', 'KTV', '活动', '其他'],
  订阅会员: ['💻', 'ChatGPT', 'iCloud', '视频音乐', 'App', '其他会员'],
  个人护理: ['🧴', '理发', '护肤', '化妆品', '美容', '其他'],
  生活缴费: ['🧾', '交通卡充值', '话费', '水电', '网费', '房租', '其他'],
  学习: ['📚', '书籍', '软件', '课程', '建筑相关', '打印制作', '其他'],
  医疗健康: ['🏥', '药品', '看病', '体检', '健身', '其他'],
  礼物: ['🎁', '送礼', '红包', '请客', '其他'],
  其他: ['📦', '其他支出'],
  收入: ['💰', '工资', '奖金', '报销', '退款', '副业', '红包', '其他收入']
};

const TAXI_SUBS = ['上班打车', '下班打车', '周末出行', '其他打车'];

const TAXI_SERVICES = [
  '滴滴打车',
  '花小猪',
  '百度地图',
  '高德打车',
  '其他平台'
];

const KEY = 'bing-daily-expenses-v1';
const TRIPS = [
  { id: 'shenzhen-hongkong-2026', name: '2026深圳香港', start: '2026-10-02T16:15', end: '2026-10-07T11:05' }
];
const DAILY_FILTER = '__daily__';

function matchTrip(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') ||
      localDate(new Date(date + 'T12:00:00')) !== date) return '';
  const stamp = date + 'T' + time;
  return TRIPS.find(trip => stamp >= trip.start && stamp <= trip.end)?.name || '';
}

function travelTags() {
  return [...new Set([...TRIPS.map(trip => trip.name), ...db.records.map(r => r.travelTag),
    ...db.pending.map(r => r.travelTag)].filter(Boolean))];
}

function matchesLedger(record, selection) {
  return !selection || (selection === DAILY_FILTER ? !record.travelTag : record.travelTag === selection);
}

function ledgerOptions(selection, allLabel) {
  return [{ value: '', label: allLabel }, { value: DAILY_FILTER, label: '日常' },
    ...travelTags().map(name => ({ value: name, label: name }))]
    .map(x => `<option value="${esc(x.value)}" ${x.value === selection ? 'selected' : ''}>${esc(x.label)}</option>`).join('');
}

function travelFields(r) {
  const selection = r.travelMode || (r.id || r.travelTag ? 'manual' : 'auto');
  const tag = selection === 'auto' ? matchTrip(r.date, r.time) : (r.travelTag || '');
  const names = [...new Set([...travelTags(), tag].filter(Boolean))];
  return `<section class="travel-field"><span class="field-label">✈️ 归入账本</span>
    <input type="hidden" name="travelTag" value="${esc(tag)}">
    <input type="hidden" name="travelMode" value="${selection}">
    <div class="chips ledger-chips">${['', ...names].map(name => `<button type="button" data-ledger="${esc(name)}" aria-pressed="${tag === name}" class="${tag === name ? 'active' : ''}">${name ? esc(name) : '日常'}</button>`).join('')}</div>
    <p class="hint" data-travel-status>${selection === 'manual' ? '已手动选择，修改日期也保留你的选择。' : r.time ? '按交易日期和时间自动选择，可点击账本覆盖。' : '未填写时间，暂归日常；补全时间后自动判断。'}</p>
    <button type="button" data-travel-auto class="travel-auto">按时间自动选择</button>
    <details class="custom-ledger"><summary>其他旅行账本</summary><label>账本名称<input data-custom-ledger maxlength="100" placeholder="输入后点击使用"></label><button type="button" data-use-ledger>使用此账本</button></details>
  </section>`;
}

function wireTravel(form) {
  const tag = form.querySelector('[name="travelTag"]'), mode = form.querySelector('[name="travelMode"]');
  if (!tag || !mode) return;
  const refresh = () => {
    if (mode.value === 'auto') tag.value = matchTrip(form.querySelector('[name="date"]').value, form.querySelector('[name="time"]').value);
    form.querySelectorAll('[data-ledger]').forEach(button => {
      button.classList.toggle('active', button.dataset.ledger === tag.value);
      button.setAttribute('aria-pressed', String(button.dataset.ledger === tag.value));
    });
    form.querySelector('[data-travel-status]').textContent = mode.value === 'manual' ? '已手动选择，修改日期也保留你的选择。' : form.querySelector('[name="time"]').value ? '按交易日期和时间自动选择，可点击账本覆盖。' : '未填写时间，暂归日常；补全时间后自动判断。';
  };
  form.querySelectorAll('[data-ledger]').forEach(button => button.onclick = () => { mode.value = 'manual'; tag.value = button.dataset.ledger; refresh(); });
  form.querySelector('[data-travel-auto]').onclick = () => { mode.value = 'auto'; refresh(); };
  form.querySelectorAll('[name="date"],[name="time"]').forEach(input => { input.addEventListener('input', refresh); input.addEventListener('change', refresh); });
  form.querySelector('[data-use-ledger]').onclick = () => {
    const name = form.querySelector('[data-custom-ledger]').value.trim();
    if (!name) { notify('请先输入旅行账本名称。'); return; }
    tag.value = name; mode.value = 'manual';
    const chips = form.querySelector('.ledger-chips');
    if (![...chips.querySelectorAll('button')].some(b => b.dataset.ledger === name)) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.ledger = name; button.textContent = name;
      button.onclick = () => { tag.value = name; mode.value = 'manual'; refresh(); }; chips.append(button);
    }
    refresh();
  };
  // Existing records retain their saved tag when opened. Re-evaluate only on a date/time change.
}
const PURPOSE_KEY = 'bing-daily-expenses-purpose-history-v1';

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(
  /[&<>"']/g,
  c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])
);

const money = n =>
  '¥' + (n / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const nowTime = () => new Date().toTimeString().slice(0, 5);

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);


/* =========================================================
   STATE
   ========================================================= */

let storageBroken = false;

let db = {
  version: 1,
  records: [],
  pending: [],
  recent: null
};

let page = 'home';
let mode = 'quick';
let editing = null;
let draft = null;

let period = 'month';
let statsMonth = localDate().slice(0, 7);
let statsTag = '';

let filters = {
  month: localDate().slice(0, 7),
  type: '',
  category: '',
  tag: '',
  search: ''
};


/* =========================================================
   PURPOSE HISTORY
   ========================================================= */

function loadPurposeHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(PURPOSE_KEY) || '{}');
    return sanitizePurposeHistory(value);
  } catch {
    return {};
  }
}

function sanitizePurposeHistory(value) {
  const result = Object.create(null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [category, group] of Object.entries(value)) {
    if (!Object.hasOwn(CATS, category) || !group || typeof group !== 'object' || Array.isArray(group)) continue;
    result[category] = Object.create(null);
    for (const [name, info] of Object.entries(group)) {
      if (!name.trim() || name.length > 100 || !info || typeof info !== 'object') continue;
      result[category][name] = {
        count: Number.isSafeInteger(info.count) && info.count >= 0 ? info.count : 0,
        quick: info.quick === true,
        prompted: info.prompted === true,
        lastUsed: typeof info.lastUsed === 'string' ? info.lastUsed : ''
      };
    }
  }
  return result;
}

let purposeHistory = loadPurposeHistory();

function savePurposeHistory() {
  try {
    localStorage.setItem(PURPOSE_KEY, JSON.stringify(purposeHistory));
  } catch {}
}

function purposeSuggestions(category) {
  const group = purposeHistory[category] || {};

  return Object.entries(group)
    .sort((a, b) => {
      if ((b[1].count || 0) !== (a[1].count || 0)) {
        return (b[1].count || 0) - (a[1].count || 0);
      }

      return (b[1].lastUsed || '').localeCompare(a[1].lastUsed || '');
    })
    .slice(0, 15)
    .map(([name]) => name);
}

function quickPurposes(category) {
  const group = purposeHistory[category] || {};

  return Object.entries(group)
    .filter(([, info]) => info.quick)
    .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
    .map(([name]) => name);
}

function registerPurpose(category, purpose) {
  const name = String(purpose || '').trim();

  if (!name || !category) return;

  purposeHistory[category] ||= Object.create(null);

  const old = (Object.hasOwn(purposeHistory[category], name) ? purposeHistory[category][name] : null) || {
    count: 0,
    quick: false,
    prompted: false
  };

  old.count = (old.count || 0) + 1;
  old.lastUsed = new Date().toISOString();

  purposeHistory[category][name] = old;
  savePurposeHistory();

  if (
    old.count >= 10 &&
    !old.quick &&
    !old.prompted
  ) {
    old.prompted = true;
    savePurposeHistory();

    setTimeout(() => {
      const yes = confirm(
        `「${name}」已经在「${category}」记录 ${old.count} 次。\n\n是否把它添加为快捷用途？`
      );

      if (yes) {
        old.quick = true;
        savePurposeHistory();
        notify(`已添加快捷用途：${name}`);
      }
    }, 200);
  }
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function notify(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    $('#toast').style.display = 'none';
  }, 3000);
}

function persist(next) {
  if (storageBroken) {
    notify('原有数据损坏，已暂停写入以保护数据。请先备份浏览器原始存储。');
    return false;
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    db = next;
    return true;
  } catch {
    notify('保存失败：浏览器存储不可用或已满，请先导出备份。');
    return false;
  }
}


/* =========================================================
   DATA VALIDATION
   ========================================================= */

function valid(r) {
  return (
    r &&
    typeof r.id === 'string' &&
    ['expense', 'income'].includes(r.type) &&
    Number.isSafeInteger(r.amount) &&
    r.amount > 0 &&
    r.amount <= 99999999999 &&
    CATS[r.category] &&
    CATS[r.category].slice(1).includes(r.subcategory) &&
    ((r.type === 'income') === (r.category === '收入')) &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    localDate(new Date(r.date + 'T12:00:00')) === r.date &&
    (!r.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) &&
    ['merchant', 'payment', 'note', 'travelTag', 'createdAt']
      .every(k => typeof r[k] === 'string') &&
    (r.purpose === undefined || typeof r.purpose === 'string') &&
    (r.service === undefined || typeof r.service === 'string') &&
    (r.amountExpression === undefined || typeof r.amountExpression === 'string')
  );
}


/* =========================================================
   LOAD DATABASE
   ========================================================= */

try {
  const raw = localStorage.getItem(KEY);

  if (raw) {
    const value = JSON.parse(raw);

    if (
      value.version !== 1 ||
      !Array.isArray(value.records) ||
      !Array.isArray(value.pending) ||
      ![...value.records, ...value.pending].every(valid)
    ) {
      throw Error();
    }

    db = value;
  }
} catch {
  storageBroken = true;
  notify('本地数据无法读取，已暂停写入以保护原始数据。');
}


/* =========================================================
   RECORD HELPERS
   ========================================================= */

function fresh() {
  const r = db.recent;

  return {
    type: r?.type || 'expense',
    category: r?.category || '交通',
    subcategory: r?.subcategory || '上班打车',

    service:
      r?.category === '交通' &&
      TAXI_SUBS.includes(r?.subcategory)
        ? (r?.service || '')
        : '',

    purpose: '',

    amount: '',
    amountExpression: '',

    date: localDate(),
    time: nowTime(),

    /* 商家永远不继承上一笔 */
    merchant: '',

    payment: r?.payment || '',
    note: '',
    travelTag: matchTrip(localDate(), nowTime()),
    travelMode: 'auto'
  };
}

function sum(rows, type = 'expense') {
  return rows
    .filter(r => r.type === type)
    .reduce((n, r) => n + r.amount, 0);
}

function range(p, month = statsMonth) {
  const today = localDate();

  if (p === 'month') {
    return [month + '-01', month + '-31'];
  }

  if (p === 'year') {
    return [
      month.slice(0, 4) + '-01-01',
      month.slice(0, 4) + '-12-31'
    ];
  }

  const d = new Date(today + 'T12:00:00');

  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

  const start = localDate(d);

  d.setDate(d.getDate() + 6);

  return [start, localDate(d)];
}

function within(rows, a, b) {
  return rows.filter(r => r.date >= a && r.date <= b);
}

function sorted(rows) {
  return [...rows].sort(
    (a, b) =>
      (b.date + b.time + b.createdAt)
        .localeCompare(a.date + a.time + a.createdAt)
  );
}


/* =========================================================
   SMART DISPLAY
   ========================================================= */

function recordTitle(r) {
  return (
    r.purpose ||
    r.service ||
    r.merchant ||
    r.subcategory
  );
}

function recordMeta(r) {
  const title = recordTitle(r);

  const parts = [
    r.category,
    r.subcategory
  ];

  if (r.service && r.service !== title) {
    parts.push(r.service);
  }

  if (r.merchant && r.merchant !== title) {
    parts.push(r.merchant);
  }

  return parts.filter(Boolean).join(' · ');
}

function overview(rows) {
  const out = sum(rows);
  const inc = sum(rows, 'income');

  return `
    <div class="metrics">
      <div>
        <small>支出</small>
        <strong>${money(out)}</strong>
      </div>

      <div>
        <small>收入</small>
        <strong>${money(inc)}</strong>
      </div>

      <div>
        <small>结余</small>
        <strong>${money(inc - out)}</strong>
      </div>

      <div>
        <small>记录</small>
        <strong>${rows.length} 笔</strong>
      </div>
    </div>
  `;
}

function rowsHTML(rows) {
  if (!rows.length) {
    return '<div class="empty">还没有记录，记下第一笔小日常吧。</div>';
  }

  return rows.map(r => `
    <div class="row">

      <div class="transaction-main">

        <strong class="transaction-title">
          ${CATS[r.category][0]} ${esc(recordTitle(r))}
        </strong>

        <small>
          ${esc(r.date)} ${esc(r.time)}
        </small>

        <small>
          ${esc(recordMeta(r))}
        </small>

        ${
          r.amountExpression
            ? `<small>🧮 ${esc(r.amountExpression)}</small>`
            : ''
        }

        ${
          r.travelTag
            ? `<span class="badge">✈️ ${esc(r.travelTag)}</span>`
            : ''
        }

      </div>

      <div>

        <div class="value ${r.type === 'income' ? 'income' : ''}">
          ${r.type === 'income' ? '+' : '−'}${money(r.amount)}
        </div>

        <button data-edit="${esc(r.id)}">
          编辑
        </button>

      </div>

    </div>
  `).join('');
}


/* =========================================================
   CALCULATOR
   ========================================================= */

function calculateExpression(input) {
  const source = String(input || '').replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/[−–]/g, '-').replace(/\s/g, '');
  if (!source || source.length > 200) return null;
  try {
    let index = 0;
    const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) { const t = a % b; a = b; b = t; } return a || 1n; };
    const fraction = (n, d = 1n) => {
      if (d === 0n) throw Error();
      if (d < 0n) { n = -n; d = -d; }
      const g = gcd(n, d); n /= g; d /= g;
      if (n.toString().length > 300 || d.toString().length > 300) throw Error();
      return { n, d };
    };
    function primary() {
      if (source[index] === '+') { index++; return primary(); }
      if (source[index] === '-') { index++; const a = primary(); return fraction(-a.n, a.d); }
      if (source[index] === '(') { index++; const a = expression(); if (source[index++] !== ')') throw Error(); return a; }
      const m = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!m) throw Error(); index += m[0].length;
      const [whole, part = ''] = m[0].split('.');
      if (whole.length > 12 || part.length > 8) throw Error();
      return fraction(BigInt((whole || '0') + part), 10n ** BigInt(part.length));
    }
    function term() {
      let a = primary();
      while (source[index] === '*' || source[index] === '/') {
        const op = source[index++], b = primary();
        a = op === '*' ? fraction(a.n * b.n, a.d * b.d) : fraction(a.n * b.d, a.d * b.n);
      }
      return a;
    }
    function expression() {
      let a = term();
      while (source[index] === '+' || source[index] === '-') {
        const op = source[index++], b = term();
        a = fraction(a.n * b.d + (op === '+' ? 1n : -1n) * b.n * a.d, a.d * b.d);
      }
      return a;
    }
    const value = expression();
    if (index !== source.length || value.n <= 0n) return null;
    const cents = (value.n * 200n + value.d) / (value.d * 2n);
    return cents > 0n && cents <= 99999999999n ? Number(cents) / 100 : null;
  } catch { return null; }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function go(p) {
  page = p;
  editing = null;
  draft = null;

  render();
  window.scrollTo(0, 0);
}

function render() {
  document
    .querySelectorAll('nav button')
    .forEach(b => {
      b.classList.toggle(
        'active',
        b.dataset.page === page
      );
    });

  $('#today').textContent =
    new Date().toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });

  $('#tags').innerHTML =
    [...new Set(
      [...db.records, ...db.pending]
        .map(r => r.travelTag)
        .filter(Boolean)
    )]
      .map(t => `<option value="${esc(t)}">`)
      .join('');

  if (page === 'home') home();
  if (page === 'entry') entry();
  if (page === 'stats') stats();
  if (page === 'list') list();

  bindCommon();
}


/* =========================================================
   HOME
   ========================================================= */

function home() {
  const today = localDate();
  const [a, b] = range('week');

  const month = within(
    db.records,
    today.slice(0, 7) + '-01',
    today.slice(0, 7) + '-31'
  );

  $('#main').innerHTML = `

    <section class="card hero">

      <p>
        ${today.slice(0, 7).replace('-', '年')}月 · 本月支出
      </p>

      <div class="big">
        ${money(sum(month))}
      </div>

      <div class="metrics">

        <div>
          <small>今日支出</small>
          <strong>
            ${money(sum(within(db.records, today, today)))}
          </strong>
        </div>

        <div>
          <small>本周支出</small>
          <strong>
            ${money(sum(within(db.records, a, b)))}
          </strong>
        </div>

        <div>
          <small>本月收入</small>
          <strong>
            ${money(sum(month, 'income'))}
          </strong>
        </div>

        <div>
          <small>本月结余</small>
          <strong>
            ${money(sum(month, 'income') - sum(month))}
          </strong>
        </div>

      </div>

    </section>

    <div class="actions">

      ${[
        ['quick', '⚡', '快速记'],
        ['back', '📅', '补记'],
        ['batch', '📚', '批量补'],
        ['ocr', '📷', '截图识别']
      ].map(([m, i, t]) => `
        <button data-mode="${m}">
          ${i}
          <span>${t}</span>
        </button>
      `).join('')}

    </div>

    ${
      db.pending.length
        ? `
          <button class="primary" data-mode="ocr">
            ${db.pending.length} 笔待确认，去看看
          </button>
        `
        : ''
    }

    <section class="card">

      <h2>最近的小日常</h2>

      ${rowsHTML(sorted(db.records).slice(0, 5))}

    </section>

    <section class="card">

      <h3>账本备份</h3>

      <p class="hint">
        记录仅保存在当前浏览器，不会自动同步。
        清理浏览器前，请导出备份。
      </p>

      <div class="toolbar">

        <button id="export">
          导出 JSON 备份
        </button>

        <button id="import">
          导入备份
        </button>

        <input
          hidden
          id="import-file"
          type="file"
          accept="application/json,.json"
        >

      </div>

    </section>
  `;

  $('#export').onclick = () => {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ ...db, appVersion: '1.2.0', purposeHistory }, null, 2)],
        { type: 'application/json' }
      )
    );

    const a = document.createElement('a');

    a.href = url;
    a.download =
      'bing-daily-expenses-' + today + '.json';

    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  $('#import').onclick =
    () => $('#import-file').click();

  $('#import-file').onchange = async e => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      const value =
        JSON.parse(await file.text());

      if (
        value.version !== 1 ||
        !Array.isArray(value.records) ||
        !Array.isArray(value.pending) ||
        ![...value.records, ...value.pending]
          .every(valid)
      ) {
        throw Error();
      }

      const ids =
        new Set(
          [...db.records, ...db.pending]
            .map(r => r.id)
        );

      const add = arr =>
        arr.filter(r => {
          if (ids.has(r.id)) return false;
          ids.add(r.id);
          return true;
        });

      const records = add(value.records);
      const pending = add(value.pending);

      if (
        persist({
          ...db,
          records: [...db.records, ...records],
          pending: [...db.pending, ...pending]
        })
      ) {
        const importedHistory = sanitizePurposeHistory(value.purposeHistory);
        for (const [category, group] of Object.entries(importedHistory)) {
          purposeHistory[category] ||= Object.create(null);
          for (const [name, incoming] of Object.entries(group)) {
            const existing = Object.hasOwn(purposeHistory[category], name) ? purposeHistory[category][name] : null;
            purposeHistory[category][name] = existing ? {
              count: Math.max(existing.count || 0, incoming.count),
              quick: existing.quick || incoming.quick,
              prompted: existing.prompted || incoming.prompted,
              lastUsed: [existing.lastUsed || '', incoming.lastUsed].sort().pop()
            } : incoming;
          }
        }
        savePurposeHistory();
        notify(
          `已合并 ${records.length + pending.length} 笔记录`
        );

        render();
      }

    } catch {
      notify(
        '导入失败：请选择有效的饼饼 JSON 备份。'
      );
    }
  };
}


/* =========================================================
   FORM BUILDERS
   ========================================================= */

function selectOptions(values, value) {
  return values.map(v => `
    <option
      ${v === value ? 'selected' : ''}
      value="${esc(v)}"
    >
      ${esc(v)}
    </option>
  `).join('');
}

function fields(r, compact = false) {
  const purposeListId = 'purpose-history-' + uid();
  const quicks = quickPurposes(r.category);

  const taxi =
    r.category === '交通' &&
    TAXI_SUBS.includes(r.subcategory);

  return `

    <label>
      金额（元）

      <input
        name="amount"
        class="amount"
        inputmode="decimal"
        placeholder="0.00"
        required
        value="${esc(r.amount)}"
      >
    </label>


    <div class="amount-tools">

      <button
        type="button"
        class="calculator-toggle"
        data-calculator-toggle
      >
        🧮 计算模式
      </button>

      <div
        class="calculator-box"
        ${r.amountExpression ? '' : 'hidden'}
      >

        <label>
          计算式

          <input
            name="amountExpression"
            class="amount-expression"
            placeholder="例如：28 + 16.5 + 12"
            value="${esc(r.amountExpression || '')}"
          >
        </label>

        <div class="calculator-result">

          <span>计算结果</span>

          <strong data-calculator-result>
            —
          </strong>

        </div>

        <button
          type="button"
          data-use-calculation
        >
          使用计算结果
        </button>

      </div>

    </div>


    <div class="tabs">

      <button
        type="button"
        data-type="expense"
        class="${r.type === 'expense' ? 'active' : ''}"
      >
        支出
      </button>

      <button
        type="button"
        data-type="income"
        class="${r.type === 'income' ? 'active' : ''}"
      >
        收入
      </button>

    </div>


    <input
      type="hidden"
      name="type"
      value="${esc(r.type)}"
    >

    <input
      type="hidden"
      name="category"
      value="${esc(r.category)}"
    >

    <input
      type="hidden"
      name="subcategory"
      value="${esc(r.subcategory)}"
    >


    <div class="categories">

      ${
        Object.keys(CATS)
          .filter(
            c =>
              (c === '收入') ===
              (r.type === 'income')
          )
          .map(c => `
            <button
              type="button"
              data-cat="${esc(c)}"
              class="${r.category === c ? 'active' : ''}"
            >
              <b>${CATS[c][0]}</b>
              ${esc(c)}
            </button>
          `)
          .join('')
      }

    </div>


    <div class="chips">

      ${
        CATS[r.category]
          .slice(1)
          .map(s => `
            <button
              type="button"
              data-sub="${esc(s)}"
              class="${r.subcategory === s ? 'active' : ''}"
            >
              ${esc(s)}
            </button>
          `)
          .join('')
      }

    </div>


    ${
      taxi
        ? `
          <div class="service-field">

            <span class="field-label">
              打车平台 · 三级分类
            </span>

            <input
              type="hidden"
              name="service"
              value="${esc(r.service || '')}"
            >

            <div class="chips service-chips">

              ${
                TAXI_SERVICES
                  .map(s => `
                    <button
                      type="button"
                      data-service="${esc(s)}"
                      class="${r.service === s ? 'active' : ''}"
                    >
                      ${esc(s)}
                    </button>
                  `)
                  .join('')
              }

            </div>

          </div>
        `
        : `
          <input
            type="hidden"
            name="service"
            value=""
          >
        `
    }


    <div class="purpose-area">

      <label class="purpose-field">

        用途

        <input
          name="purpose"
          maxlength="100"
          autocomplete="off"
          placeholder="具体买了什么 / 这笔钱做什么"
          value="${esc(r.purpose || '')}"
          list="${purposeListId}"
        >

      </label>

      <datalist id="${purposeListId}">

        ${
          purposeSuggestions(r.category)
            .map(name =>
              `<option value="${esc(name)}"></option>`
            )
            .join('')
        }

      </datalist>


      ${
        quicks.length
          ? `
            <div class="quick-purpose">

              <span class="field-label">
                常用用途
              </span>

              <div class="chips">

                ${
                  quicks.map(name => `
                    <button
                      type="button"
                      data-purpose="${esc(name)}"
                      class="${r.purpose === name ? 'active' : ''}"
                    >
                      ${esc(name)}
                    </button>
                  `).join('')
                }

              </div>

            </div>
          `
          : ''
      }

    </div>


    <p class="hint">

      ${
        r.category === '生活缴费'
          ? '交通卡充值记一次，之后刷卡无需重复记账。'

          : r.category === '交通'
            ? taxi
              ? '打车可继续选择三级平台；商家字段不再自动继承。'
              : '公交地铁仅记录直接付款；交通卡充值归入生活缴费。'

            : `已选：${esc(r.category)} → ${esc(r.subcategory)}`
      }

    </p>


    ${travelFields(r)}
    ${
      compact
        ? `
          <details>
            <summary>
              更多信息 · 日期、时间、商家与支付
            </summary>
        `
        : ''
    }


    <div class="grid">

      <label>
        日期

        <input
          name="date"
          type="date"
          required
          value="${esc(r.date)}"
        >
      </label>


      <label>
        时间

        <input
          name="time"
          type="time"
          value="${esc(r.time)}"
        >
      </label>


      <label>
        商家

        <input
          name="merchant"
          maxlength="100"
          autocomplete="off"
          placeholder="在哪里买，可留空"
          value="${esc(r.merchant || '')}"
        >
      </label>


      <label>
        支付方式

        <input
          name="payment"
          maxlength="100"
          placeholder="如：微信 / 支付宝"
          value="${esc(r.payment || '')}"
          list="payments"
        >
      </label>

    </div>


    <label>
      备注

      <textarea
        name="note"
        maxlength="2000"
        placeholder="想展开记录时再写，不影响首页标题"
      >${esc(r.note || '')}</textarea>

    </label>


    <datalist id="payments">
      <option>微信</option>
      <option>支付宝</option>
      <option>银行卡</option>
      <option>现金</option>
    </datalist>


    ${
      compact
        ? '</details>'
        : ''
    }
  `;
}

function formData(form) {
  return Object.fromEntries(
    new FormData(form)
  );
}


/* =========================================================
   CREATE RECORD
   ========================================================= */

function record(data, old) {
  const str =
    String(data.amount || '').trim();

  if (
    !/^\d{1,9}(\.\d{1,2})?$/.test(str) ||
    Number(str) <= 0
  ) {
    throw Error(
      '请输入大于 0 的金额，最多两位小数。'
    );
  }

  const r = {
    id: old?.id || uid(),

    type: data.type,

    amount:
      Math.round(Number(str) * 100),

    category: data.category,
    subcategory: data.subcategory,

    service:
      String(data.service || '').trim(),

    purpose:
      String(data.purpose || '').trim(),

    amountExpression:
      String(data.amountExpression || '').trim(),

    date: data.date,
    time: data.time || '',

    merchant:
      String(data.merchant || '').trim(),

    payment:
      String(data.payment || '').trim(),

    note:
      String(data.note || '').trim(),

    travelTag:
      (data.travelMode || (old || data.travelTag ? 'manual' : 'auto')) === 'auto'
        ? matchTrip(data.date, data.time)
        : String(data.travelTag || '').trim(),
    travelMode: data.travelMode || (old || data.travelTag ? 'manual' : 'auto'),

    createdAt:
      old?.createdAt ||
      new Date().toISOString()
  };

  if (
    r.category !== '交通' ||
    !TAXI_SUBS.includes(r.subcategory)
  ) {
    r.service = '';
  }

  // Keep the expression only when it still describes the saved amount.
  if (r.amountExpression && calculateExpression(r.amountExpression) !== Number(str)) {
    r.amountExpression = '';
  }

  if (!valid(r)) {
    throw Error(
      '请检查金额、分类、日期和时间。'
    );
  }

  return r;
}


/* =========================================================
   FORM INTERACTIONS
   ========================================================= */

function wireForm(form, redraw) {
  wireTravel(form);
  form
    .querySelectorAll(
      '[data-type],[data-cat],[data-sub],[data-service],[data-purpose]'
    )
    .forEach(button => {

      button.onclick = () => {
        const r = formData(form);

        if (button.dataset.type) {
          r.type = button.dataset.type;

          r.category =
            r.type === 'income'
              ? '收入'
              : '交通';

          r.subcategory =
            CATS[r.category][1];

          r.service = '';
        }

        if (button.dataset.cat) {
          r.category =
            button.dataset.cat;

          r.subcategory =
            CATS[r.category][1];

          r.service = '';
        }

        if (button.dataset.sub) {
          r.subcategory =
            button.dataset.sub;

          if (
            r.category !== '交通' ||
            !TAXI_SUBS.includes(r.subcategory)
          ) {
            r.service = '';
          }
        }

        if (button.dataset.service) {
          r.service =
            button.dataset.service;
        }

        if (button.dataset.purpose) {
          r.purpose =
            button.dataset.purpose;
        }

        redraw(r);
      };
    });


  /* Calculator */

  const toggle =
    form.querySelector(
      '[data-calculator-toggle]'
    );

  const box =
    form.querySelector(
      '.calculator-box'
    );

  const expression =
    form.querySelector(
      '.amount-expression'
    );

  const result =
    form.querySelector(
      '[data-calculator-result]'
    );

  const use =
    form.querySelector(
      '[data-use-calculation]'
    );

  if (toggle && box) {
    toggle.onclick = () => {
      box.hidden = !box.hidden;

      if (!box.hidden) {
        expression?.focus();
      }
    };

    const refreshCalc = () => {
      const value =
        calculateExpression(
          expression?.value
        );

      if (result) {
        result.textContent =
          value === null
            ? '—'
            : `¥${value.toFixed(2)}`;
      }
    };

    expression?.addEventListener(
      'input',
      refreshCalc
    );

    use?.addEventListener(
      'click',
      () => {
        const value =
          calculateExpression(
            expression?.value
          );

        if (value === null) {
          notify('请检查计算式');
          return;
        }

        const amount =
          form.querySelector(
            '[name="amount"]'
          );

        if (amount) {
          amount.value =
            value.toFixed(2);
        }

        notify(
          `已使用计算结果 ¥${value.toFixed(2)}`
        );
      }
    );

    refreshCalc();
  }
}


/* =========================================================
   ENTRY
   ========================================================= */

function entry() {
  const labels = {
    quick: '⚡ 快速记',
    back: '📅 补记',
    batch: '📚 批量补',
    ocr: '📷 截图识别'
  };

  $('#main').innerHTML = `

    <h2>
      ${editing ? '编辑记录' : '记一笔小日常'}
    </h2>

    ${
      editing
        ? ''
        : `
          <div class="tabs">

            ${
              Object.entries(labels)
                .map(([m, text]) => `
                  <button
                    data-mode="${m}"
                    class="${mode === m ? 'active' : ''}"
                  >
                    ${text}
                  </button>
                `)
                .join('')
            }

          </div>
        `
    }

    <div id="entry-body"></div>
  `;


  if (
    editing ||
    mode === 'quick' ||
    mode === 'back'
  ) {
    const old =
      editing &&
      (
        db.records.find(r => r.id === editing) ||
        db.pending.find(r => r.id === editing)
      );

    const r =
      draft ||
      (
        old
          ? {
              ...old,
              purpose: old.purpose || '',
              service: old.service || '',
              amountExpression:
                old.amountExpression || '',
              amount:
                (old.amount / 100).toFixed(2)
            }
          : fresh()
      );

    $('#entry-body').innerHTML = `

      <section class="card">

        <form id="entry-form">

          ${
            !editing &&
            mode === 'quick' &&
            db.recent
              ? `
                <p class="hint">
                  最近使用 ·
                  ${esc(db.recent.subcategory || '')}
                  ${
                    db.recent.service
                      ? ' · ' + esc(db.recent.service)
                      : ''
                  }
                </p>
              `
              : ''
          }

          ${fields(
            r,
            !editing && mode === 'quick'
          )}

          <button class="primary">

            ${
              editing
                ? (
                    db.pending.some(
                      x => x.id === editing
                    )
                      ? '保存修改，仍待确认'
                      : '保存修改'
                  )
                : '记一笔'
            }

          </button>

        </form>


        ${
          editing
            ? `
              <div class="toolbar">

                <button id="cancel">
                  取消
                </button>

                <button
                  id="delete"
                  class="danger"
                >
                  删除此笔
                </button>

              </div>
            `
            : ''
        }

      </section>
    `;

    const form =
      $('#entry-form');

    wireForm(
      form,
      next => {
        draft = next;
        entry();
        bindCommon();
      }
    );

    form.onsubmit = e => {
      e.preventDefault();

      try {
        const r =
          record(
            formData(form),
            old
          );

        const pending =
          db.pending.some(
            x => x.id === editing
          );

        const key =
          pending
            ? 'pending'
            : 'records';

        let arr;

        if (editing) {
          arr =
            db[key].map(
              x =>
                x.id === editing
                  ? r
                  : x
            );
        } else {
          arr =
            [...db.records, r];
        }

        const next = {
          ...db,
          [key]: arr,

          recent:
            pending
              ? db.recent
              : {
                  type: r.type,
                  category: r.category,
                  subcategory: r.subcategory,
                  service: r.service || '',
                  payment: r.payment
                }
        };

        if (persist(next)) {
          if (!editing && r.purpose) {
            registerPurpose(
              r.category,
              r.purpose
            );
          }

          notify(
            editing
              ? '修改已保存'
              : '已记下这笔日常'
          );

          editing = null;
          draft = null;

          render();
        }

      } catch (err) {
        notify(err.message);
      }
    };


    if (editing) {
      $('#cancel').onclick =
        () => go('list');

      $('#delete').onclick = () => {
        if (
          confirm('确定删除这笔记录？')
        ) {
          if (
            persist({
              ...db,

              records:
                db.records.filter(
                  x => x.id !== editing
                ),

              pending:
                db.pending.filter(
                  x => x.id !== editing
                )
            })
          ) {
            notify('已删除');
            go('list');
          }
        }
      };
    }

  } else if (mode === 'batch') {
    batch();

  } else {
    ocr();
  }
}


/* =========================================================
   BATCH ENTRY
   ========================================================= */

function batch() {
  let items =
    draft || [fresh(), fresh()];

  function capture() {
    document
      .querySelectorAll('[data-row]')
      .forEach(form => {
        items[
          Number(form.dataset.row)
        ] = formData(form);
      });
  }

  function draw() {
    draft = items;

    $('#entry-body').innerHTML = `

      <p class="hint">
        逐行填写，整批检查通过后一起保存。
        每一笔都可以分别选择用途、打车平台和旅行标签。
      </p>

      <div id="batch-rows">

        ${
          items.map((r, i) => `

            <section class="batch">

              <header>

                <strong>
                  第 ${i + 1} 笔
                </strong>

                <button
                  data-remove="${i}"
                  type="button"
                >
                  移除
                </button>

              </header>

              <form data-row="${i}">

                ${fields(r, true)}

              </form>

            </section>

          `).join('')
        }

      </div>


      <button id="add-row">
        ＋ 添加一笔
      </button>

      <button
        class="primary"
        id="save-batch"
      >
        保存 ${items.length} 笔
      </button>
    `;


    document
      .querySelectorAll('[data-row]')
      .forEach(form => {
        const i =
          Number(form.dataset.row);

        form.onsubmit =
          e => e.preventDefault();

        wireForm(
          form,
          r => {
            capture();
            items[i] = r;
            draw();
          }
        );
      });


    document
      .querySelectorAll('[data-remove]')
      .forEach(button => {
        button.onclick = () => {
          capture();

          items.splice(
            Number(button.dataset.remove),
            1
          );

          draw();
        };
      });


    $('#add-row').onclick = () => {
      capture();
      items.push(fresh());
      draw();
    };


    $('#save-batch').onclick = () => {
      capture();

      try {
        if (!items.length) {
          throw Error('请先添加一笔。');
        }

        const records =
          items.map((item, i) => {
            try {
              return record(item);
            } catch (err) {
              throw Error(
                `第 ${i + 1} 笔：${err.message}`
              );
            }
          });

        if (
          persist({
            ...db,
            records:
              [...db.records, ...records]
          })
        ) {
          records.forEach(r => {
            if (r.purpose) {
              registerPurpose(
                r.category,
                r.purpose
              );
            }
          });

          notify(
            `已保存 ${records.length} 笔`
          );

          draft = null;
          render();
        }

      } catch (err) {
        notify(err.message);
      }
    };
  }

  draw();
}


/* =========================================================
   OCR
   ========================================================= */

function ocr() {
  $('#entry-body').innerHTML = `

    <section class="card">

      <h3>
        截图 → 待确认 → 入账
      </h3>

      <p class="hint">
        选择账单截图，可尝试浏览器 OCR；
        也可以粘贴手机提取的文字。
        图片只在当前页面预览，不保存到账本。
        识别结果必须逐笔确认。
      </p>

      <label>
        选择截图

        <input
          id="image"
          type="file"
          accept="image/*"
        >
      </label>

      <img
        id="preview"
        class="preview"
        alt="待识别的账单截图"
        hidden
      >

      <button
        id="recognize"
        disabled
      >
        识别截图文字
      </button>

      <label>
        账单文字

        <textarea
          id="ocr-text"
          placeholder="例如：2026-09-17 14:26 瑞幸咖啡 实付 ¥26.50"
        ></textarea>
      </label>

      <p
        class="hint"
        id="ocr-status"
      >
        OCR 需要联网加载识别组件。
        失败时可以粘贴文字或手动建立待确认记录。
      </p>

      <button
        class="primary"
        id="parse"
      >
        生成一笔待确认
      </button>

      <button
        id="manual"
        class="primary"
      >
        手动建立待确认
      </button>

    </section>


    <section class="card">

      <h3>
        待确认 · ${db.pending.length} 笔
      </h3>

      ${
        db.pending.length
          ? db.pending.map(r => `

              <div class="row">

                <div>

                  <strong>
                    ${esc(recordTitle(r))}
                  </strong>

                  <small>
                    ${esc(r.date)}
                    ${esc(r.time)}
                    ·
                    ${money(r.amount)}
                  </small>

                  <small>
                    ${esc(recordMeta(r))}
                  </small>

                  <small>
                    ${esc(r.note)}
                  </small>

                </div>

                <div>

                  <button data-edit="${r.id}">
                    修改
                  </button>

                  <button data-confirm="${r.id}">
                    确认入账
                  </button>

                  <button
                    data-discard="${r.id}"
                    class="danger"
                  >
                    丢弃
                  </button>

                </div>

              </div>

            `).join('')
          : '<p class="empty">没有待确认记录</p>'
      }

    </section>
  `;


  let imageFile = null;
  let url = null;


  $('#image').onchange = e => {
    imageFile =
      e.target.files[0];

    if (!imageFile) return;

    if (
      imageFile.size >
      15 * 1024 * 1024
    ) {
      notify(
        '请选择小于 15 MB 的截图'
      );
      return;
    }

    if (url) {
      URL.revokeObjectURL(url);
    }

    url =
      URL.createObjectURL(imageFile);

    $('#preview').src = url;
    $('#preview').hidden = false;
    $('#recognize').disabled = false;
  };


  $('#recognize').onclick =
    async () => {
      const button =
        $('#recognize');

      button.disabled = true;

      $('#ocr-status').textContent =
        '正在加载并识别，首次使用可能需要一些时间…';

      let worker;

      try {
        if (!window.Tesseract) {
          await new Promise(
            (resolve, reject) => {
              const s =
                document.createElement('script');

              s.src =
                'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

              s.onload = resolve;
              s.onerror = reject;

              document.head.append(s);
            }
          );
        }

        worker =
          await Tesseract.createWorker(
            'chi_sim+eng'
          );

        const result =
          await worker.recognize(
            imageFile
          );

        $('#ocr-text').value =
          result.data.text;

        $('#ocr-status').textContent =
          '文字已提取，请检查后生成待确认。';

      } catch {
        $('#ocr-status').textContent =
          '识别未完成，请使用手机提取文字后粘贴，或手动建立待确认。';

      } finally {
        if (worker) {
          await worker.terminate();
        }

        if (button.isConnected) {
          button.disabled = false;
        }
      }
    };


  function addPending(data) {
    try {
      const r = record(data);

      if (
        persist({
          ...db,
          pending:
            [...db.pending, r]
        })
      ) {
        notify(
          '已放入待确认，尚未入账'
        );

        render();
      }

    } catch (err) {
      notify(err.message);
    }
  }


  $('#manual').onclick = () => {
    const host =
      document.createElement('section');

    host.className = 'card';

    host.innerHTML = `
      <h3>
        手动建立待确认
      </h3>

      <form>
        ${fields(fresh(), false)}

        <button class="primary">
          保存到待确认
        </button>
      </form>
    `;

    $('#entry-body').prepend(host);

    const form =
      host.querySelector('form');

    const redraw = r => {
      form.innerHTML =
        fields(r, false) +
        `
          <button class="primary">
            保存到待确认
          </button>
        `;

      wireForm(form, redraw);

      form.onsubmit = e => {
        e.preventDefault();
        addPending(formData(form));
      };
    };

    wireForm(form, redraw);

    form.onsubmit = e => {
      e.preventDefault();
      addPending(formData(form));
    };

    host.scrollIntoView({
      block: 'start'
    });
  };


  $('#parse').onclick = () => {
    const text =
      $('#ocr-text').value.trim();

    const matches = [
      ...text.matchAll(
        /(?:¥|￥|实付\s*[:：]?|支付金额\s*[:：]?|金额\s*[:：]?)\s*(\d+(?:\.\d{1,2})?)/g
      )
    ];

    if (!matches.length) {
      notify(
        '未找到金额，请补充“金额 26.50”或手动建立待确认。'
      );
      return;
    }

    const d = fresh();

    d.amount =
      matches[0][1];

    const date =
      text.match(
        /(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})/
      );

    if (date) {
      d.date =
        `${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}`;
    }

    d.time =
      text.match(
        /\b([01]\d|2[0-3]):[0-5]\d\b/
      )?.[0] || '';

    d.category = '其他';
    d.subcategory = '其他支出';
    d.service = '';
    d.purpose = '';

    const rules = [
      [/咖啡|瑞幸|星巴克/, '咖啡奶茶', '咖啡'],
      [/奶茶|喜茶|奈雪/, '咖啡奶茶', '奶茶'],
      [/花小猪/, '交通', '其他打车', '花小猪'],
      [/滴滴/, '交通', '其他打车', '滴滴打车'],
      [/百度.*打车|百度地图/, '交通', '其他打车', '百度地图'],
      [/高德|打车/, '交通', '其他打车', '高德打车'],
      [/充值.*交通|交通卡/, '生活缴费', '交通卡充值'],
      [/面包/, '零食甜点', 'Bread 面包'],
      [/蛋糕/, '零食甜点', 'Cake 蛋糕'],
      [/午餐|餐饮|外卖/, '吃饭', '外卖']
    ];

    for (const rule of rules) {
      const [re, category, sub, service] =
        rule;

      if (re.test(text)) {
        d.category = category;
        d.subcategory = sub;

        if (service) {
          d.service = service;
        }

        break;
      }
    }

    d.type =
      /收入|到账|工资/.test(text)
        ? 'income'
        : 'expense';

    if (d.type === 'income') {
      d.category = '收入';

      d.subcategory =
        /工资/.test(text)
          ? '工资'
          : '其他收入';

      d.service = '';
    }

    d.merchant =
      text.match(
        /(?:商家|收款方)\s*[:：]\s*([^\n]+)/
      )?.[1]?.slice(0, 100) || '';

    d.payment =
      /微信/.test(text)
        ? '微信'
        : /支付宝/.test(text)
          ? '支付宝'
          : '';

    d.note =
      (
        '截图辅助识别，金额/日期/分类请核对。' +
        (
          matches.length > 1
            ? '发现多个金额，暂取第一个。'
            : ''
        ) +
        '\n' +
        text
      ).slice(0, 2000);

    addPending(d);
  };


  document
    .querySelectorAll('[data-confirm]')
    .forEach(button => {

      button.onclick = () => {
        const r =
          db.pending.find(
            x =>
              x.id ===
              button.dataset.confirm
          );

        if (!r) return;

        if (
          !confirm(
            `核对完成？\n${r.date} ${recordTitle(r)} ${money(r.amount)}\n确认后正式入账。`
          )
        ) {
          return;
        }

        if (
          persist({
            ...db,

            pending:
              db.pending.filter(
                x => x.id !== r.id
              ),

            records:
              [...db.records, r]
          })
        ) {
          if (r.purpose) {
            registerPurpose(
              r.category,
              r.purpose
            );
          }

          notify('已确认入账');
          render();
        }
      };
    });


  document
    .querySelectorAll('[data-discard]')
    .forEach(button => {

      button.onclick = () => {
        if (
          confirm(
            '丢弃此待确认记录？'
          ) &&
          persist({
            ...db,

            pending:
              db.pending.filter(
                x =>
                  x.id !==
                  button.dataset.discard
              )
          })
        ) {
          render();
        }
      };
    });
}


/* =========================================================
   STATISTICS
   ========================================================= */

function stats() {
  const [a, b] =
    range(period);

  const rows =
    within(db.records, a, b)
      .filter(
        r =>
          matchesLedger(r, statsTag)
      );



  $('#main').innerHTML = `

    <h2>
      每一笔，都有去处
    </h2>


    <div class="tabs">

      ${
        [
          ['week', '本周'],
          ['month', '月份'],
          ['year', '年度']
        ]
          .map(([p, text]) => `
            <button
              data-period="${p}"
              class="${period === p ? 'active' : ''}"
            >
              ${text}
            </button>
          `)
          .join('')
      }

    </div>


    <div class="grid">

      <label>
        选择月份 / 年度

        <input
          id="stats-month"
          type="month"
          value="${statsMonth}"
          ${period === 'week' ? 'disabled' : ''}
        >
      </label>


      <label>
        旅行账本

        <select id="stats-tag">

          ${
            ledgerOptions(statsTag, '全部账本')
          }

        </select>
      </label>

    </div>


    <section class="card">

      <p>
        ${a} — ${b}
        ${
          statsTag
            ? ' · ' + (statsTag === DAILY_FILTER ? '日常' : '✈️ ' + esc(statsTag))
            : ' · 全部账本'
        }
      </p>

      ${overview(rows)}

    </section>


    <section class="card">

      <h3>
        支出栏目 · 点击展开
      </h3>

      ${categoryStats(rows, 'expense')}

    </section>


    <section class="card">

      <h3>
        收入栏目
      </h3>

      ${categoryStats(rows, 'income')}

    </section>


    <p class="hint">
      旅行标签只筛选原始记录，总支出每笔只计算一次。
      本周从周一开始。
    </p>
  `;


  document
    .querySelectorAll('[data-period]')
    .forEach(button => {

      button.onclick = () => {
        period =
          button.dataset.period;

        render();
      };
    });


  $('#stats-month').onchange = e => {
    if (e.target.value) {
      statsMonth =
        e.target.value;
    }

    render();
  };


  $('#stats-tag').options[0].textContent =
    '全部账本';


  $('#stats-tag').onchange = e => {
    statsTag =
      e.target.value;

    render();
  };
}


function categoryStats(rows, type) {
  const cats =
    Object.keys(CATS)
      .filter(
        c =>
          (c === '收入') ===
          (type === 'income')
      );

  const total =
    sum(rows, type);

  return cats.map(c => {
    const rr =
      rows.filter(
        r => r.category === c
      );

    const n =
      sum(rr, type);

    return `

      <details>

        <summary>
          ${CATS[c][0]} ${esc(c)}

          <strong style="float:right">
            ${money(n)}
          </strong>
        </summary>


        <div class="bar">
          <i
            style="width:${total ? n / total * 100 : 0}%"
          ></i>
        </div>


        ${
          CATS[c]
            .slice(1)
            .map(subcategory => {

              const sub =
                rr.filter(
                  r =>
                    r.subcategory ===
                    subcategory
                );

              const serviceStats =
                c === '交通' &&
                TAXI_SUBS.includes(subcategory)
                  ? TAXI_SERVICES
                      .map(service => {
                        const serviceRows =
                          sub.filter(
                            r =>
                              (r.service || '') ===
                              service
                          );

                        if (!serviceRows.length) {
                          return '';
                        }

                        return `
                          <div class="service-stat">
                            <span>
                              ↳ ${esc(service)}
                              · ${serviceRows.length} 笔
                            </span>

                            <span>
                              ${money(sum(serviceRows, type))}
                            </span>
                          </div>
                        `;
                      })
                      .join('')
                  : '';

              return `

                <div class="subrow">

                  <span>
                    ${esc(subcategory)}
                    · ${sub.length} 笔
                  </span>

                  <span>
                    ${money(sum(sub, type))}
                  </span>

                </div>

                ${serviceStats}
              `;
            })
            .join('')
        }

      </details>
    `;
  }).join('');
}


/* =========================================================
   TRANSACTION LIST
   ========================================================= */

function list() {


  const rows =
    sorted(
      db.records.filter(r =>

        (!filters.month ||
          r.date.startsWith(filters.month)) &&

        (!filters.type ||
          r.type === filters.type) &&

        (!filters.category ||
          r.category === filters.category) &&

        matchesLedger(r, filters.tag) &&

        (
          !filters.search ||
          [
            r.purpose || '',
            r.service || '',
            r.merchant || '',
            r.note || '',
            r.subcategory || '',
            r.payment || '',
            r.travelTag || ''
          ].some(
            s =>
              s.includes(filters.search)
          )
        )
      )
    );

  $('#main').innerHTML = `

    <h2>
      日常明细
    </h2>


    <section class="card">

      <div class="grid">

        <label>
          月份（清空查看全部）

          <input
            id="filter-month"
            type="month"
            value="${filters.month}"
          >
        </label>


        <label>
          类型

          <select id="filter-type">

            <option value="">
              全部
            </option>

            <option
              value="expense"
              ${filters.type === 'expense' ? 'selected' : ''}
            >
              支出
            </option>

            <option
              value="income"
              ${filters.type === 'income' ? 'selected' : ''}
            >
              收入
            </option>

          </select>
        </label>


        <label>
          栏目

          <select id="filter-category">

            ${
              selectOptions(
                ['', ...Object.keys(CATS)],
                filters.category
              )
            }

          </select>
        </label>


        <label>
          旅行标签

          <select id="filter-tag">

            ${
              ledgerOptions(filters.tag, '全部账本')
            }

          </select>
        </label>

      </div>


      <label>
        搜索用途、平台、商家、备注、子分类

        <input
          id="filter-search"
          value="${esc(filters.search)}"
          placeholder="如：滴滴 / 巴斯克蛋糕 / 上班打车"
        >
      </label>


      <button id="apply-filter">
        筛选
      </button>

      <button id="reset-filter">
        查看全部
      </button>


      ${overview(rows)}

    </section>


    <section class="card">

      ${rowsHTML(rows)}

    </section>
  `;


  $('#filter-category').options[0].textContent =
    '全部栏目';

  $('#filter-tag').options[0].textContent =
    '全部账本';


  $('#apply-filter').onclick = () => {
    for (const key of Object.keys(filters)) {
      filters[key] =
        $('#filter-' + key)
          .value
          .trim();
    }

    render();
  };


  $('#reset-filter').onclick = () => {
    filters = {
      month: '',
      type: '',
      category: '',
      tag: '',
      search: ''
    };

    render();
  };
}


/* =========================================================
   COMMON EVENTS
   ========================================================= */

function bindCommon() {
  document
    .querySelectorAll('[data-mode]')
    .forEach(button => {

      button.onclick = () => {
        mode =
          button.dataset.mode;

        go('entry');
      };
    });


  document
    .querySelectorAll('[data-edit]')
    .forEach(button => {

      button.onclick = () => {
        editing =
          button.dataset.edit;

        draft = null;
        page = 'entry';

        render();

        window.scrollTo(0, 0);
      };
    });
}


/* =========================================================
   MAIN NAV
   ========================================================= */

document
  .querySelectorAll('nav [data-page]')
  .forEach(button => {

    button.onclick = () =>
      go(button.dataset.page);

  });


/* =========================================================
   START
   ========================================================= */

render();
