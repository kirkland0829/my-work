/* =========================================================
   应用外壳：导航、路由、全局交互、设置、隐私提醒
   ========================================================= */
(function () {
  'use strict';

  const { Store, util, UI } = App;
  const { esc, $, $$ } = Object.assign({}, util, { $: UI.$, $$: UI.$$ });
  const ICON = UI.ICON;

  const MODULES = [
    { id: 'checkin', icon: '📋', name: '打卡 & 待办', sub: '把今天要做的事，轻轻写下来。' },
    { id: 'inspirations', icon: '🎬', name: '灵感', sub: '随手收集一闪而过的念头。' },
    { id: 'exam', icon: '📚', name: '备考计划', sub: '倒计时、学习记录与知识点收纳。' },
    { id: 'skills', icon: '💡', name: '技能学习', sub: '碎片学习，沉淀成自己的知识库。' },
    { id: 'body', icon: '🏃', name: '身体管理', sub: '体态、围度与饮食，温柔地管理身体。' },
    { id: 'inventory', icon: '🗃️', name: '物品管理', sub: '库存、采购与耗材更换，一件都不忘。' },
    { id: 'outfits', icon: '👗', name: '穿搭参考', sub: '结合身材与场合，生成搭配建议。' },
    { id: 'beauty', icon: '💄', name: '美妆护肤', sub: '教程、妆容与彩妆收纳。' },
    { id: 'money', icon: '💰', name: '存钱目标', sub: '目标、进度与每一笔收支。' },
    { id: 'anniversaries', icon: '🎀', name: '纪念日', sub: '重要的日子，提前记得。' },
    { id: 'favors', icon: '🤝', name: '人情台账', sub: '人情往来，清楚记录。' },
    { id: 'wishes', icon: '✈️', name: '愿望清单', sub: '想做的事，一件件实现。' },
    { id: 'report', icon: '📝', name: '周报', sub: '每周回看一次，知道自己在往哪走。' },
    { id: 'settings', icon: '⚙️', name: '设置', sub: '备份、隐私与偏好设置。' },
  ];

  App.MODULES = MODULES;
  App.current = null;

  /* ---------------- 导航 ---------------- */
  function renderNav() {
    const nav = $('#nav');
    if (!nav) return;
    nav.innerHTML = MODULES.map((m) =>
      '<a class="nav-item" href="#/' + m.id + '" data-nav="' + m.id + '">' +
        '<span class="nav-ico" aria-hidden="true">' + m.icon + '</span>' +
        '<span class="nav-label">' + esc(m.name) + '</span>' +
      '</a>'
    ).join('');
  }

  function routeId() {
    const h = (location.hash || '').replace(/^#\/?/, '').trim();
    return MODULES.some((m) => m.id === h) ? h : MODULES[0].id;
  }

  function updateNav(id) {
    $$('#nav .nav-item').forEach((a) => {
      const on = a.dataset.nav === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function todayLabel() {
    const d = new Date();
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + util.WEEK_CN[d.getDay()];
  }

  /* ---------------- 渲染 ---------------- */
  let lastRoute = null;

  App.render = function () {
    const id = routeId();
    const mod = MODULES.find((m) => m.id === id) || MODULES[0];
    const view = $('#view');
    if (!view) return;
    App.current = mod.id;

    // 部分模块入口需要初始化
    if (mod.id === 'report' && App.Report && App.Report.beforeRender) App.Report.beforeRender();

    const renderer = App.views[mod.id];
    let html = '';
    try {
      html = renderer ? renderer() : UI.empty('🛠', '模块加载中');
    } catch (err) {
      console.error('[工作台] 渲染失败：', err);
      html = '<div class="card"><div class="empty"><div class="empty-ico">⚠️</div><strong>这个板块加载出错了</strong><span>' +
        esc(err.message || '未知错误') + '</span></div></div>';
    }

    view.innerHTML = html;
    view.classList.remove('is-entering');
    // 触发动画
    void view.offsetWidth;
    view.classList.add('is-entering');

    const title = $('#pageTitle');
    const sub = $('#pageSub');
    if (title) title.textContent = mod.name;
    if (sub) sub.textContent = mod.sub;
    document.title = mod.name + ' · 我的工作台';

    updateNav(mod.id);

    if (lastRoute !== id) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      lastRoute = id;
    }
    closeNav();
    if (App.afterRender) App.afterRender(mod.id);
  };

  function go(id) {
    if (routeId() === id) return;
    location.hash = '#/' + id;
  }
  App.go = go;

  /* ---------------- 移动端导航 ---------------- */
  function openNav() {
    document.body.classList.add('nav-open');
    const b = $('#backdrop');
    if (b) b.setAttribute('aria-hidden', 'false');
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    const b = $('#backdrop');
    if (b) b.setAttribute('aria-hidden', 'true');
  }

  /* ---------------- 下载 ---------------- */
  function downloadFile(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  App.downloadFile = downloadFile;

  /* ---------------- 设置视图 ---------------- */
  const ABOUT_TEXT = '这是一个完全本地运行的个人工作台：不需要注册、不联网、没有服务器，所有记录只存在当前浏览器。';

  function settingsView() {
    const st = Store.state;
    const usage = Store.usage();
    const percent = Math.min(100, (usage.bytes / (5 * 1024 * 1024)) * 100);
    const noteCount = App.allNotes().length;
    const taskCount = (st.checkin.tasks || []).length + (st.todos || []).length;
    const photoCount = (st.body.records || []).reduce((n, r) => n + ((r.photos || []).length), 0);

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>数据与偏好</h2>' +
      '<p>每一项记录都会实时自动保存到本机浏览器。换设备或清理浏览器前，记得先导出备份。</p></div></div>' +

      '<div class="grid">' +
        '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🗂️</div><div class="card-head-text">' +
            '<h2>数据备份</h2><p>一份 JSON 包含全部文字、图片与历史记录</p></div></div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>导出全部数据备份</strong>' +
            '<p>建议每周导出一次，存到网盘或电脑里。</p></div>' +
            '<div class="sr-actions"><button type="button" class="btn" data-act="settings.export">' + ICON('download') + '导出备份</button></div>' +
          '</div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>导入备份文件</strong>' +
            '<p>导入会覆盖当前的全部数据，请确认后再操作。</p></div>' +
            '<div class="sr-actions">' +
              '<label class="btn btn--ghost" for="importFile">' + ICON('upload') + '选择文件</label>' +
              '<input type="file" id="importFile" accept=".json,application/json" class="file-hidden">' +
            '</div>' +
          '</div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>存储空间</strong>' +
            '<p>已用 ' + (usage.kb < 1024 ? usage.kb.toFixed(1) + ' KB' : (usage.mb).toFixed(2) + ' MB') +
            ' · 共 ' + taskCount + ' 条任务、' + noteCount + ' 条笔记、' + photoCount + ' 张照片</p>' +
            '<div class="bar storage-bar"><i style="width:' + percent.toFixed(2) + '%"></i></div></div>' +
          '</div>' +
        '</section>' +

        '<section class="card">' +
          '<div class="card-head"><div class="ico-box">📅</div><div class="card-head-text">' +
            '<h2>周报与提醒</h2><p>让系统主动帮你回看</p></div></div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>每周自动生成周报</strong>' +
            '<p>每周第一次打开工作台时，自动扫描所有板块并生成。</p></div>' +
            '<div class="sr-actions"><label class="check-option"><input type="checkbox" data-change="settings.weeklyAuto"' +
              ((st.settings.weeklyAuto !== false) ? ' checked' : '') + '> 开启</label></div>' +
          '</div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>耗材提前提醒</strong>' +
            '<p>距离建议更换日还有几天时开始标黄提示。</p></div>' +
            '<div class="sr-actions" style="max-width:118px;align-items:center"><input type="number" min="1" max="60" step="1" value="' +
              esc(st.settings.replaceWarnDays || 7) + '" data-change="settings.warnDays" aria-label="提前提醒天数" ' +
              'style="width:74px;min-height:40px;padding:8px 10px">' +
              '<span style="font-size:12px;color:var(--faint)">天</span></div>' +
          '</div>' +
          '<div class="settings-row">' +
            '<div class="sr-text"><strong>隐私说明</strong><p>数据存在哪里、如何删除。</p></div>' +
            '<div class="sr-actions"><button type="button" class="btn btn--quiet" data-act="privacy.open">查看</button></div>' +
          '</div>' +
        '</section>' +
      '</div>' +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">🔐</div><div class="card-head-text">' +
          '<h2>隐私与安全</h2><p>完全离线，不上传任何内容</p></div></div>' +
        '<div class="privacy-text">' +
          '<p>' + esc(ABOUT_TEXT) + '关闭页面后数据仍在，刷新不会丢失，但浏览器「清除网站数据」、无痕模式或更换设备会导致数据消失。</p>' +
          '<p style="margin-top:8px">本应用不会索取账号、位置或通讯录权限；穿搭参考图、体态照片均由浏览器本地生成与保存，不会发送到任何服务器。</p>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">⚠️</div><div class="card-head-text">' +
          '<h2>危险操作</h2><p>清空后无法恢复，请先导出备份</p></div></div>' +
        '<div class="settings-row">' +
          '<div class="sr-text"><strong>清空全部数据</strong><p>删除此浏览器中工作台的所有记录、照片与周报。</p></div>' +
          '<div class="sr-actions"><button type="button" class="btn btn--ghost" style="color:var(--danger);border-color:rgba(168,86,63,.28)" data-act="settings.clear">清空全部数据</button></div>' +
        '</div>' +
      '</section>' +

      '<p style="text-align:center;font-size:11px;color:var(--ghost);padding:6px 0 10px">我的工作台 · Personal Life OS · 本地版 v1.0</p>' +
    '</div>';
  }

  App.views.settings = settingsView;

  /* ---------------- 隐私 ---------------- */
  const PRIVACY_HTML =
    '<div class="privacy-text">' +
      '<p>这个工作台把「隐私」放在第一位：</p>' +
      '<ul>' +
        '<li>所有打卡、笔记、照片、存钱记录，只保存在你当前使用的浏览器里（localStorage）。</li>' +
        '<li>没有账号系统、没有服务器、没有埋点，也不会上传或同步任何内容。</li>' +
        '<li>清除浏览器网站数据、使用无痕模式或换设备，数据都会消失。</li>' +
        '<li>建议每周到「设置 → 导出全部数据备份」，把 JSON 文件存到网盘或电脑。</li>' +
      '</ul>' +
      '<h4>你可以完全掌控</h4>' +
      '<p>随时在设置里导出、导入或清空全部数据；导入备份会覆盖当前内容。</p>' +
      '<h4>关于照片</h4>' +
      '<p>体态照片在上传时会压缩并转为本地图片数据，仅存于此浏览器，不会发送到网络。</p>' +
    '</div>';

  function privacyModal(firstTime) {
    const mask = UI.modal({
      title: firstTime ? '欢迎，先说说隐私' : '隐私与数据说明',
      desc: firstTime ? '这是一份只属于你的本地工作台。' : '所有数据都留在本机浏览器中。',
      body: PRIVACY_HTML,
      form: false,
      wide: true,
      footer: firstTime
        ? '<button type="button" class="btn btn--ghost" data-privacy-read>再看看说明</button>' +
          '<button type="button" class="btn" data-privacy-ok>我已了解，开始使用</button>'
        : '<button type="button" class="btn" data-modal-close>知道了</button>',
    });

    const ok = mask.querySelector('[data-privacy-ok]');
    if (ok) {
      ok.addEventListener('click', () => {
        Store.state.meta.privacyAccepted = true;
        Store.state.meta.firstRun = false;
        Store.save({ immediate: true });
        UI.closeModal();
        UI.toast('已开启，所有数据只保存在本机');
      });
    }
    const read = mask.querySelector('[data-privacy-read]');
    if (read) {
      read.addEventListener('click', () => {
        const scroller = mask.querySelector('.modal');
        if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        read.textContent = '数据只在你的浏览器里';
      });
    }
  }

  /* ---------------- 设置动作 ---------------- */
  App.actions['settings.export'] = function () {
    Store.flush();
    const stamp = new Date();
    const name = '工作台备份-' + util.dateStr(stamp).replace(/-/g, '') + '-' +
      util.pad2(stamp.getHours()) + util.pad2(stamp.getMinutes()) + '.json';
    App.downloadFile(name, Store.exportJSON(), 'application/json');
    UI.toast('备份已导出，请妥善保存');
  };

  App.actions['settings.clear'] = async function () {
    const ok = await UI.confirm({
      title: '清空全部数据？',
      message: '所有任务、笔记、照片、存钱记录和周报都会被永久删除，且无法恢复。建议先导出备份。',
      okText: '确定清空',
      danger: true,
    });
    if (!ok) return;
    const accepted = Store.state.meta.privacyAccepted;
    Store.restore();
    Store.state.meta.privacyAccepted = accepted;
    Store.save({ immediate: true });
    App.render();
    UI.toast('已清空全部数据');
  };

  document.addEventListener('change', async function (e) {
    const input = e.target;
    if (input.id === 'importFile') {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      let text = '';
      try {
        text = await file.text();
      } catch (err) {
        UI.toast('无法读取这个文件', 'warn');
        return;
      }
      const ok = await UI.confirm({
        title: '导入备份并覆盖？',
        message: '将使用「' + file.name + '」覆盖当前全部数据。覆盖后当前内容无法恢复，确定继续吗？',
        okText: '覆盖并导入',
        danger: true,
      });
      if (!ok) return;
      try {
        Store.importJSON(text);
        App.render();
        UI.toast('备份已导入，数据已恢复');
      } catch (err) {
        UI.toast(err.message || '导入失败', 'warn');
      }
      return;
    }

    const el = input.closest ? input.closest('[data-change]') : null;
    if (!el) return;
    const fn = App.actions[el.dataset.change];
    if (fn) await fn(el, e);
  });

  /* ---------------- 全局事件 ---------------- */
  document.addEventListener('click', async function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.tagName === 'BUTTON' && el.type === 'submit') return;
    if (el.closest('.check-row') && el.tagName !== 'INPUT' && !el.dataset.act) return;
    const fn = App.actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    if (el.closest('label') && el.tagName === 'BUTTON') {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await fn(el, e);
    } catch (err) {
      console.error(err);
      UI.toast(err.message || '操作失败', 'warn');
    }
  });

  document.addEventListener('submit', async function (e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = App.forms[form.dataset.form];
    if (!fn) return;
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    try {
      await fn(data, form);
    } catch (err) {
      console.error(err);
      UI.toast(err.message || '保存失败', 'warn');
    }
  });

  // 笔记展开时记录「已查看」，用于 30 天未读检查
  document.addEventListener('toggle', function (e) {
    const d = e.target;
    if (d && d.matches && d.matches('details[data-note-id]') && d.open) {
      App.markNoteViewed(d.dataset.noteId);
    }
  }, true);

  // 图片上传
  document.addEventListener('change', async function (e) {
    const input = e.target;
    if (!input.matches || !input.matches('[data-photo]')) return;
    const files = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!files.length) return;
    if (App.actions['body.uploadPhotos']) {
      await App.actions['body.uploadPhotos'](input, files);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      UI.closeModal();
      closeNav();
      $$('.lightbox').forEach((el) => el.remove());
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      Store.flush();
      UI.toast('已保存');
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-nav]')) closeNav();
  });

  window.addEventListener('hashchange', function () {
    App.render();
  });

  window.addEventListener('beforeunload', function () {
    Store.flush();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') Store.flush();
  });

  /* ---------------- 全局 UI 动作 ---------------- */
  App.actions['ui.toggleNav'] = function () {
    if (document.body.classList.contains('nav-open')) closeNav();
    else openNav();
  };
  App.actions['ui.closeNav'] = function () { closeNav(); };
  App.actions['ui.tab'] = function (el) { App.setTab(el.dataset.module, el.dataset.tab); };
  App.actions['privacy.open'] = function () { privacyModal(false); };
  App.actions['photo.view'] = function (el) {
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (img) UI.lightbox(img.src, el.dataset.caption || img.alt || '');
  };

  App.actions['settings.weeklyAuto'] = function (el) {
    Store.state.settings.weeklyAuto = !!el.checked;
    Store.save();
    UI.toast(el.checked ? '已开启每周自动周报' : '已关闭自动周报');
  };
  App.actions['settings.warnDays'] = function (el) {
    const v = util.clamp(util.toNum(el.value, 7), 1, 60);
    el.value = v;
    Store.state.settings.replaceWarnDays = v;
    Store.save();
    UI.toast('提醒天数已更新');
  };

  /* ---------------- 启动 ---------------- */
  function boot() {
    Store.init();
    App.state = Store.state;
    renderNav();
    const tl = $('#todayLabel');
    if (tl) tl.textContent = todayLabel();
    App.render();

    if (!Store.state.meta.privacyAccepted) {
      setTimeout(() => privacyModal(true), 350);
    }

    // 每周自动周报
    setTimeout(function () {
      if (App.Report && App.Report.ensureWeekly) {
        const created = App.Report.ensureWeekly();
        if (created) {
          UI.toast('新的一周，周报已自动生成');
          if (App.current === 'report') App.render();
        }
      }
    }, 700);

    // Service Worker（仅 http/https 环境）
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('[工作台] Service Worker 未注册：', err.message);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
