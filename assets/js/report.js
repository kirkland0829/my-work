/* =========================================================
   周报 & 知识库主题分析
   ========================================================= */
(function () {
  'use strict';

  const { Store, util, UI } = App;
  const { esc, dateStr, fmtDay, dayDiff, addDays, toNum, startOfWeek } = util;
  const ICON = UI.ICON;

  /* ---------------- 关键词与主题 ---------------- */
  const STOP = new Set((
    '我们 你们 他们 她们 它们 自己 这个 那个 这些 那些 这样 那样 这里 那里 什么 怎么 为什 什么 ' +
    '如何 是否 可以 可能 应该 需要 觉得 感觉 知道 看到 发现 开始 结束 问题 方法 时候 时间 今天 明天 ' +
    '昨天 现在 已经 因为 所以 但是 如果 就是 不是 没有 还有 以及 而且 或者 虽然 不过 只是 其实 于是 ' +
    '然后 之后 之前 以后 以前 起来 出来 过来 一下 一些 很多 有些 非常 特别 真的 一直 比较 更加 重要 ' +
    '主要 第一 第二 最后 东西 事情 内容 记录 笔记 计划 学习 完成 任务 每日 工作 生活 分享 推荐 希望 ' +
    '喜欢 想要 试试 大家 朋友 有点 一点 这种 那种 每次 这次 下次 上次 有时 地方 方式 方面 过程 结果 ' +
    '原因 情况 状态 目标 习惯 坚持 效率 工具 软件 视频 教程 标题 摘要 备注 目前 目前 进行 相关 通过 ' +
    '对于 关于 根据 以及 同时 另外 此外 比如 例如 包括 选择 使用 版本 功能 支持 设置 管理 整理 分析'
  ).split(/\s+/).filter(Boolean));

  const SINGLE = new Set((
    '的了是在我你他她它们这那就也都还很要会能可不没有和与及或但而且把被让给对从到又还再才只太更最些么吧呢啊呀哦嗯' +
    '着过上下中里外去来说看做用想觉得一个每各某本该此其之于为以因所如若则即并等将已曾正刚常总先却竟吗嘛啦哇哈嘿自' +
    '己时天年日点分秒前后左右大小多少高低长短好坏新旧'
  ).split(''));

  const GENERIC = new Set((
    '技巧 条件 关键 提示 原文 结论 数字 缩头 主题 信息 知识 经验 能力 水平 程度 范围 领域 方向 部分 整体 ' +
    '具体 直接 有效 常见 简单 复杂 基础 进阶 核心 重点 流程 步骤 细节 方式 渠道 平台 案例 场景 需求 ' +
    '用户 产品 服务 系统 设计 代码 数据 文本 文章 语言 结构 逻辑 表达 沟通 团队 项目 进度 方案 策略 ' +
    '效果 价值 成本 收入 支出 预算 精力 健康 饮食 运动 睡眠 皮肤 妆容 穿搭 风格 颜色 身材 场合 衣服 ' +
    '单品 搭配 内容 要点 笔记 记录 时候 地方 东西 事情 感觉 想法'
  ).split(/\s+/).filter(Boolean));

  function ngrams(text, maxN) {
    const out = [];
    const runs = String(text || '').match(/[\u4e00-\u9fa5]+/g) || [];
    runs.forEach((run) => {
      for (let n = 2; n <= (maxN || 3); n++) {
        for (let i = 0; i <= run.length - n; i++) {
          const w = run.slice(i, i + n);
          if (STOP.has(w) || GENERIC.has(w)) continue;
          let bad = false;
          for (let k = 0; k < w.length; k++) {
            if (SINGLE.has(w[k])) { bad = true; break; }
          }
          if (!bad) out.push(w);
        }
      }
    });
    const latin = String(text || '').match(/[A-Za-z]{2,}/g) || [];
    latin.forEach((w) => out.push(w.toLowerCase()));
    return out;
  }

  function splitTags(str) {
    return String(str || '').split(/[,，、;；\s]+/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 12);
  }

  function snippetFor(note, term) {
    const content = String(note.content || '');
    const sentences = content.split(/[。！？!?；;\n]+/).map((s) => s.trim()).filter(Boolean);
    let hit = sentences.find((s) => s.toLowerCase().indexOf(String(term).toLowerCase()) >= 0);
    if (!hit) hit = sentences[0] || content;
    if (!hit) hit = note.title;
    return hit.length > 110 ? hit.slice(0, 110) + '…' : hit;
  }

  const Knowledge = {
    notes() {
      return App.allNotes();
    },

    /** 所有可读的主题：优先使用用户写的标签，再补充反复出现的词组 */
    topics() {
      const notes = this.notes();
      const byId = new Map(notes.map((n) => [n.id, n]));
      const map = new Map();
      const add = (term, note, kind) => {
        if (!term || term.length < 2) return;
        if (STOP.has(term) || GENERIC.has(term)) return;
        let c = map.get(term);
        if (!c) {
          c = { term, ids: new Set(), tagHits: 0, titleHits: 0, contentHits: 0 };
          map.set(term, c);
        }
        c.ids.add(note.id);
        if (kind === 'tag') c.tagHits++;
        else if (kind === 'title') c.titleHits++;
        else c.contentHits++;
      };

      const tagTerms = [];
      notes.forEach((note) => {
        splitTags(note.tags).forEach((tag) => {
          tagTerms.push(tag);
          add(tag, note, 'tag');
        });
        ngrams(note.title, 3).forEach((t) => add(t, note, 'title'));
        ngrams(note.content, 3).forEach((t) => add(t, note, 'content'));
      });

      const tagLower = tagTerms.map((t) => t.toLowerCase());
      const isFragmentOfTag = (term) => {
        const lower = String(term).toLowerCase();
        return tagLower.some((tag) => tag.length >= lower.length && tag.indexOf(lower) >= 0);
      };

      let list = [];
      map.forEach((c) => {
        // 没有出现在标签里的词组，必须在至少 3 条笔记中重复出现
        if (c.tagHits === 0 && (c.ids.size < 3 || isFragmentOfTag(c.term))) return;
        const related = [];
        c.ids.forEach((id) => {
          const n = byId.get(id);
          if (n) related.push(Object.assign({}, n, { _snippet: snippetFor(n, c.term) }));
        });
        if (!related.length) return;
        const totalChars = related.reduce((n, x) => n + String(x.content || '').length, 0);
        const avg = totalChars / related.length;
        list.push({
          term: c.term,
          count: related.length,
          notes: related,
          totalChars,
          shallow: c.ids.size >= 2 && avg < 150,
          lastAt: Math.max.apply(null, related.map((x) => x.updatedAt || x.createdAt || 0)),
          score: c.tagHits * 30 + c.titleHits * 5 + c.ids.size * 8 + Math.min(10, totalChars / 300) + c.term.length,
        });
      });

      // 去掉被更长词覆盖的碎片，例如「关键」被「关键帧」覆盖
      list.sort((a, b) => b.score - a.score);
      const drop = new Set();
      list.forEach((a, i) => {
        list.forEach((b, j) => {
          if (i === j) return;
          if (b.term.length > a.term.length && b.term.indexOf(a.term) >= 0 && b.count >= a.count) {
            drop.add(a.term);
          }
        });
      });
      list = list.filter((t) => !drop.has(t.term));
      return list.sort((a, b) => b.count - a.count || b.score - a.score);
    },

    themes(minCount) {
      const min = Math.max(2, minCount || 2);
      return this.topics().filter((t) => t.count >= min);
    },

    questions(limit) {
      const themes = this.topics();
      const notes = this.notes();
      const qs = [];
      const seen = new Set();

      themes.forEach((theme) => {
        theme.notes.slice(0, 2).forEach((note) => {
          const key = theme.term + '|' + note.id;
          if (seen.has(key)) return;
          seen.add(key);
          const content = String(note.content || '');
          const termLower = String(theme.term).toLowerCase();
          const sentences = content.split(/[。！？!?；;\n]+/).map((s) => s.trim())
            .filter((s) => s.length >= 8 && s.toLowerCase().indexOf(termLower) >= 0);
          const source = note._where + ' · ' + note.title;
          if (sentences.length) {
            const s = sentences.sort((a, b) => b.length - a.length)[0];
            const idx = s.toLowerCase().indexOf(termLower);
            const q = '填空：' + esc(s.slice(0, idx)) +
              '<span class="blank"></span>' + esc(s.slice(idx + theme.term.length)) +
              '<span style="display:block;font-size:11px;color:var(--faint);margin-top:6px">来自《' + esc(note.title) + '》</span>';
            qs.push({
              q,
              aHtml: '<b>' + esc(theme.term) + '</b>　' + esc(s),
              source,
              term: theme.term,
              noteId: note.id,
            });
          } else {
            qs.push({
              q: '关于「' + esc(theme.term) + '」，你在《' + esc(note.title) + '》里记了什么？' +
                '<span style="display:block;font-size:11px;color:var(--faint);margin-top:6px">试着先说出来，再展开答案</span>',
              aHtml: esc(note._snippet || content.slice(0, 160)),
              source,
              term: theme.term,
              noteId: note.id,
            });
          }
        });
      });

      if (qs.length < limit) {
        notes.slice(0, 20).forEach((note) => {
          if (qs.length >= limit) return;
          if (!note.content || note.content.length < 12) return;
          const key = 'recall|' + note.id;
          if (seen.has(key)) return;
          seen.add(key);
          qs.push({
            q: '回看《' + esc(note.title) + '》：这条笔记的核心内容是什么？' +
              '<span style="display:block;font-size:11px;color:var(--faint);margin-top:6px">' + esc(note._where) + '</span>',
            aHtml: esc(String(note.content).slice(0, 200)) + (note.content.length > 200 ? '…' : ''),
            source: note._where + ' · ' + note.title,
            term: '',
            noteId: note.id,
          });
        });
      }

      return qs.slice(0, limit || 24);
    },
  };

  App.Knowledge = Knowledge;

  /* ---------------- 周报 ---------------- */
  const MODULE_META = {
    checkin: { icon: '📋', name: '打卡 & 待办' },
    inspirations: { icon: '🎬', name: '灵感' },
    exam: { icon: '📚', name: '备考计划' },
    skills: { icon: '💡', name: '技能学习' },
    body: { icon: '🏃', name: '身体管理' },
    inventory: { icon: '🗃️', name: '物品管理' },
    outfits: { icon: '👗', name: '穿搭参考' },
    beauty: { icon: '💄', name: '美妆护肤' },
    money: { icon: '💰', name: '存钱目标' },
    anniversaries: { icon: '🎀', name: '纪念日' },
    favors: { icon: '🤝', name: '人情台账' },
    wishes: { icon: '✈️', name: '愿望清单' },
  };

  function stampIn(ts, start, end) {
    if (!ts) return false;
    const d = dateStr(new Date(ts));
    return d >= start && d <= end;
  }

  function dateIn(d, start, end) {
    return !!d && d >= start && d <= end;
  }

  function latestOf(moduleId) {
    const st = Store.state;
    const times = [Store.lastActive(moduleId) || 0];
    const push = (v) => { if (v) times.push(v); };
    const pushDate = (d) => {
      const t = util.parseDay(d);
      if (t) times.push(t.getTime());
    };

    if (moduleId === 'checkin') {
      (st.checkin.tasks || []).forEach((t) => { push(t.createdAt); push(t.doneAt); pushDate(t.date); });
      (st.todos || []).forEach((t) => { push(t.createdAt); push(t.doneAt); });
    } else if (moduleId === 'inspirations') {
      (st.inspirations || []).forEach((t) => { push(t.createdAt); push(t.doneAt); });
    } else if (moduleId === 'exam') {
      (st.exam.plans || []).forEach((p) => { push(p.createdAt); push(p.doneAt); });
      (st.exam.records || []).forEach((r) => { push(r.createdAt); pushDate(r.date); });
      (st.exam.notes || []).forEach((n) => { push(n.createdAt); push(n.updatedAt); });
    } else if (moduleId === 'skills') {
      (st.skills || []).forEach((s) => {
        push(s.createdAt); push(s.updatedAt);
        (s.notes || []).forEach((n) => { push(n.createdAt); push(n.updatedAt); });
        (s.links || []).forEach((l) => push(l.createdAt));
      });
    } else if (moduleId === 'body') {
      (st.body.records || []).forEach((r) => { push(r.createdAt); push(r.updatedAt); pushDate(r.date); });
      (st.body.meals || []).forEach((m) => { push(m.createdAt); pushDate(m.date); });
    } else if (moduleId === 'inventory') {
      (st.inventory.stock || []).forEach((it) => { push(it.createdAt); push(it.updatedAt); });
      (st.inventory.shopping || []).forEach((it) => { push(it.createdAt); push(it.doneAt); });
      (st.inventory.replace || []).forEach((it) => { push(it.createdAt); push(it.updatedAt); });
    } else if (moduleId === 'outfits') {
      (st.outfits || []).forEach((o) => push(o.createdAt));
    } else if (moduleId === 'beauty') {
      (st.beauty.tutorials || []).forEach((t) => { push(t.createdAt); push(t.doneAt); });
      (st.beauty.looks || []).forEach((t) => push(t.createdAt));
      (st.beauty.products || []).forEach((t) => push(t.createdAt));
      (st.beauty.closet || []).forEach((t) => push(t.createdAt));
    } else if (moduleId === 'money') {
      (st.money.goals || []).forEach((g) => {
        push(g.createdAt); push(g.updatedAt);
        (g.entries || []).forEach((e) => { push(e.createdAt); pushDate(e.date); });
      });
    } else if (moduleId === 'anniversaries') {
      (st.anniversaries || []).forEach((a) => { push(a.createdAt); push(a.updatedAt); });
    } else if (moduleId === 'favors') {
      (st.favors || []).forEach((f) => { push(f.createdAt); push(f.updatedAt); pushDate(f.date); });
    } else if (moduleId === 'wishes') {
      (st.wishes || []).forEach((w) => { push(w.createdAt); push(w.updatedAt); push(w.doneAt); });
    }
    return Math.max.apply(null, times);
  }

  function hasData(moduleId) {
    const st = Store.state;
    const map = {
      checkin: () => (st.checkin.tasks || []).length + (st.todos || []).length > 0,
      inspirations: () => (st.inspirations || []).length > 0,
      exam: () => (st.exam.plans || []).length + (st.exam.records || []).length + (st.exam.notes || []).length > 0,
      skills: () => (st.skills || []).length > 0,
      body: () => (st.body.records || []).length + (st.body.meals || []).length > 0,
      inventory: () => (st.inventory.stock || []).length + (st.inventory.shopping || []).length + (st.inventory.replace || []).length > 0,
      outfits: () => (st.outfits || []).length > 0,
      beauty: () => (st.beauty.tutorials || []).length + (st.beauty.looks || []).length +
        (st.beauty.products || []).length + (st.beauty.closet || []).length > 0,
      money: () => (st.money.goals || []).length > 0,
      anniversaries: () => (st.anniversaries || []).length > 0,
      favors: () => (st.favors || []).length > 0,
      wishes: () => (st.wishes || []).length > 0,
    };
    return map[moduleId] ? map[moduleId]() : false;
  }

  function collect(start, end) {
    const st = Store.state;
    const done = [];
    const stats = {
      checkin: 0, todos: 0, notes: 0, studyMinutes: 0, photos: 0,
      moneyIn: 0, wishes: 0, records: 0,
    };

    function group(moduleId) {
      let g = done.find((x) => x.module === moduleId);
      if (!g) {
        g = { module: moduleId, icon: MODULE_META[moduleId].icon, name: MODULE_META[moduleId].name, items: [], total: 0 };
        done.push(g);
      }
      return g;
    }
    function add(moduleId, text, date) {
      const g = group(moduleId);
      g.total++;
      if (g.items.length < 8) g.items.push({ text, date: date || '' });
    }

    (st.checkin.tasks || []).forEach((t) => {
      if (t.done && stampIn(t.doneAt || (t.date ? util.parseDay(t.date).getTime() : 0), start, end)) {
        add('checkin', '打卡：' + t.text, dateStr(new Date(t.doneAt || Date.now())));
        stats.checkin++;
      }
    });
    (st.todos || []).forEach((t) => {
      if (t.done && stampIn(t.doneAt, start, end)) {
        add('checkin', (t.category === 'long' ? '长期计划：' : '工作待办：') + t.title, dateStr(new Date(t.doneAt)));
        stats.todos++;
      }
    });
    (st.inspirations || []).forEach((x) => {
      if (x.done && stampIn(x.doneAt, start, end)) {
        add('inspirations', '实现灵感：' + x.text.slice(0, 60), dateStr(new Date(x.doneAt)));
      }
    });
    (st.exam.plans || []).forEach((p) => {
      if (p.done && stampIn(p.doneAt, start, end)) {
        add('exam', '完成学习计划：' + p.title, dateStr(new Date(p.doneAt)));
      }
    });
    (st.exam.records || []).forEach((r) => {
      if (dateIn(r.date, start, end)) {
        stats.studyMinutes += toNum(r.minutes);
        add('exam', '学习 ' + util.toNum(r.minutes) + ' 分钟：' + r.content, r.date);
      }
    });
    (st.exam.notes || []).forEach((n) => {
      if (stampIn(n.updatedAt || n.createdAt, start, end)) {
        stats.notes++;
        add('exam', '笔记《' + n.title + '》', dateStr(new Date(n.updatedAt || n.createdAt)));
      }
    });

    (st.skills || []).forEach((s) => {
      let touched = false;
      (s.notes || []).forEach((n) => {
        if (stampIn(n.updatedAt || n.createdAt, start, end)) {
          stats.notes++;
          add('skills', '技能「' + s.name + '」笔记《' + n.title + '》', dateStr(new Date(n.updatedAt || n.createdAt)));
          touched = true;
        }
      });
      if (!touched && stampIn(s.updatedAt, start, end) && s.updatedAt !== s.createdAt) {
        add('skills', '推进「' + s.name + '」到 ' + toNum(s.progress) + '%', dateStr(new Date(s.updatedAt)));
      }
    });

    (st.body.records || []).forEach((r) => {
      if (stampIn(r.createdAt, start, end) || dateIn(r.date, start, end)) {
        const parts = [];
        if (r.weight) parts.push('体重 ' + r.weight + 'kg');
        if (r.waist) parts.push('腰围 ' + r.waist + 'cm');
        if (r.hip) parts.push('臀围 ' + r.hip + 'cm');
        stats.photos += (r.photos || []).length;
        add('body', '体态记录：' + (parts.join(' · ') || '身体数据'), r.date);
      }
    });
    const mealCount = (st.body.meals || []).filter((m) => stampIn(m.createdAt, start, end)).length;
    if (mealCount) add('body', '规划了 ' + mealCount + ' 项饮食', '');

    (st.inventory.stock || []).forEach((it) => {
      (it.history || []).forEach((h) => {
        if (dateIn(h.date, start, end)) {
          add('inventory', it.name + ' 消耗 ' + h.amount + it.unit, h.date);
        }
      });
      if (stampIn(it.createdAt, start, end)) add('inventory', '新增库存：' + it.name, '');
    });
    (st.inventory.shopping || []).forEach((it) => {
      if (it.done && stampIn(it.doneAt, start, end)) add('inventory', '完成采购：' + it.name, dateStr(new Date(it.doneAt)));
    });
    (st.inventory.replace || []).forEach((it) => {
      (it.records || []).forEach((r) => {
        if (dateIn(r.date, start, end)) add('inventory', it.name + ' 已换新', r.date);
      });
    });

    (st.outfits || []).forEach((o) => {
      if (stampIn(o.createdAt, start, end)) {
        add('outfits', '生成穿搭参考：' + (o.form.top || '') + ' + ' + (o.form.bottom || ''), '');
      }
    });

    (st.beauty.tutorials || []).forEach((t) => {
      if (t.done && stampIn(t.doneAt, start, end)) add('beauty', '学习教程：' + t.title, dateStr(new Date(t.doneAt)));
    });
    (st.beauty.looks || []).forEach((l) => {
      if (stampIn(l.createdAt, start, end)) add('beauty', '生成妆容建议：' + l.form.face + ' / ' + l.form.occasion, '');
    });
    (st.beauty.products || []).forEach((p) => {
      if (stampIn(p.createdAt, start, end)) add('beauty', '登记彩妆：' + p.name, '');
    });

    (st.money.goals || []).forEach((g) => {
      (g.entries || []).forEach((e) => {
        if (dateIn(e.date, start, end)) {
          if (e.type === 'out') add('money', '为「' + g.title + '」支出 ' + util.money(e.amount), e.date);
          else {
            stats.moneyIn += toNum(e.amount);
            add('money', '为「' + g.title + '」存入 ' + util.money(e.amount), e.date);
          }
        }
      });
      if (stampIn(g.createdAt, start, end)) add('money', '新建存钱目标：' + g.title, '');
    });

    (st.favors || []).forEach((f) => {
      if (dateIn(f.date, start, end)) add('favors', '人情往来：' + f.name + (f.gave ? '（送出 ' + f.gave + '）' : ''), f.date);
    });

    (st.anniversaries || []).forEach((a) => {
      if (stampIn(a.createdAt, start, end)) add('anniversaries', '记录纪念日：' + a.title, '');
    });

    (st.wishes || []).forEach((w) => {
      if (w.done && stampIn(w.doneAt, start, end)) {
        stats.wishes++;
        add('wishes', '实现愿望：' + w.title, dateStr(new Date(w.doneAt)));
      } else if (stampIn(w.createdAt, start, end)) {
        add('wishes', '新增愿望：' + w.title, '');
      }
    });

    stats.records = done.reduce((n, g) => n + g.total, 0);
    return { done: done.filter((g) => g.total > 0), stats };
  }

  function stuckItems() {
    const st = Store.state;
    const out = [];
    const today = dateStr();

    (st.todos || []).forEach((t) => {
      if (t.done) return;
      const age = dayDiff(dateStr(new Date(t.createdAt)), today);
      if (age >= 14) {
        out.push({ level: 'warn', text: '待办「' + t.title + '」已搁置 ' + age + ' 天，还没有被完成。' });
      }
    });
    (st.exam.plans || []).forEach((p) => {
      if (p.done) return;
      const age = dayDiff(dateStr(new Date(p.createdAt)), today);
      if (age >= 21) out.push({ level: 'warn', text: '学习计划「' + p.title + '」已经 ' + age + ' 天没有勾选。' });
    });
    (st.skills || []).forEach((s) => {
      if (s.done) return;
      const idle = dayDiff(dateStr(new Date(s.updatedAt || s.createdAt)), today);
      if (idle >= 30 && toNum(s.progress) < 100) {
        out.push({ level: 'warn', text: '技能「' + s.name + '」停在 ' + toNum(s.progress) + '%，已 ' + idle + ' 天没有推进。' });
      }
    });
    (st.money.goals || []).forEach((g) => {
      const entries = g.entries || [];
      const current = entries.reduce((n, e) => n + (e.type === 'out' ? -1 : 1) * toNum(e.amount), 0);
      const target = toNum(g.target);
      if (g.deadline) {
        const left = dayDiff(today, g.deadline);
        if (left < 0 && current < target) {
          out.push({ level: 'danger', text: '存钱目标「' + g.title + '」已超过计划时间，还差 ' + util.money(target - current) + '。' });
        } else if (left >= 0 && left <= 30 && target > 0 && current / target < 0.7) {
          out.push({ level: 'warn', text: '存钱目标「' + g.title + '」只剩 ' + left + ' 天，进度 ' +
            Math.round((current / target) * 100) + '%。' });
        }
      }
    });
    (st.inventory.replace || []).forEach((it) => {
      const due = addDays(it.lastReplace || it.openDate, it.cycleDays);
      const left = dayDiff(today, due);
      if (left <= 0) {
        out.push({ level: 'danger', text: '耗材「' + it.name + '」' + (left < 0 ? '已超期 ' + Math.abs(left) + ' 天' : '今天该换') + '，记得处理。' });
      }
    });
    (st.inventory.stock || []).forEach((it) => {
      if (!it.expiry) return;
      const left = dayDiff(today, it.expiry);
      if (left < 0) out.push({ level: 'danger', text: '库存「' + it.name + '」已过期 ' + Math.abs(left) + ' 天。' });
    });
    return out.slice(0, 10);
  }

  function stalledItems() {
    const out = [];
    const today = dateStr();
    Object.keys(MODULE_META).forEach((id) => {
      if (!hasData(id)) return;
      const last = latestOf(id);
      if (!last) return;
      const idle = dayDiff(dateStr(new Date(last)), today);
      if (idle >= 14) {
        out.push({ module: id, days: idle, text: MODULE_META[id].name + ' 已经 ' + idle + ' 天没有更新。' });
      }
    });
    return out.sort((a, b) => b.days - a.days);
  }

  function staleNotes() {
    const now = Date.now();
    const out = [];
    App.allNotes().forEach((n) => {
      const created = n.createdAt || now;
      const ageCreated = Math.floor((now - created) / 86400000);
      if (ageCreated < 30) return;
      const lastView = n.lastViewedAt || 0;
      const daysSinceView = lastView ? Math.floor((now - lastView) / 86400000) : null;
      if (lastView && daysSinceView < 30) return;
      out.push({
        title: n.title,
        where: n._where,
        module: n._moduleName,
        createdDays: ageCreated,
        days: daysSinceView,
        never: !lastView,
      });
    });
    return out.sort((a, b) => (b.days || 9999) - (a.days || 9999)).slice(0, 12);
  }

  function buildReport(start, end, opts) {
    const o = opts || {};
    const collected = collect(start, end);
    const themes = Knowledge.themes(2).slice(0, 8);
    const shallowThemes = themes.filter((t) => t.shallow);
    const stale = staleNotes();
    const stuck = stuckItems();
    const stalled = stalledItems();
    const stats = collected.stats;

    const suggestions = [];
    if (stalled.length) {
      const stalledName = stalled[0].text.replace(/ 已经.*$/, '');
      suggestions.push('给「' + stalledName + '」留 15 分钟，哪怕只推进一小步。');
    }
    if (stuck.length) {
      const label = (stuck[0].text.match(/「([^」]+)」/) || [])[1] || '最卡的那件事';
      suggestions.push('挑一件卡住的事，只定一个最小下一步，例如先把「' + label + '」做 10 分钟。');
    }
    if (stale.length) {
      suggestions.push('重读 ' + Math.min(3, stale.length) + ' 条 30 天没看的笔记，把仍然有用的内容合并或更新。');
    }
    if (shallowThemes.length) {
      suggestions.push('「' + shallowThemes[0].term + '」反复出现但记录很碎，下周专门写一条完整笔记。');
    }
    if (!suggestions.length) suggestions.push('保持现在的节奏，下周继续记录，让周报有更多可以回看的内容。');

    const data = {
      done: collected.done,
      stats,
      stuck,
      stalled,
      staleNotes: stale,
      themes,
      shallowThemes: shallowThemes.map((t) => ({ term: t.term, count: t.count })),
      suggestions,
      partial: !!o.partial,
      auto: !!o.auto,
    };

    const report = {
      id: util.uid('rp'),
      weekStart: start,
      weekEnd: end,
      createdAt: Date.now(),
      data,
      text: renderText(start, end, data),
    };
    return report;
  }

  function renderText(start, end, data) {
    const lines = [];
    lines.push('# 周报 ' + start + ' ~ ' + end);
    lines.push('');
    lines.push('## 本周做了什么');
    if (!data.done.length) lines.push('- 本周还没有记录。');
    data.done.forEach((g) => {
      g.items.forEach((it) => {
        lines.push('- ' + g.name + '｜' + it.text + (it.date ? '（' + it.date + '）' : ''));
      });
      if (g.total > g.items.length) lines.push('- ' + g.name + '｜另有 ' + (g.total - g.items.length) + ' 项记录');
    });
    lines.push('');
    lines.push('## 本周数据');
    lines.push('- 完成打卡 ' + data.stats.checkin + ' 项，完成待办 ' + data.stats.todos + ' 项');
    lines.push('- 新增 / 更新笔记 ' + data.stats.notes + ' 条，学习 ' + (data.stats.studyMinutes / 60).toFixed(1) + ' 小时');
    lines.push('- 存入 ' + util.money(data.stats.moneyIn) + '，实现愿望 ' + data.stats.wishes + ' 个');
    lines.push('');
    lines.push('## 卡住的事');
    if (!data.stuck.length) lines.push('- 没有明显卡住的事情。');
    data.stuck.forEach((s) => lines.push('- ' + s.text));
    lines.push('');
    lines.push('## 停滞的方向');
    if (!data.stalled.length) lines.push('- 所有板块最近都有更新。');
    data.stalled.forEach((s) => lines.push('- ' + s.text));
    lines.push('');
    lines.push('## 30 天没看的笔记');
    if (!data.staleNotes.length) lines.push('- 笔记都在近期看过。');
    data.staleNotes.forEach((n) => lines.push('- 《' + n.title + '》（' + n.where + '）' +
      (n.never ? '从未展开看过' : '已经 ' + n.days + ' 天没看')));
    lines.push('');
    lines.push('## 反复出现的主题');
    if (!data.themes.length) lines.push('- 笔记还不多，暂时没有形成主题。');
    data.themes.forEach((t) => lines.push('- ' + t.term + '（' + t.count + ' 条笔记' + (t.shallow ? '，记录较碎' : '') + '）'));
    lines.push('');
    lines.push('## 下周建议');
    data.suggestions.forEach((s) => lines.push('- ' + s));
    lines.push('');
    lines.push(oNothing());
    return lines.join('\n');
  }

  function oNothing() {
    return '> 由「我的工作台」根据本机数据自动整理。数据不会离开这台设备。';
  }

  function findReport(weekStart) {
    return (Store.state.reports || []).find((r) => r.weekStart === weekStart);
  }

  const Report = {
    currentWeekStart() {
      return dateStr(startOfWeek());
    },

    generateCurrent() {
      const start = this.currentWeekStart();
      const end = dateStr();
      const existing = findReport(start);
      const report = buildReport(start, end, { partial: true });
      if (existing) {
        existing.data = report.data;
        existing.text = report.text;
        existing.createdAt = report.createdAt;
        existing.weekEnd = end;
      } else {
        Store.state.reports.push(report);
      }
      Store.state.reports = Store.state.reports
        .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
        .slice(0, 60);
      Store.touch('report');
      Store.save({ immediate: true });
      return existing || report;
    },

    ensureWeekly() {
      if (Store.state.settings.weeklyAuto === false) return false;
      const thisMonday = dateStr(startOfWeek());
      const lastMonday = addDays(thisMonday, -7);
      const lastSunday = addDays(thisMonday, -1);
      if (findReport(lastMonday)) return false;
      const collected = collect(lastMonday, lastSunday);
      if (!collected.stats.records) return false;
      const report = buildReport(lastMonday, lastSunday, { auto: true });
      Store.state.reports.push(report);
      Store.state.reports.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
      Store.save({ immediate: true });
      return true;
    },

    build: buildReport,
    stuck: stuckItems,
    stalled: stalledItems,
    staleNotes,
  };

  App.Report = Report;

  /* ---------------- 周报页面 ---------------- */
  App.views.report = function () {
    const reports = (Store.state.reports || []).slice().sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
    const selectedId = App.ui.reportId;
    const currentWeek = Report.currentWeekStart();
    const selected = (selectedId && reports.find((r) => r.id === selectedId)) || reports[0];
    const thisWeekReport = findReport(currentWeek);

    const listHTML = reports.length ? '<div class="card">' +
      '<div class="card-head"><div class="ico-box">🗓</div><div class="card-head-text">' +
        '<h2>历史周报 <span class="count-chip">' + reports.length + '</span></h2>' +
        '<p>每周一份，回看自己走过的路。</p></div></div>' +
      reports.map((r) =>
        '<div class="report-list-row" data-act="report.select" data-id="' + r.id + '">' +
          '<div style="flex:1"><strong>' + fmtDay(r.weekStart) + ' — ' + fmtDay(r.weekEnd) + '</strong>' +
            '<div style="font-size:11px;color:var(--faint)">' + (r.data.stats.records || 0) + ' 项记录 · ' +
            (r.data.stats.notes || 0) + ' 条笔记' + (r.weekStart === currentWeek ? ' · 本周进行中' : '') + '</div></div>' +
          '<span class="badge ' + (r.weekStart === currentWeek ? 'badge--olive' : '') + '">' +
            (r.weekStart === currentWeek ? '本周' : '已归档') + '</span>' +
          ICON('arrow') +
        '</div>').join('') +
    '</div>' : '';

    let currentHTML = '';
    if (selected) {
      const d = selected.data;
      const sections = [];
      sections.push('<div class="report-kpis">' +
        '<div class="report-kpi"><b>' + d.stats.checkin + '</b><span>完成打卡</span></div>' +
        '<div class="report-kpi"><b>' + d.stats.todos + '</b><span>完成待办</span></div>' +
        '<div class="report-kpi"><b>' + d.stats.notes + '</b><span>笔记更新</span></div>' +
        '<div class="report-kpi"><b>' + (d.stats.studyMinutes / 60).toFixed(1) + '</b><span>学习小时</span></div>' +
        '<div class="report-kpi"><b>' + util.money(d.stats.moneyIn) + '</b><span>本周存入</span></div>' +
        '<div class="report-kpi"><b>' + d.stats.wishes + '</b><span>实现愿望</span></div>' +
      '</div>');

      const doneItems = [];
      d.done.forEach((g) => {
        g.items.forEach((it) => {
          doneItems.push('<li>' + g.icon + ' ' + esc(it.text) + (it.date ? ' <span style="color:var(--faint);font-size:10.5px">' +
            esc(it.date) + '</span>' : '') + '</li>');
        });
        if (g.total > g.items.length) {
          doneItems.push('<li class="muted">' + g.icon + ' ' + esc(g.name) + ' 另有 ' + (g.total - g.items.length) + ' 项记录</li>');
        }
      });
      sections.push('<div class="report-sec"><h4><span class="r-ico">✅</span>本周做了什么</h4>' +
        (doneItems.length ? '<ul>' + doneItems.join('') + '</ul>' : '<p style="font-size:12.5px;color:var(--faint)">这一周还没有记录，下一周从一件小事开始。</p>') + '</div>');

      sections.push('<div class="report-sec"><h4><span class="r-ico">🧱</span>卡住的事</h4>' +
        (d.stuck.length ? '<ul>' + d.stuck.map((s) => '<li class="' + (s.level === 'danger' ? 'danger' : 'warn') + '">' +
          esc(s.text) + '</li>').join('') + '</ul>'
          : '<ul><li class="muted">没有明显卡住的事情，保持这个节奏。</li></ul>') + '</div>');

      sections.push('<div class="report-sec"><h4><span class="r-ico">🌫</span>停滞的方向</h4>' +
        (d.stalled.length ? '<ul>' + d.stalled.map((s) => '<li class="warn">' + esc(s.text) + '</li>').join('') + '</ul>'
          : '<ul><li class="muted">所有有记录的板块最近都有更新。</li></ul>') + '</div>');

      sections.push('<div class="report-sec"><h4><span class="r-ico">📖</span>30 天没看的笔记</h4>' +
        (d.staleNotes.length ? '<ul>' + d.staleNotes.map((n) => '<li>' + esc(n.title) + ' <span style="color:var(--faint);font-size:10.5px">' +
          esc(n.where) + ' · ' + (n.never ? '从未展开' : n.days + ' 天没看') + '</span></li>').join('') + '</ul>'
          : '<ul><li class="muted">没有 30 天以上没看的笔记。</li></ul>') + '</div>');

      sections.push('<div class="report-sec"><h4><span class="r-ico">🔁</span>反复出现的主题</h4>' +
        (d.themes.length ? '<ul>' + d.themes.map((t) => '<li class="' + (t.shallow ? 'warn' : '') + '">' +
          '<b style="font-weight:600;color:var(--brown)">' + esc(t.term) + '</b> · ' + t.count + ' 条笔记' +
          (t.shallow ? '，记录还比较碎' : '') + '</li>').join('') + '</ul>'
          : '<ul><li class="muted">笔记还不多，暂时没有形成明显的主题。</li></ul>') + '</div>');

      sections.push('<div class="report-sec"><h4><span class="r-ico">🧭</span>下周建议</h4><ul>' +
        d.suggestions.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul></div>');

      currentHTML = '<section class="card report-card">' +
        '<div class="report-head"><div class="ico-box">📝</div><div style="flex:1">' +
          '<h3>' + fmtDay(selected.weekStart) + ' — ' + fmtDay(selected.weekEnd) + ' 周报</h3>' +
          '<p>' + (selected.weekStart === currentWeek ? '本周进行中 · 生成于 ' : '生成于 ') +
            fmtDay(dateStr(new Date(selected.createdAt))) + (selected.data.auto ? ' · 自动生成' : '') +
            ' · 共 ' + (d.stats.records || 0) + ' 项记录</p></div>' +
          '<div class="head-actions">' +
            '<button type="button" class="btn btn--quiet btn--sm" data-act="report.copy">复制</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-act="report.download">导出 .md</button>' +
          '</div></div>' +
        '<div class="report-body">' + sections.join('') +
          '<details><summary style="cursor:pointer;font-size:12px;color:var(--muted)">查看纯文本版</summary>' +
            '<div class="report-text" style="margin-top:10px">' + esc(selected.text) + '</div></details>' +
        '</div>' +
      '</section>';
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>每周回看一次</h2>' +
        '<p>扫描所有板块，告诉你做了什么、哪里卡住、哪些笔记该重读了。</p></div>' +
        '<div class="ph-actions"><button type="button" class="btn" data-act="report.generate">' +
        ICON('spark') + (thisWeekReport ? '更新本周周报' : '生成本周周报') + '</button></div></div>' +

      (!reports.length ? '<section class="card">' + UI.empty('📝', '还没有周报',
        '本周结束时点一下「生成本周周报」，系统会扫描打卡、待办、笔记、存钱与身体记录。') +
        '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="report.generate">' +
        ICON('spark') + '生成本周第一份周报</button></div>' +
        '<div class="modal-note" style="margin-top:8px">之后每周第一次打开工作台时，会自动为上一周生成周报（可在设置里关闭）。</div>' +
        '</section>' : '') +

      currentHTML +
      listHTML +

      '<p style="font-size:11px;color:var(--ghost);line-height:1.8">周报完全根据本机数据生成：' +
        '打卡/待办完成时间、笔记更新与查看时间、存钱记录、耗材到期、各板块最后活动时间与笔记中的高频主题。</p>' +
    '</div>';
  };

  App.actions['report.generate'] = function () {
    const r = Report.generateCurrent();
    App.ui.reportId = r.id;
    App.render();
    UI.toast('本周周报已生成');
  };

  App.actions['report.select'] = function (el) {
    App.ui.reportId = el.dataset.id;
    App.render();
  };

  App.actions['report.copy'] = async function () {
    const reports = (Store.state.reports || []).slice().sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
    const r = reports.find((x) => x.id === App.ui.reportId) || reports[0];
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.text);
      UI.toast('周报已复制到剪贴板');
    } catch (err) {
      UI.toast('复制失败，可改用导出 .md', 'warn');
    }
  };

  App.actions['report.download'] = function () {
    const reports = (Store.state.reports || []).slice().sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
    const r = reports.find((x) => x.id === App.ui.reportId) || reports[0];
    if (!r) return;
    App.downloadFile('周报-' + r.weekStart + '.md', r.text, 'text/markdown');
    UI.toast('周报已导出');
  };
})();
