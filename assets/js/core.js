/* =========================================================
   核心：状态、持久化、日期工具、通用 UI
   ========================================================= */
(function () {
  'use strict';

  const App = (window.App = window.App || {
    views: {},
    actions: {},
    forms: {},
    tabs: {},
    ui: {},
  });

  /* ---------------- 基础工具 ---------------- */
  const pad2 = (n) => String(n).padStart(2, '0');

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function toNum(v, fallback) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function money(n) {
    const num = toNum(n);
    return '¥' + num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  function fmtNum(n, digits) {
    const num = toNum(n);
    const d = digits == null ? (Number.isInteger(num) ? 0 : 1) : digits;
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: d });
  }

  /* ---------------- 日期 ---------------- */
  function dateStr(d) {
    const x = d ? new Date(d) : new Date();
    if (isNaN(x.getTime())) return '';
    return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate());
  }

  function parseDay(str) {
    if (!str) return null;
    const m = String(str).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  function dayDiff(fromStr, toStr) {
    const a = typeof fromStr === 'string' ? parseDay(fromStr) : fromStr;
    const b = typeof toStr === 'string' ? parseDay(toStr) : toStr;
    if (!a || !b) return 0;
    return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / 86400000);
  }

  function addDays(str, n) {
    const d = typeof str === 'string' ? parseDay(str) : new Date(str);
    if (!d) return '';
    d.setDate(d.getDate() + (n || 0));
    return dateStr(d);
  }

  const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function weekdayCN(str) {
    const d = parseDay(str);
    return d ? WEEK_CN[d.getDay()] : '';
  }

  function fmtDay(str) {
    const d = parseDay(str);
    if (!d) return '—';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function fmtDayFull(str) {
    const d = parseDay(str);
    if (!d) return '未设置';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK_CN[d.getDay()];
  }

  function relDays(n) {
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === 2) return '后天';
    if (n === -1) return '昨天';
    if (n > 0) return n + ' 天后';
    return Math.abs(n) + ' 天前';
  }

  function daysUntil(str) {
    return dayDiff(dateStr(), str);
  }

  function nowTime() {
    const d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function startOfWeek(d) {
    const x = d ? new Date(d) : new Date();
    x.setHours(0, 0, 0, 0);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function weekEnd(startStr) {
    return addDays(startStr, 6);
  }

  function inRange(ts, startStr, endStr) {
    if (!ts) return false;
    const d = dateStr(new Date(ts));
    return d >= startStr && d <= endStr;
  }

  /* ---------------- 深合并 ---------------- */
  function deepMerge(base, extra) {
    if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
    if (base && typeof base === 'object') {
      const out = {};
      const source = extra && typeof extra === 'object' ? extra : {};
      Object.keys(base).forEach((k) => {
        out[k] = deepMerge(base[k], source[k]);
      });
      Object.keys(source).forEach((k) => {
        if (!(k in out)) out[k] = source[k];
      });
      return out;
    }
    return extra === undefined ? base : extra;
  }

  /* ---------------- 初始状态 ---------------- */
  function defaultState() {
    return {
      app: 'personal-workbench',
      version: 1,
      meta: {
        createdAt: Date.now(),
        updatedAt: 0,
        privacyAccepted: false,
        activity: {},
        firstRun: true,
      },
      settings: {
        weeklyAuto: true,
        replaceWarnDays: 7,
        weekStartsMonday: true,
      },
      checkin: { tasks: [] },
      todos: [],
      inspirations: [],
      exam: { name: '', date: '', plans: [], records: [], notes: [] },
      skills: [],
      body: { records: [], meals: [] },
      inventory: { stock: [], shopping: [], replace: [] },
      outfits: [],
      beauty: { tutorials: [], looks: [], products: [], closet: [] },
      money: { goals: [] },
      anniversaries: [],
      favors: [],
      wishes: [],
      reports: [],
    };
  }

  /* ---------------- 持久化 ---------------- */
  const STORAGE_KEY = 'personal-workbench.v1';
  let saveTimer = null;
  let dirty = false;

  const Store = {
    key: STORAGE_KEY,
    state: null,
    size: 0,
    savedAt: 0,

    init() {
      let saved = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (err) {
        console.warn('[工作台] 读取本地数据失败：', err);
      }
      if (saved && saved.data && saved.app) saved = saved.data;
      this.state = saved ? deepMerge(defaultState(), saved) : defaultState();
      App.state = this.state;
      this.size = 0;
      try { this.size = (localStorage.getItem(STORAGE_KEY) || '').length; } catch (e) { /* ignore */ }
    },

    write() {
      const st = this.state;
      st.meta.updatedAt = Date.now();
      let json = '';
      try {
        json = JSON.stringify(st);
        localStorage.setItem(STORAGE_KEY, json);
        this.size = json.length;
        this.savedAt = Date.now();
        UI.saved(this.size);
        return true;
      } catch (err) {
        console.error('[工作台] 保存失败：', err);
        UI.saveError(err);
        return false;
      }
    },

    save(opts) {
      const immediate = opts && opts.immediate;
      dirty = true;
      UI.saving();
      if (saveTimer) clearTimeout(saveTimer);
      if (immediate) {
        saveTimer = null;
        dirty = false;
        return this.write();
      }
      saveTimer = setTimeout(() => {
        saveTimer = null;
        if (dirty) {
          dirty = false;
          this.write();
        }
      }, 160);
      return true;
    },

    flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (dirty) {
        dirty = false;
        this.write();
      }
    },

    touch(moduleId) {
      if (!moduleId) return;
      this.state.meta.activity[moduleId] = Date.now();
    },

    lastActive(moduleId) {
      return this.state.meta.activity[moduleId] || 0;
    },

    exportJSON() {
      return JSON.stringify({
        app: 'personal-workbench',
        version: 1,
        exportedAt: new Date().toISOString(),
        note: '我的工作台完整数据备份，包含全部图片与记录。',
        data: this.state,
      }, null, 2);
    },

    importJSON(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error('文件不是有效的 JSON，可能已损坏。');
      }
      let data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !data.meta || !data.checkin || !data.todos) {
        throw new Error('这不像「我的工作台」的备份文件，缺少必要的数据结构。');
      }
      if (parsed && parsed.app && parsed.app !== 'personal-workbench') {
        throw new Error('备份来源不匹配，无法导入。');
      }
      this.state = deepMerge(defaultState(), data);
      App.state = this.state;
      this.save({ immediate: true });
      return true;
    },

    restore() {
      this.state = defaultState();
      App.state = this.state;
      this.save({ immediate: true });
    },

    usage() {
      let chars = 0;
      try { chars = (localStorage.getItem(STORAGE_KEY) || '').length; } catch (e) { chars = this.size; }
      const bytes = chars * 2;
      return { bytes, kb: bytes / 1024, mb: bytes / 1024 / 1024 };
    },
  };

  /* ---------------- 通用 UI ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const ICON = (name, cls) => '<svg class="ic ' + (cls || '') + '"><use href="#i-' + name + '"/></svg>';

  function toast(msg, type) {
    const root = $('#toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'ok');
    el.innerHTML = ICON(type === 'warn' ? 'lock' : 'check') + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 220);
    }, 2600);
  }

  let savePillTimer = null;
  function saving() {
    const pill = $('#savePill');
    const state = $('#saveState');
    if (pill) {
      pill.classList.add('is-busy');
      pill.innerHTML = '<i></i>保存中';
    }
    if (state) state.classList.add('is-busy');
  }
  function saved(size) {
    const pill = $('#savePill');
    const state = $('#saveState');
    const text = $('#saveText');
    if (pill) {
      pill.classList.remove('is-busy');
      pill.innerHTML = '<i></i>已保存';
    }
    if (state) state.classList.remove('is-busy');
    if (text) text.textContent = '已自动保存 · ' + nowTime();
    clearTimeout(savePillTimer);
    savePillTimer = setTimeout(() => {
      if (pill) pill.innerHTML = '<i></i>已保存';
    }, 3000);
  }
  function saveError(err) {
    const isQuota = err && (err.name === 'QuotaExceededError' || /quota/i.test(String(err.message)));
    toast(isQuota ? '本地空间已满，请先导出备份并压缩删除部分照片' : '本地保存失败，请导出备份', 'warn');
    const pill = $('#savePill');
    if (pill) {
      pill.classList.remove('is-busy');
      pill.innerHTML = '<i></i>保存失败';
    }
  }

  let lastFocus = null;
  let activeModal = null;

  function closeModal() {
    if (!activeModal) return;
    const mask = activeModal;
    activeModal = null;
    mask.classList.add('is-closing');
    mask.style.opacity = '0';
    setTimeout(() => mask.remove(), 160);
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) { /* ignore */ }
    }
  }

  function fieldHTML(f, index) {
    const id = 'mf_' + (f.name || 'field') + '_' + index;
    const value = f.value == null ? '' : f.value;
    const req = f.required ? ' required' : '';
    const attrs = [
      'id="' + id + '"',
      'name="' + esc(f.name || '') + '"',
    ];
    if (f.min != null) attrs.push('min="' + esc(f.min) + '"');
    if (f.max != null) attrs.push('max="' + esc(f.max) + '"');
    if (f.step != null) attrs.push('step="' + esc(f.step) + '"');
    if (f.placeholder) attrs.push('placeholder="' + esc(f.placeholder) + '"');
    if (f.autofocus) attrs.push('autofocus');

    let control = '';
    if (f.type === 'textarea') {
      control = '<textarea ' + attrs.join(' ') + req + ' rows="' + (f.rows || 4) + '">' + esc(value) + '</textarea>';
    } else if (f.type === 'select') {
      const opts = (f.options || []).map((o) => {
        const ov = typeof o === 'object' ? o.value : o;
        const ol = typeof o === 'object' ? o.label : o;
        return '<option value="' + esc(ov) + '"' + (String(ov) === String(value) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      }).join('');
      control = '<select ' + attrs.join(' ') + req + '>' + opts + '</select>';
    } else if (f.type === 'checkbox') {
      const checked = value ? ' checked' : '';
      return '<label class="check-option" for="' + id + '"><input type="checkbox" ' + attrs.join(' ') + checked + '>' +
        esc(f.checkboxLabel || f.label || '') + '</label>';
    } else {
      control = '<input type="' + esc(f.type || 'text') + '" ' + attrs.join(' ') + req +
        ' value="' + esc(value) + '"' + (f.inputmode ? ' inputmode="' + esc(f.inputmode) + '"' : '') + '>';
    }
    return '<div class="field' + (f.span === 2 ? ' span-2' : '') + '">' +
      (f.label ? '<label for="' + id + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label>' : '') +
      control +
      (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') +
      '</div>';
  }

  /**
   * 打开对话框
   * opts: {title, desc, fields, values, body, submitText, cancelText, danger, wide,
   *        onSubmit(data, form, modal), onOpen(el), footer, form:false, hideCancel}
   */
  function modal(opts) {
    const o = opts || {};
    closeModal();
    lastFocus = document.activeElement;

    const mask = document.createElement('div');
    mask.className = 'modal-mask';

    const fields = (o.fields || []).map((f, i) => {
      const item = Object.assign({}, f);
      if (o.values && Object.prototype.hasOwnProperty.call(o.values, f.name)) item.value = o.values[f.name];
      return fieldHTML(item, i);
    }).join('');

    const hasForm = o.form !== false && (fields || o.onSubmit);
    const titleId = 'modalTitle_' + Date.now();

    const bodyHTML = o.body ? '<div class="' + (o.bodyClass || '') + '">' + o.body + '</div>' : '';
    const fieldsHTML = fields ? '<div class="form-grid">' + fields + '</div>' : '';

    const defaultFooter = hasForm
      ? '<button type="button" class="btn btn--ghost" data-modal-close>' + esc(o.cancelText || '取消') + '</button>' +
        '<button type="submit" class="btn' + (o.danger ? ' btn--danger' : '') + '">' + esc(o.submitText || '保存') + '</button>'
      : '<button type="button" class="btn btn--ghost" data-modal-close>' + esc(o.cancelText || '关闭') + '</button>' +
        (o.footer || '');

    const formOpen = hasForm ? '<form class="mform" novalidate>' : '<div class="mform">';
    const formClose = hasForm ? '</form>' : '</div>';

    mask.innerHTML =
      '<div class="modal' + (o.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
        '<div class="modal-head">' +
          '<div><h3 id="' + titleId + '">' + esc(o.title || '') + '</h3>' +
          (o.desc ? '<p class="modal-desc">' + esc(o.desc) + '</p>' : '') + '</div>' +
          '<button type="button" class="icon-btn modal-close" data-modal-close aria-label="关闭">' + ICON('close') + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          (o.notice ? '<div class="modal-note" style="margin-bottom:14px">' + o.notice + '</div>' : '') +
          formOpen + bodyHTML + fieldsHTML +
          '<div class="modal-foot">' + (o.footer === undefined ? defaultFooter : o.footer) + '</div>' +
          formClose +
        '</div>' +
      '</div>';

    document.body.appendChild(mask);
    activeModal = mask;
    document.body.style.overflow = 'hidden';

    mask.addEventListener('click', (e) => {
      if (e.target === mask) closeModal();
      if (e.target.closest('[data-modal-close]')) {
        e.preventDefault();
        closeModal();
      }
    });

    const form = mask.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!o.onSubmit) { closeModal(); return; }
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn && submitBtn.disabled) return;
        if (submitBtn) submitBtn.disabled = true;
        const fd = new FormData(form);
        const data = {};
        fd.forEach((v, k) => {
          if (Object.prototype.hasOwnProperty.call(data, k)) {
            data[k] = [].concat(data[k], v);
          } else {
            data[k] = v;
          }
        });
        try {
          const result = await o.onSubmit(data, form, mask);
          if (result !== false) closeModal();
        } catch (err) {
          console.error(err);
          toast(err.message || '操作失败，请重试', 'warn');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    const first = mask.querySelector('input:not([type="hidden"]), textarea, select');
    setTimeout(() => {
      if (first) { try { first.focus(); } catch (e) { /* ignore */ } }
      if (o.onOpen) o.onOpen(mask);
    }, 60);

    return mask;
  }

  function confirm(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };
      const mask = modal({
        title: o.title || '确认操作',
        body: '<p class="modal-note">' + esc(o.message || '此操作无法撤销。') + '</p>',
        form: false,
        footer: '<button type="button" class="btn btn--ghost" data-cancel>取消</button>' +
          '<button type="button" class="btn ' + (o.danger === false ? '' : 'btn--danger') + '" data-ok>' +
          esc(o.okText || '确认删除') + '</button>',
      });
      mask.querySelector('[data-cancel]').addEventListener('click', () => {
        finish(false);
        closeModal();
      });
      mask.querySelector('[data-ok]').addEventListener('click', () => {
        finish(true);
        closeModal();
      });
      mask.querySelector('[data-modal-close]').addEventListener('click', () => finish(false));
      mask.addEventListener('click', (e) => {
        if (e.target === mask) finish(false);
      });
    });
  }

  function lightbox(src, caption) {
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = '<button type="button" class="icon-btn lb-close" aria-label="关闭">' + ICON('close') + '</button>' +
      '<img src="' + src + '" alt="' + esc(caption || '') + '">' +
      (caption ? '<div class="lb-caption">' + esc(caption) + '</div>' : '');
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('.lb-close')) el.remove();
    });
    document.body.appendChild(el);
  }

  function empty(icon, title, sub) {
    return '<div class="empty"><div class="empty-ico">' + (icon || '·') + '</div>' +
      '<strong>' + esc(title || '还没有内容') + '</strong>' +
      (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>';
  }

  function addForm(opts) {
    const o = opts || {};
    const fields = (o.fields || []).map((f) => {
      const cls = f.wide ? 'grow' : '';
      let control;
      if (f.type === 'select') {
        control = '<select name="' + esc(f.name) + '" ' + (f.required ? 'required' : '') + '>' +
          (f.options || []).map((x) => {
            const v = typeof x === 'object' ? x.value : x;
            const l = typeof x === 'object' ? x.label : x;
            return '<option value="' + esc(v) + '">' + esc(l) + '</option>';
          }).join('') + '</select>';
      } else {
        control = '<input type="' + esc(f.type || 'text') + '" name="' + esc(f.name) + '" ' +
          (f.placeholder ? 'placeholder="' + esc(f.placeholder) + '"' : '') +
          (f.required ? ' required' : '') +
          (f.value != null ? ' value="' + esc(f.value) + '"' : '') +
          (f.inputmode ? ' inputmode="' + esc(f.inputmode) + '"' : '') +
          (f.min != null ? ' min="' + esc(f.min) + '"' : '') +
          (f.max != null ? ' max="' + esc(f.max) + '"' : '') +
          (f.step != null ? ' step="' + esc(f.step) + '"' : '') + '>';
      }
      return '<div class="' + cls + '" style="flex:1 1 ' + (f.basis || '140px') + ';min-width:0">' + control + '</div>';
    }).join('');
    return '<form class="add-form add-form--wrap" data-form="' + esc(o.form) + '">' + fields +
      '<button type="submit" class="btn">' + ICON('plus') + esc(o.submit || '添加') + '</button></form>';
  }

  const UI = (window.UI = {
    $, $$, esc, toast, saving, saved, saveError, modal, confirm, lightbox, empty, addForm, closeModal, ICON,
  });

  App.UI = UI;
  App.util = {
    uid, esc, clamp, toNum, money, fmtNum, dateStr, parseDay, dayDiff, addDays,
    weekdayCN, fmtDay, fmtDayFull, relDays, daysUntil, nowTime, startOfWeek, weekEnd,
    inRange, deepMerge, pad2, WEEK_CN,
  };
  App.Store = Store;

  /* ---------------- 图片处理 ---------------- */
  function readImageFile(file, opts) {
    const o = opts || {};
    const max = o.max || 1200;
    const quality = o.quality || 0.78;
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('未选择图片')); return; }
      if (!/^image\//.test(file.type)) { reject(new Error('请选择图片文件')); return; }
      if (file.size > 20 * 1024 * 1024) { reject(new Error('图片超过 20MB，请压缩后再试')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('图片格式无法识别'));
        img.onload = () => {
          let { width, height } = img;
          const scale = Math.min(1, max / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFDF4';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  App.readImageFile = readImageFile;

  /* ---------------- 跨模块数据助手 ---------------- */
  App.commit = function (moduleId, opts) {
    const o = opts || {};
    Store.touch(moduleId);
    Store.save({ immediate: !!o.immediate });
    if (o.render !== false) App.render();
  };

  App.allNotes = function () {
    const notes = [];
    const st = Store.state;
    (st.exam.notes || []).forEach((n) => {
      notes.push(Object.assign({}, n, { _module: 'exam', _moduleName: '备考计划', _where: '备考笔记' }));
    });
    (st.skills || []).forEach((s) => {
      (s.notes || []).forEach((n) => {
        notes.push(Object.assign({}, n, {
          _module: 'skills', _moduleName: '技能学习', _where: s.name, _skillId: s.id,
        }));
      });
    });
    return notes;
  };

  App.markNoteViewed = function (noteId) {
    let changed = false;
    const stamp = Date.now();
    (Store.state.exam.notes || []).forEach((n) => {
      if (n.id === noteId) { n.lastViewedAt = stamp; changed = true; }
    });
    (Store.state.skills || []).forEach((s) => {
      (s.notes || []).forEach((n) => {
        if (n.id === noteId) { n.lastViewedAt = stamp; changed = true; }
      });
    });
    if (changed) Store.save();
  };

  App.latestBody = function () {
    const records = (Store.state.body.records || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    return records[0] || null;
  };

  App.safeUrl = function (u) {
    const s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  };

  App.deleteById = function (arr, id) {
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) arr.splice(i, 1);
    return i >= 0;
  };

  /** 统一的勾选行（绿色打勾） */
  App.checkRow = function (o) {
    const opt = o || {};
    return '<label class="check-row' + (opt.checked ? ' is-done' : '') + '">' +
      '<input type="checkbox" data-change="' + esc(opt.change) + '" data-id="' + esc(opt.id) + '"' +
        (opt.checked ? ' checked' : '') + ' aria-label="' + esc(opt.label) + '">' +
      '<span class="check-box" aria-hidden="true">' + UI.ICON('check') + '</span>' +
      '<span class="check-text">' + esc(opt.label) +
        (opt.sub ? '<small class="check-sub">' + esc(opt.sub) + '</small>' : '') +
      '</span>' +
      (opt.meta ? '<span class="check-meta">' + esc(opt.meta) + '</span>' : '') +
      (opt.delAct ? '<button type="button" class="row-del" data-act="' + esc(opt.delAct) + '" data-id="' +
        esc(opt.id) + '" aria-label="删除">' + UI.ICON('trash') + '</button>' : '') +
      '</label>';
  };

  /** 统一次级标签 */
  App.chip = function (text, cls) {
    return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>';
  };

  App.tab = function (moduleId, fallback) {
    return App.tabs[moduleId] || fallback || '';
  };

  App.setTab = function (moduleId, tab) {
    App.tabs[moduleId] = tab;
    App.render();
  };

  App.thresholdWarnDays = function () {
    return toNum((Store.state.settings || {}).replaceWarnDays, 7);
  };
})();
