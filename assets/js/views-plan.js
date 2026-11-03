/* =========================================================
   板块：打卡 & 待办 / 灵感 / 备考计划 / 技能学习
   ========================================================= */
(function () {
  'use strict';

  const { Store, util, UI } = App;
  const { esc, dateStr, fmtDay, fmtDayFull, weekdayCN, dayDiff, daysUntil, addDays } = util;
  const ICON = UI.ICON;

  function tabBar(moduleId, current, tabs) {
    return '<div class="tabs" role="tablist">' + tabs.map((t) =>
      '<button type="button" class="tab' + (t.id === current ? ' is-active' : '') + '" role="tab" aria-selected="' +
      (t.id === current) + '" data-act="ui.tab" data-module="' + moduleId + '" data-tab="' + t.id + '">' +
      '<span class="tab-dot"></span>' + esc(t.label) +
      (t.count != null ? ' <span class="count-chip">' + t.count + '</span>' : '') +
      '</button>').join('') + '</div>';
  }

  function splitTags(str) {
    return String(str || '').split(/[,，、;；\s]+/).map((s) => s.trim()).filter(Boolean);
  }

  function noteItem(n, moduleId, opts) {
    const o = opts || {};
    const tags = splitTags(n.tags);
    const link = App.safeUrl(n.link);
    const viewed = n.lastViewedAt
      ? '最近查看 ' + fmtDay(dateStr(new Date(n.lastViewedAt)))
      : '尚未展开查看';
    return '<details class="note-item" data-note-id="' + esc(n.id) + '">' +
      '<summary><span>' + esc(n.title) + '</span>' +
        (tags[0] ? '<span class="tag">' + esc(tags[0]) + '</span>' : '') +
        '<svg class="ic chev"><use href="#i-arrow"/></svg></summary>' +
      '<div class="note-body">' + esc(n.content || '（暂无正文）') +
        (link ? '<div class="link-list"><div class="link-row">' + ICON('external') +
          '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + esc(link) + '</a></div></div>' : '') +
        (tags.length ? '<div class="note-tags" style="margin-top:10px">' +
          tags.map((t) => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' : '') +
        '<div class="note-foot">' +
          '<span>' + viewed + '</span>' +
          '<span>创建 ' + fmtDay(dateStr(new Date(n.createdAt))) + '</span>' +
          '<span style="margin-left:auto;display:flex;gap:10px">' +
            '<button type="button" class="link" data-act="' + moduleId + '.note.edit" data-id="' + esc(n.id) + '">编辑</button>' +
            '<button type="button" class="link link--danger" data-act="' + moduleId + '.note.del" data-id="' + esc(n.id) + '">删除</button>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</details>';
  }

  /* =======================================================
     打卡 & 待办
     ======================================================= */
  function checkinStreak() {
    const doneDates = new Set(
      Store.state.checkin.tasks.filter((t) => t.done).map((t) => t.date)
    );
    const d = new Date();
    if (!doneDates.has(dateStr(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (doneDates.has(dateStr(d)) && streak < 4000) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  App.views.checkin = function () {
    const st = Store.state;
    const today = dateStr();
    const sel = App.ui.checkinDate || today;
    const dateTasks = st.checkin.tasks
      .filter((t) => t.date === sel)
      .sort((a, b) => a.createdAt - b.createdAt);
    const doneSel = dateTasks.filter((t) => t.done).length;
    const pct = dateTasks.length ? Math.round((doneSel / dateTasks.length) * 100) : 0;
    const todayTasks = st.checkin.tasks.filter((t) => t.date === today);
    const todayDone = todayTasks.filter((t) => t.done).length;
    const streak = checkinStreak();
    const todos = st.todos || [];
    const work = todos.filter((t) => t.category === 'work');
    const long = todos.filter((t) => t.category !== 'work');
    const openCount = todos.filter((t) => !t.done).length;

    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));

    const dateStrip = days.map((d) => {
      const dd = util.parseDay(d);
      const isActive = d === sel;
      const taskCount = st.checkin.tasks.filter((t) => t.date === d).length;
      return '<button type="button" class="date-pill' + (isActive ? ' is-active' : '') +
        (d === today ? ' is-today' : '') + '" data-act="checkin.date" data-date="' + d + '">' +
        '<b>' + dd.getDate() + '</b><span>' + weekdayCN(d).replace('周', '') +
        (taskCount ? ' · ' + taskCount : '') + '</span></button>';
    }).join('');

    function todoSection(title, icon, category, list) {
      const sorted = list.slice().sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
      const left = list.filter((t) => !t.done).length;
      return '<div class="sub-head">' +
          '<span style="font-size:14px">' + icon + '</span>' +
          '<h3>' + title + '</h3><span class="count-chip">' + left + ' 待完成</span>' +
          '<span class="line"></span>' +
        '</div>' +
        '<form class="add-form" data-form="todo.add">' +
          '<input type="hidden" name="category" value="' + category + '">' +
          '<input type="text" name="title" placeholder="' +
            (category === 'work' ? '添加一项工作任务…' : '添加一个长期计划…') + '" required maxlength="200">' +
          '<button type="submit" class="btn">' + ICON('plus') + '添加</button>' +
        '</form>' +
        '<div class="check-list">' +
        (sorted.length ? sorted.map((t) => App.checkRow({
          id: t.id,
          checked: t.done,
          label: t.title,
          change: 'todo.toggle',
          delAct: 'todo.del',
          meta: t.done ? '已完成' : '',
        })).join('') : UI.empty(category === 'work' ? '🗂' : '🌱', '这里还是空的',
          category === 'work' ? '把今天的工作拆成能完成的小步。' : '写下一件想在更长时间里完成的事。')) +
        '</div>';
    }

    return '<div class="stack">' +

      '<div class="today-banner">' +
        '<div class="tb-date"><strong>' + util.fmtDay(today) + '</strong><span>' +
          weekdayCN(today) + ' · ' + today + '</span></div>' +
        '<div class="tb-sep"></div>' +
        '<div class="tb-stats">' +
          '<div class="tb-stat"><div class="n">' + todayDone + ' / ' + todayTasks.length + '</div><div class="l">今日打卡</div></div>' +
          '<div class="tb-stat"><div class="n">' + streak + ' 天</div><div class="l">连续打卡</div></div>' +
          '<div class="tb-stat"><div class="n">' + openCount + '</div><div class="l">待办未完成</div></div>' +
        '</div>' +
        '<div class="ring" style="--p:' + pct + '"><b>' + pct + '%</b></div>' +
      '</div>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div class="ico-box">📋</div>' +
          '<div class="card-head-text"><h2>每日打卡 <span class="count-chip count-chip--olive">' +
            doneSel + '/' + dateTasks.length + '</span></h2>' +
            '<p>像备忘录一样，自由写下今天要做的事。</p></div>' +
          '<div class="head-actions head-actions--date"><input type="date" value="' + sel + '" data-change="checkin.jumpDate" ' +
            'aria-label="选择日期" style="min-height:36px;width:142px;font-size:13px;padding:6px 10px"></div>' +
        '</div>' +
        '<div class="date-strip date-strip--week">' + dateStrip + '</div>' +
        '<div class="sub-head" style="margin-top:12px"><h3>' +
          (sel === today ? '今天' : fmtDayFull(sel)) + '</h3><span class="count-chip">' + doneSel + ' 已完成</span>' +
          '<span class="line"></span></div>' +
        '<form class="add-form" data-form="checkin.add">' +
          '<input type="hidden" name="date" value="' + sel + '">' +
          '<input type="text" name="text" placeholder="' + (sel === today ? '今天想完成什么？' : '为这一天添加一件事…') +
            '" required maxlength="300">' +
          '<button type="submit" class="btn">' + ICON('plus') + '添加</button>' +
        '</form>' +
        '<div class="check-list" style="margin-top:8px">' +
        (dateTasks.length ? dateTasks.map((t) => App.checkRow({
          id: t.id,
          checked: t.done,
          label: t.text,
          change: 'checkin.toggle',
          delAct: 'checkin.del',
          meta: t.done ? '已打卡' : '',
        })).join('') : UI.empty('📝', '这一天还没有打卡事项', '先写下一件小事，完成后勾选它。')) +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div class="ico-box">✅</div>' +
          '<div class="card-head-text"><h2>待办清单 <span class="count-chip">' + openCount + ' 待完成</span></h2>' +
            '<p>工作任务与长期后续计划，分开收好。</p></div>' +
        '</div>' +
        todoSection('工作任务', '🗂', 'work', work) +
        todoSection('长期后续计划', '🌱', 'long', long) +
      '</section>' +

    '</div>';
  };

  App.actions['checkin.date'] = function (el) {
    App.ui.checkinDate = el.dataset.date;
    App.render();
  };

  App.actions['checkin.jumpDate'] = function (el) {
    App.ui.checkinDate = el.value || dateStr();
    App.render();
  };

  App.actions['checkin.toggle'] = function (el) {
    const task = Store.state.checkin.tasks.find((t) => t.id === el.dataset.id);
    if (!task) return;
    task.done = el.checked;
    task.doneAt = el.checked ? Date.now() : null;
    App.commit('checkin');
  };

  App.actions['checkin.del'] = async function (el) {
    const task = Store.state.checkin.tasks.find((t) => t.id === el.dataset.id);
    if (!task) return;
    const ok = await UI.confirm({
      title: '删除这条打卡？',
      message: '「' + task.text.slice(0, 40) + (task.text.length > 40 ? '…' : '') + '」将被删除。',
      okText: '删除',
    });
    if (!ok) return;
    App.deleteById(Store.state.checkin.tasks, task.id);
    App.commit('checkin');
    UI.toast('已删除');
  };

  App.actions['todo.toggle'] = function (el) {
    const todo = (Store.state.todos || []).find((t) => t.id === el.dataset.id);
    if (!todo) return;
    todo.done = el.checked;
    todo.doneAt = el.checked ? Date.now() : null;
    App.commit('checkin');
  };

  App.actions['todo.del'] = async function (el) {
    const todo = (Store.state.todos || []).find((t) => t.id === el.dataset.id);
    if (!todo) return;
    const ok = await UI.confirm({
      title: '删除这条待办？',
      message: '「' + todo.title.slice(0, 40) + (todo.title.length > 40 ? '…' : '') + '」将被删除。',
      okText: '删除',
    });
    if (!ok) return;
    App.deleteById(Store.state.todos, todo.id);
    App.commit('checkin');
    UI.toast('已删除');
  };

  App.forms['checkin.add'] = function (data) {
    const text = String(data.text || '').trim();
    if (!text) return;
    Store.state.checkin.tasks.push({
      id: util.uid('ck'),
      date: data.date || dateStr(),
      text,
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    });
    App.commit('checkin');
  };

  App.forms['todo.add'] = function (data) {
    const title = String(data.title || '').trim();
    if (!title) return;
    Store.state.todos.push({
      id: util.uid('td'),
      title,
      category: data.category === 'long' ? 'long' : 'work',
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    });
    App.commit('checkin');
  };

  /* =======================================================
     灵感
     ======================================================= */
  App.views.inspirations = function () {
    const st = Store.state;
    const filter = App.ui.inspFilter || 'all';
    const all = st.inspirations || [];
    const list = all.filter((x) => {
      if (filter === 'open') return !x.done;
      if (filter === 'done') return x.done;
      return true;
    }).sort((a, b) => (a.done === b.done ? b.createdAt - a.createdAt : (a.done ? 1 : -1)));

    const doneCount = all.filter((x) => x.done).length;

    const filters = [
      { id: 'all', label: '全部', n: all.length },
      { id: 'open', label: '待实现', n: all.length - doneCount },
      { id: 'done', label: '已完成', n: doneCount },
    ];

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>灵感的抽屉</h2>' +
        '<p>不必完整，先记下来。完成后用绿色勾选标记。</p></div></div>' +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">🎬</div><div class="card-head-text">' +
          '<h2>记下一个灵感</h2><p>一句话、一个画面、一个突然想到的点子</p></div></div>' +
        '<form data-form="insp.add" class="stack" style="gap:11px">' +
          '<textarea name="text" rows="3" placeholder="此刻想到的是……" required maxlength="2000"></textarea>' +
          '<div class="form-row">' +
            '<div class="field" style="flex:1"><input type="text" name="source" placeholder="来源（可选）：一本书 / 一个人 / 一个瞬间" maxlength="120"></div>' +
            '<button type="submit" class="btn">' + ICON('plus') + '记下来</button>' +
          '</div>' +
        '</form>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">🗂</div><div class="card-head-text">' +
          '<h2>灵感清单 <span class="count-chip">' + all.length + '</span></h2>' +
          '<p>已实现 ' + doneCount + ' 条</p></div></div>' +
        '<div class="tabs" style="margin-bottom:10px">' + filters.map((f) =>
          '<button type="button" class="tab' + (filter === f.id ? ' is-active' : '') +
          '" data-act="insp.filter" data-filter="' + f.id + '"><span class="tab-dot"></span>' +
          f.label + ' <span class="count-chip">' + f.n + '</span></button>').join('') + '</div>' +
        '<div class="check-list">' +
        (list.length ? list.map((x) =>
          App.checkRow({
            id: x.id,
            checked: x.done,
            label: x.text,
            sub: (x.source ? x.source + ' · ' : '') + fmtDay(dateStr(new Date(x.createdAt))) +
              (x.done ? ' · 已实现' : ''),
            change: 'insp.toggle',
            delAct: 'insp.del',
          })
        ).join('') : UI.empty('🎬', '这里还没有灵感', '把刚刚闪过的那句话记下来吧。')) +
        '</div>' +
      '</section>' +
    '</div>';
  };

  App.actions['insp.filter'] = function (el) {
    App.ui.inspFilter = el.dataset.filter;
    App.render();
  };

  App.actions['insp.toggle'] = function (el) {
    const item = (Store.state.inspirations || []).find((x) => x.id === el.dataset.id);
    if (!item) return;
    item.done = el.checked;
    item.doneAt = el.checked ? Date.now() : null;
    App.commit('inspirations');
  };

  App.actions['insp.del'] = async function (el) {
    const item = (Store.state.inspirations || []).find((x) => x.id === el.dataset.id);
    if (!item) return;
    const ok = await UI.confirm({
      title: '删除这条灵感？',
      message: '删除后无法恢复。',
      okText: '删除',
    });
    if (!ok) return;
    App.deleteById(Store.state.inspirations, item.id);
    App.commit('inspirations');
    UI.toast('已删除');
  };

  App.forms['insp.add'] = function (data, form) {
    const text = String(data.text || '').trim();
    if (!text) return;
    (Store.state.inspirations || (Store.state.inspirations = [])).push({
      id: util.uid('in'),
      text,
      source: String(data.source || '').trim(),
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    });
    App.commit('inspirations');
    UI.toast('灵感已收好');
  };

  /* =======================================================
     备考计划
     ======================================================= */
  App.views.exam = function () {
    const st = Store.state;
    const exam = st.exam;
    const tab = App.tab('exam', 'plans');
    const plans = exam.plans || [];
    const records = exam.records || [];
    const notes = exam.notes || [];
    const doneCount = plans.filter((p) => p.done).length;
    const totalMinutes = records.reduce((n, r) => n + util.toNum(r.minutes), 0);

    let cd;
    if (!exam.date) {
      cd = '<div class="countdown">' +
        '<div class="cd-info"><strong>还没有设置考试日期</strong>' +
        '<p>设置后，这里会自动生成倒计时，提醒你还有多少时间。</p></div>' +
        '<div class="cd-edit"><button type="button" class="btn" data-act="exam.edit">' + ICON('plus') + '设置考试</button></div>' +
      '</div>';
    } else {
      const n = daysUntil(exam.date);
      const passed = n < 0;
      cd = '<div class="countdown">' +
        '<div class="cd-main"><span class="cd-num">' + Math.abs(n) + '</span>' +
          '<span class="cd-unit">' + (passed ? '天前已考' : (n === 0 ? '就是今天' : '天')) + '</span></div>' +
        '<div class="cd-info"><strong>' + esc(exam.name || '目标考试') + '</strong>' +
          '<p>' + fmtDayFull(exam.date) + (passed ? ' · 考试已结束' : n === 0 ? ' · 今天考试，加油' : '') + '</p></div>' +
        '<div class="cd-edit"><button type="button" class="btn btn--ghost btn--sm" data-act="exam.edit">' + ICON('edit') + '修改</button></div>' +
      '</div>';
    }

    let body = '';
    if (tab === 'plans') {
      body = '<div class="sub-head"><h3>学习计划</h3><span class="count-chip">' + doneCount + '/' + plans.length +
          ' 完成</span><span class="line"></span></div>' +
        '<div class="progress-row" style="margin-bottom:14px">' +
          '<div class="bar"><i style="width:' + (plans.length ? Math.round(doneCount / plans.length * 100) : 0) + '%"></i></div>' +
          '<span class="pct">' + (plans.length ? Math.round(doneCount / plans.length * 100) : 0) + '%</span></div>' +
        '<form class="add-form" data-form="exam.plan.add">' +
          '<input type="text" name="title" placeholder="新增一条学习计划，例如：完成高数第三章习题" required maxlength="200">' +
          '<button type="submit" class="btn">' + ICON('plus') + '添加</button></form>' +
        '<div class="check-list" style="margin-top:8px">' +
        (plans.length ? plans.slice().sort((a, b) => (a.done === b.done ? b.createdAt - a.createdAt : (a.done ? 1 : -1)))
          .map((p) => App.checkRow({
            id: p.id, checked: p.done, label: p.title, change: 'exam.plan.toggle', delAct: 'exam.plan.del',
          })).join('') : UI.empty('📚', '还没有学习计划', '把复习内容拆成一条条可勾选的小计划。')) +
        '</div>';

    } else if (tab === 'records') {
      const sorted = records.slice().sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));
      body = '<div class="metrics" style="margin-bottom:16px">' +
          '<div class="metric"><div class="k">累计学习</div><div class="v">' + (totalMinutes / 60).toFixed(1) + '<small>小时</small></div></div>' +
          '<div class="metric"><div class="k">学习记录</div><div class="v">' + records.length + '<small>条</small></div></div>' +
        '</div>' +
        '<form class="add-form add-form--wrap" data-form="exam.record.add">' +
          '<div style="flex:0 0 150px"><input type="date" name="date" value="' + dateStr() + '" required aria-label="学习日期"></div>' +
          '<div style="flex:0 0 100px"><input type="number" name="minutes" min="1" max="1440" step="1" placeholder="分钟" required aria-label="学习分钟数"></div>' +
          '<div style="flex:1 1 220px"><input type="text" name="content" placeholder="今天学了什么？" required maxlength="300" aria-label="学习内容"></div>' +
          '<button type="submit" class="btn">' + ICON('plus') + '记录</button>' +
        '</form>' +
        '<div style="margin-top:14px">' +
        (sorted.length ? sorted.map((r) =>
          '<div class="entry-row"><span class="e-date">' + fmtDay(r.date) + '</span>' +
          '<span class="e-note" style="flex:1">' + esc(r.content) + '</span>' +
          '<span class="badge">' + util.toNum(r.minutes) + ' 分钟</span>' +
          '<button type="button" class="row-del" data-act="exam.record.del" data-id="' + r.id + '" aria-label="删除" style="opacity:1">' +
          ICON('trash') + '</button></div>').join('')
          : UI.empty('⏱', '还没有学习记录', '每天记一笔，积累会看得见。')) +
        '</div>';

    } else {
      body = '<div class="sub-head"><h3>知识点笔记</h3><span class="count-chip">' + notes.length + ' 条</span>' +
          '<span class="line"></span>' +
          '<button type="button" class="btn btn--sm" data-act="exam.note.add">' + ICON('plus') + '新增笔记</button></div>' +
        (notes.length ? notes.slice().sort((a, b) => b.createdAt - a.createdAt).map((n) => noteItem(n, 'exam')).join('')
          : UI.empty('🗒', '知识库还是空的', '把易错点、公式、解题思路记成笔记，系统会据此向你提问。'));
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>距离目标，还有多少天</h2>' +
        '<p>没有预设任务，按自己的节奏添加计划、记录与笔记。</p></div></div>' +
      cd +
      tabBar('exam', tab, [
        { id: 'plans', label: '学习计划', count: plans.length - doneCount },
        { id: 'records', label: '学习记录', count: records.length },
        { id: 'notes', label: '知识点笔记', count: notes.length },
      ]) +
      '<section class="card">' + body + '</section>' +
    '</div>';
  };

  App.actions['exam.edit'] = function () {
    const exam = Store.state.exam;
    UI.modal({
      title: exam.date ? '修改考试信息' : '设置考试日期',
      desc: '保存后首页会自动显示倒计时。',
      fields: [
        { name: 'name', label: '考试名称', type: 'text', value: exam.name || '', placeholder: '例如：2026 考研 / 雅思 / 教师资格证' },
        { name: 'date', label: '考试日期', type: 'date', value: exam.date || '', required: true },
      ],
      submitText: '保存',
      onSubmit(data) {
        exam.name = String(data.name || '').trim();
        exam.date = data.date;
        App.commit('exam');
        UI.toast('考试信息已更新');
      },
    });
  };

  App.actions['exam.plan.toggle'] = function (el) {
    const p = Store.state.exam.plans.find((x) => x.id === el.dataset.id);
    if (!p) return;
    p.done = el.checked;
    p.doneAt = el.checked ? Date.now() : null;
    App.commit('exam');
  };

  App.actions['exam.plan.del'] = async function (el) {
    const p = Store.state.exam.plans.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const ok = await UI.confirm({ title: '删除这条学习计划？', message: '「' + p.title + '」', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.exam.plans, p.id);
    App.commit('exam');
    UI.toast('已删除');
  };

  App.forms['exam.plan.add'] = function (data) {
    const title = String(data.title || '').trim();
    if (!title) return;
    Store.state.exam.plans.push({ id: util.uid('ep'), title, done: false, createdAt: Date.now() });
    App.commit('exam');
  };

  App.forms['exam.record.add'] = function (data) {
    const content = String(data.content || '').trim();
    const minutes = util.toNum(data.minutes);
    if (!content || minutes <= 0) { UI.toast('请填写学习内容与分钟数', 'warn'); return; }
    Store.state.exam.records.push({
      id: util.uid('er'), date: data.date || dateStr(), minutes, content, createdAt: Date.now(),
    });
    App.commit('exam');
    UI.toast('学习记录已保存');
  };

  App.actions['exam.record.del'] = async function (el) {
    const ok = await UI.confirm({ title: '删除这条学习记录？', message: '删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.exam.records, el.dataset.id);
    App.commit('exam');
  };

  function examNoteModal(note) {
    UI.modal({
      title: note ? '编辑知识点笔记' : '新增知识点笔记',
      fields: [
        { name: 'title', label: '标题', type: 'text', required: true, value: note ? note.title : '', placeholder: '例如：洛必达法则的使用条件' },
        { name: 'content', label: '内容', type: 'textarea', rows: 7, required: true, value: note ? note.content : '', placeholder: '知识点、易错点、公式、解题思路……' },
        { name: 'tags', label: '主题标签', type: 'text', value: note ? note.tags : '', placeholder: '用逗号分隔，例如：高等数学, 极限', hint: '标签会用于周报的主题分析与自动提问' },
      ],
      submitText: note ? '保存修改' : '保存笔记',
      onSubmit(data) {
        const title = String(data.title || '').trim();
        const content = String(data.content || '').trim();
        if (!title || !content) { UI.toast('标题和内容不能为空', 'warn'); return false; }
        if (note) {
          note.title = title;
          note.content = content;
          note.tags = String(data.tags || '').trim();
          note.updatedAt = Date.now();
        } else {
          Store.state.exam.notes.unshift({
            id: util.uid('en'), title, content, tags: String(data.tags || '').trim(),
            createdAt: Date.now(), updatedAt: Date.now(), lastViewedAt: null,
          });
        }
        App.commit('exam');
        UI.toast(note ? '笔记已更新' : '笔记已存入知识库');
      },
    });
  }

  App.actions['exam.note.add'] = function () { examNoteModal(null); };
  App.actions['exam.note.edit'] = function (el) {
    const n = Store.state.exam.notes.find((x) => x.id === el.dataset.id);
    if (n) examNoteModal(n);
  };
  App.actions['exam.note.del'] = async function (el) {
    const n = Store.state.exam.notes.find((x) => x.id === el.dataset.id);
    if (!n) return;
    const ok = await UI.confirm({ title: '删除这条笔记？', message: '「' + n.title + '」删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.exam.notes, n.id);
    App.commit('exam');
    UI.toast('已删除');
  };

  /* =======================================================
     技能学习
     ======================================================= */
  App.views.skills = function () {
    const st = Store.state;
    const tab = App.tab('skills', 'list');
    const skills = st.skills || [];
    const noteCount = skills.reduce((n, s) => n + (s.notes || []).length, 0);

    let body = '';

    if (tab === 'list') {
      body = '<div class="stack" style="gap:16px">' +
        '<form class="add-form add-form--wrap" data-form="skill.add" style="margin-bottom:2px">' +
          '<div style="flex:1 1 200px"><input type="text" name="name" placeholder="想学的技能，例如：视频剪辑 / AI 工具" required maxlength="80"></div>' +
          '<div style="flex:1 1 220px"><input type="text" name="goal" placeholder="目标（可选）：能独立剪出一支 vlog" maxlength="160"></div>' +
          '<button type="submit" class="btn">' + ICON('plus') + '添加技能</button>' +
        '</form>' +
        (skills.length ? skills.map((s) => {
          const notes = (s.notes || []).slice().sort((a, b) => b.createdAt - a.createdAt);
          const links = s.links || [];
          const progress = util.clamp(util.toNum(s.progress), 0, 100);
          return '<section class="card skill-card">' +
            '<div class="skill-top">' +
              '<div class="ico-box" style="width:36px;height:36px;font-size:17px">💡</div>' +
              '<div class="skill-name">' + esc(s.name) + (s.goal ? '<small>' + esc(s.goal) + '</small>' : '') + '</div>' +
              (s.done ? '<span class="badge badge--done">已掌握</span>' : '<span class="badge badge--olive">' + progress + '%</span>') +
              '<button type="button" class="btn btn--quiet btn--sm" data-act="skill.complete" data-id="' + s.id + '">' +
                (s.done ? '重新学习' : '标记完成') + '</button>' +
              '<button type="button" class="row-del" data-act="skill.del" data-id="' + s.id + '" aria-label="删除技能" style="opacity:1">' +
                ICON('trash') + '</button>' +
            '</div>' +
            '<div class="progress-row" style="margin-top:12px">' +
              '<input type="number" class="skill-progress-edit" min="0" max="100" step="5" value="' + progress +
                '" data-change="skill.progress" data-id="' + s.id + '" aria-label="学习进度">' +
              '<div class="bar"><i style="width:' + progress + '%"></i></div>' +
              '<span class="pct">' + progress + '%</span>' +
            '</div>' +
            '<div class="notes-box">' +
              '<div class="notes-head"><h4>学习笔记 · ' + notes.length + '</h4>' +
                '<span style="flex:1"></span>' +
                '<button type="button" class="btn btn--soft btn--sm" data-act="skill.note.add" data-id="' + s.id + '">' +
                  ICON('plus') + '笔记</button>' +
                '<button type="button" class="btn btn--quiet btn--sm" data-act="skill.link.add" data-id="' + s.id + '">' +
                  ICON('external') + '收藏教程</button>' +
              '</div>' +
              (notes.length ? notes.map((n) => noteItem(n, 'skill')).join('')
                : '<div class="empty" style="padding:20px 12px"><span>把看过的教程、踩过的坑记下来，它会变成你的知识库。</span></div>') +
              (links.length ? '<div class="link-list">' + links.map((l) => {
                const url = App.safeUrl(l.url);
                return '<div class="link-row">' + ICON('external') +
                  (url
                    ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.title || l.url) + '</a>'
                    : '<span style="flex:1">' + esc(l.title || l.url) + '</span>') +
                  '<button type="button" class="row-del" data-act="skill.link.del" data-id="' + l.id + '" data-skill="' + s.id +
                  '" aria-label="删除链接" style="opacity:1">' + ICON('trash') + '</button></div>';
              }).join('') + '</div>' : '') +
            '</div>' +
          '</section>';
        }).join('') : '<section class="card">' + UI.empty('💡', '还没有技能卡片',
          '先添加一个想学的技能，再把笔记与教程慢慢放进去。') + '</section>') +
      '</div>';

    } else if (tab === 'quiz') {
      const knowledge = App.Knowledge;
      const qs = knowledge ? knowledge.questions() : [];
      const idx = util.clamp(App.ui.quizIndex || 0, 0, Math.max(0, qs.length - 1));
      const cur = qs[idx];
      const revealed = !!App.ui.quizRevealed;

      body = '<div class="stack" style="gap:16px">' +
        '<div class="quiz-card">' +
          (cur ? (
            '<div class="quiz-kicker" style="font-size:11px;color:var(--olive-3);font-weight:650;letter-spacing:.5px;margin-bottom:8px">' +
              '知识库提问 · ' + (idx + 1) + ' / ' + qs.length + '</div>' +
            '<div class="quiz-q">' + cur.q + '</div>' +
            (revealed ? '<div class="quiz-a"><strong>参考答案</strong><br>' + cur.aHtml + '</div>' : '') +
            '<div class="quiz-actions">' +
              (revealed
                ? '<button type="button" class="btn btn--ghost btn--sm" data-act="quiz.next">下一题 ' + ICON('arrow') + '</button>'
                : '<button type="button" class="btn btn--sm" data-act="quiz.reveal">' + ICON('spark') + '显示答案</button>') +
              '<button type="button" class="btn btn--quiet btn--sm" data-act="quiz.reset">重新开始</button>' +
              '<span style="flex:1"></span>' +
              '<span class="badge">来源：' + esc(cur.source) + '</span>' +
            '</div>'
          ) : '<div class="empty" style="padding:30px 10px">' +
              '<div class="empty-ico">💡</div><strong>还没有足够的知识可以提问</strong>' +
              '<span>先到「技能清单」或「备考笔记」记录几条内容，系统会自动分析主题并反过来向你提问。</span>' +
              '<button type="button" class="btn btn--sm" style="margin-top:12px" data-act="ui.tab" data-module="skills" data-tab="list">去记笔记</button>' +
            '</div>') +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><div class="ico-box">🧠</div><div class="card-head-text">' +
            '<h2>它是怎么提问的</h2><p>从你的标签与笔记中提取主题，遮住关键词让你回忆</p></div></div>' +
          '<p style="font-size:12.5px;color:var(--muted);line-height:1.9">' +
            '问题来自你自己的笔记：系统会找出标签和高频词组，抽出一句包含它的原文，把关键词挖空；' +
            '找不到原句时，就请你复述那条笔记的要点。回答不上来，说明这个主题值得回头补一条更完整的笔记。</p>' +
          (qs.length ? '<div class="quiz-meter"><span>共 ' + knowledge.notes().length + ' 条笔记</span>' +
            '<span>可生成 ' + qs.length + ' 道题</span></div>' : '') +
        '</div>' +
      '</div>';

    } else {
      const knowledge = App.Knowledge;
      const themes = knowledge ? knowledge.topics() : [];
      const currentTerm = App.ui.theme || (themes[0] && themes[0].term);
      const current = themes.find((t) => t.term === currentTerm) || themes[0];
      body = '<div class="stack" style="gap:16px">' +
        '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🧩</div><div class="card-head-text">' +
            '<h2>碎片信息整理 <span class="count-chip">' + themes.length + ' 个主题</span></h2>' +
            '<p>把散落在笔记里的关键词聚在一起，看看你最近在想什么。</p></div></div>' +
          (themes.length ? '<div class="theme-cloud">' + themes.slice(0, 24).map((t) =>
            '<button type="button" class="theme-chip' + (current && current.term === t.term ? ' is-active' : '') +
            '" data-act="theme.select" data-term="' + esc(t.term) + '"' +
            (current && current.term === t.term ? ' style="border-color:var(--olive-line);background:var(--olive-soft-2)"' : '') + '>' +
            '<b>' + esc(t.term) + '</b>' +
            (t.shallow ? '<span style="color:var(--olive-3);font-weight:700" title="记录较碎">·</span>' : '') +
            '<span class="n">' + t.count + '</span></button>').join('') + '</div>'
            : UI.empty('🧺', '还没有可以整理的主题', '记录几条带标签的笔记，系统会自动聚类。')) +
          (themes.some((t) => t.shallow)
            ? '<p style="font-size:12px;color:var(--faint);margin-top:12px">带 · 的主题反复出现，但每次记得很短，可能值得深入一次。</p>' : '') +
        '</section>' +
        (current ? '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🔖</div><div class="card-head-text">' +
            '<h2>「' + esc(current.term) + '」相关的碎片</h2>' +
            '<p>' + current.count + ' 条笔记 · 共约 ' + current.totalChars + ' 字</p></div>' +
            '<div class="head-actions"><button type="button" class="btn btn--sm" data-act="theme.summarize" data-term="' +
              esc(current.term) + '">汇总为一条笔记</button></div></div>' +
          '<div class="stack" style="gap:10px">' + current.notes.map((n) =>
            '<div class="note-item" style="padding:12px 15px">' +
              '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
                '<strong style="font-size:13.5px">' + esc(n.title) + '</strong>' +
                '<span class="badge">' + esc(n._where) + '</span></div>' +
              '<p style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.75">' +
                esc(n._snippet) + '</p>' +
            '</div>').join('') + '</div>' +
        '</section>' : '') +
        '<div class="card card--cream">' +
          '<p style="font-size:12.5px;color:var(--muted);line-height:1.9">' +
            '这些主题由笔记标题、标签与正文中的高频词组自动提取，完全在本地计算。' +
            '如果某个主题反复出现却始终只有零散几句，它可能就是下一步最值得系统学习的方向。</p>' +
        '</div>' +
      '</div>';
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>把碎片，慢慢连成自己的知识</h2>' +
        '<p>视频拍摄、剪辑、AI 工具，或任何想学的兴趣技能。</p></div>' +
        '<div class="ph-actions"><span class="badge badge--olive">' + skills.length + ' 项技能</span>' +
        '<span class="badge">' + noteCount + ' 条笔记</span></div></div>' +
      tabBar('skills', tab, [
        { id: 'list', label: '技能清单', count: skills.length },
        { id: 'quiz', label: '知识库提问' },
        { id: 'themes', label: '碎片整理', count: App.Knowledge ? App.Knowledge.topics().length : 0 },
      ]) +
      body +
    '</div>';
  };

  App.forms['skill.add'] = function (data) {
    const name = String(data.name || '').trim();
    if (!name) return;
    Store.state.skills.push({
      id: util.uid('sk'), name, goal: String(data.goal || '').trim(), progress: 0, done: false,
      notes: [], links: [], createdAt: Date.now(), updatedAt: Date.now(),
    });
    App.commit('skills');
    UI.toast('技能卡片已创建');
  };

  App.actions['skill.progress'] = function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.id);
    if (!s) return;
    const v = util.clamp(util.toNum(el.value), 0, 100);
    el.value = v;
    s.progress = v;
    s.done = v >= 100;
    s.updatedAt = Date.now();
    App.commit('skills');
  };

  App.actions['skill.complete'] = function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.id);
    if (!s) return;
    s.done = !s.done;
    s.progress = s.done ? 100 : Math.min(90, s.progress || 0);
    s.updatedAt = Date.now();
    App.commit('skills');
    UI.toast(s.done ? '已标记为掌握' : '已重新开始学习');
  };

  App.actions['skill.del'] = async function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.id);
    if (!s) return;
    const ok = await UI.confirm({
      title: '删除这个技能？',
      message: '「' + s.name + '」及其 ' + (s.notes || []).length + ' 条笔记都会被删除。',
      okText: '删除',
    });
    if (!ok) return;
    App.deleteById(Store.state.skills, s.id);
    App.commit('skills');
    UI.toast('已删除');
  };

  function skillNoteModal(skill, note) {
    UI.modal({
      title: note ? '编辑学习笔记' : '新增学习笔记 · ' + skill.name,
      fields: [
        { name: 'title', label: '标题', type: 'text', required: true, value: note ? note.title : '', placeholder: '例如：Pr 关键帧的 3 个用法' },
        { name: 'content', label: '笔记内容', type: 'textarea', rows: 6, required: true, value: note ? note.content : '', placeholder: '记录方法、心得、踩过的坑……' },
        { name: 'link', label: '教程链接（可选）', type: 'url', value: note ? (note.link || '') : '', placeholder: 'https://' },
        { name: 'tags', label: '主题标签', type: 'text', value: note ? note.tags : '', placeholder: '用逗号分隔，例如：剪辑, 转场, 节奏' },
      ],
      submitText: note ? '保存修改' : '存入知识库',
      onSubmit(data) {
        const title = String(data.title || '').trim();
        const content = String(data.content || '').trim();
        if (!title || !content) { UI.toast('标题和内容不能为空', 'warn'); return false; }
        if (note) {
          note.title = title;
          note.content = content;
          note.link = String(data.link || '').trim();
          note.tags = String(data.tags || '').trim();
          note.updatedAt = Date.now();
        } else {
          skill.notes = skill.notes || [];
          skill.notes.unshift({
            id: util.uid('sn'), title, content,
            link: String(data.link || '').trim(),
            tags: String(data.tags || '').trim(),
            createdAt: Date.now(), updatedAt: Date.now(), lastViewedAt: null,
          });
        }
        skill.updatedAt = Date.now();
        App.commit('skills');
        UI.toast(note ? '笔记已更新' : '笔记已存入知识库');
      },
    });
  }

  App.actions['skill.note.add'] = function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.id);
    if (s) skillNoteModal(s, null);
  };

  App.actions['skill.note.edit'] = function (el) {
    for (const s of Store.state.skills) {
      const n = (s.notes || []).find((x) => x.id === el.dataset.id);
      if (n) { skillNoteModal(s, n); return; }
    }
  };

  App.actions['skill.note.del'] = async function (el) {
    for (const s of Store.state.skills) {
      const n = (s.notes || []).find((x) => x.id === el.dataset.id);
      if (!n) continue;
      const ok = await UI.confirm({ title: '删除这条笔记？', message: '「' + n.title + '」删除后无法恢复。', okText: '删除' });
      if (!ok) return;
      App.deleteById(s.notes, n.id);
      s.updatedAt = Date.now();
      App.commit('skills');
      UI.toast('已删除');
      return;
    }
  };

  App.actions['skill.link.add'] = function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.id);
    if (!s) return;
    UI.modal({
      title: '收藏教程链接',
      fields: [
        { name: 'title', label: '教程名称', type: 'text', required: true, placeholder: '例如：达芬奇调色入门 30 讲' },
        { name: 'url', label: '链接', type: 'url', required: true, placeholder: 'https://' },
      ],
      submitText: '收藏',
      onSubmit(data) {
        const url = String(data.url || '').trim();
        if (!/^https?:\/\//i.test(url)) { UI.toast('请填写 http(s) 开头的链接', 'warn'); return false; }
        s.links = s.links || [];
        s.links.unshift({ id: util.uid('sl'), title: String(data.title || '').trim() || url, url, createdAt: Date.now() });
        s.updatedAt = Date.now();
        App.commit('skills');
        UI.toast('教程已收藏');
      },
    });
  };

  App.actions['skill.link.del'] = async function (el) {
    const s = Store.state.skills.find((x) => x.id === el.dataset.skill);
    if (!s) return;
    App.deleteById(s.links, el.dataset.id);
    App.commit('skills');
    UI.toast('链接已删除');
  };

  /* 知识库提问 */
  App.actions['quiz.reveal'] = function () {
    App.ui.quizRevealed = true;
    App.render();
  };
  App.actions['quiz.next'] = function () {
    const n = App.Knowledge ? App.Knowledge.questions().length : 0;
    App.ui.quizIndex = n ? ((App.ui.quizIndex || 0) + 1) % n : 0;
    App.ui.quizRevealed = false;
    App.render();
  };
  App.actions['quiz.reset'] = function () {
    App.ui.quizIndex = 0;
    App.ui.quizRevealed = false;
    App.render();
  };

  /* 主题整理 */
  App.actions['theme.select'] = function (el) {
    App.ui.theme = el.dataset.term;
    App.render();
  };

  App.actions['theme.summarize'] = function (el) {
    const term = el.dataset.term;
    const skills = Store.state.skills || [];
    if (!skills.length) { UI.toast('先添加一个技能，才能汇总成笔记', 'warn'); return; }
    const themes = App.Knowledge ? App.Knowledge.topics() : [];
    const theme = themes.find((t) => t.term === term);
    if (!theme) return;
    const content = theme.notes.map((n) => '· ' + n.title + '：' + (n.content || '').replace(/\s+/g, ' ').slice(0, 160)).join('\n');
    UI.modal({
      title: '汇总为一条笔记',
      desc: '把「' + term + '」相关的碎片整理成一条完整笔记。',
      fields: [
        { name: 'skillId', label: '放入技能', type: 'select', options: skills.map((s) => ({ value: s.id, label: s.name })) },
        { name: 'title', label: '笔记标题', type: 'text', required: true, value: term + ' · 主题汇总' },
        { name: 'content', label: '内容（可继续补充）', type: 'textarea', rows: 8, required: true, value: content },
        { name: 'tags', label: '标签', type: 'text', value: term },
      ],
      submitText: '生成汇总笔记',
      onSubmit(data) {
        const s = skills.find((x) => x.id === data.skillId);
        if (!s) return false;
        s.notes = s.notes || [];
        s.notes.unshift({
          id: util.uid('sn'), title: String(data.title || '').trim() || term + ' · 主题汇总',
          content: String(data.content || '').trim(), tags: String(data.tags || term),
          createdAt: Date.now(), updatedAt: Date.now(), lastViewedAt: Date.now(),
        });
        s.updatedAt = Date.now();
        App.commit('skills');
        UI.toast('已汇总为一条新笔记');
      },
    });
  };
})();
