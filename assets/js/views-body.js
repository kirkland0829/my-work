/* =========================================================
   板块：身体管理 / 物品管理 / 穿搭参考
   ========================================================= */
(function () {
  'use strict';

  const { Store, util, UI } = App;
  const { esc, dateStr, fmtDay, fmtDayFull, weekdayCN, dayDiff, addDays, toNum } = util;
  const ICON = UI.ICON;

  function tabBar(moduleId, current, tabs) {
    return '<div class="tabs" role="tablist">' + tabs.map((t) =>
      '<button type="button" class="tab' + (t.id === current ? ' is-active' : '') + '" role="tab" aria-selected="' +
      (t.id === current) + '" data-act="ui.tab" data-module="' + moduleId + '" data-tab="' + t.id + '">' +
      '<span class="tab-dot"></span>' + esc(t.label) +
      (t.count != null ? ' <span class="count-chip">' + t.count + '</span>' : '') +
      '</button>').join('') + '</div>';
  }

  /* =======================================================
     身体管理
     ======================================================= */
  const FOOD_DB = [
    ['米饭', 116], ['糙米饭', 112], ['面条', 110], ['馒头', 223], ['面包', 265], ['燕麦', 389],
    ['鸡蛋', 144], ['鸡胸肉', 133], ['鸡腿', 181], ['牛肉', 125], ['猪肉', 143], ['三文鱼', 208],
    ['虾', 93], ['鱼', 100], ['豆腐', 84], ['豆浆', 31], ['牛奶', 54], ['酸奶', 72], ['奶酪', 328],
    ['西兰花', 34], ['生菜', 15], ['番茄', 18], ['黄瓜', 16], ['土豆', 77], ['红薯', 86],
    ['玉米', 112], ['苹果', 52], ['香蕉', 93], ['橙子', 48], ['蓝莓', 57], ['牛油果', 160],
    ['坚果', 600], ['花生', 567], ['橄榄油', 884], ['沙拉酱', 300], ['饺子', 240], ['包子', 220],
    ['拿铁', 55], ['奶茶', 70], ['可乐', 43], ['火锅', 150], ['炸鸡', 279], ['薯条', 312],
    ['巧克力', 546], ['蛋糕', 350], ['冰淇淋', 207],
  ];

  function lookupFood(name) {
    const q = String(name || '').replace(/\s+/g, '');
    if (!q) return null;
    let best = null;
    FOOD_DB.forEach(([key, kcal]) => {
      if (q.indexOf(key) >= 0 || key.indexOf(q) >= 0) {
        if (!best || key.length > best.key.length) best = { key, kcal };
      }
    });
    return best;
  }

  function calcMealKcal(name, grams, override) {
    const g = Math.max(0, toNum(grams));
    const food = lookupFood(name);
    const kcal = override != null && override !== '' ? toNum(override) : (food ? food.kcal * g / 100 : 0);
    return { kcal: Math.round(kcal), auto: !(override != null && override !== ''), matched: food ? food.key : '' };
  }

  function bodyRecordModal(record) {
    const today = dateStr();
    const r = record || {};
    UI.modal({
      title: record ? '编辑体态记录' : '记录今天的身体数据',
      desc: '不需要每次都填满，记录在意的几项就好。',
      wide: true,
      fields: [
        { name: 'date', label: '日期', type: 'date', required: true, value: r.date || today },
        { name: 'height', label: '身高 (cm)', type: 'number', step: '0.1', min: '50', max: '260', value: r.height || '', placeholder: '160' },
        { name: 'weight', label: '体重 (kg)', type: 'number', step: '0.1', min: '20', max: '300', value: r.weight || '', placeholder: '50' },
        { name: 'bust', label: '胸围 (cm)', type: 'number', step: '0.1', min: '30', max: '200', value: r.bust || '', placeholder: '85' },
        { name: 'waist', label: '腰围 (cm)', type: 'number', step: '0.1', min: '30', max: '200', value: r.waist || '', placeholder: '68' },
        { name: 'hip', label: '臀围 (cm)', type: 'number', step: '0.1', min: '30', max: '200', value: r.hip || '', placeholder: '92' },
        { name: 'thigh', label: '大腿围 (cm)', type: 'number', step: '0.1', min: '20', max: '120', value: r.thigh || '', placeholder: '52' },
        { name: 'arm', label: '手臂围 (cm)', type: 'number', step: '0.1', min: '15', max: '80', value: r.arm || '', placeholder: '26' },
        { name: 'note', label: '体态备注', type: 'textarea', rows: 2, span: 2, value: r.note || '', placeholder: '例如：最近久坐，肩颈有点紧；或睡眠、运动情况' },
      ],
      submitText: record ? '保存修改' : '保存记录',
      onSubmit(data) {
        if (!data.date) { UI.toast('请选择日期', 'warn'); return false; }
        const patch = {
          date: data.date,
          height: data.height === '' ? null : toNum(data.height),
          weight: data.weight === '' ? null : toNum(data.weight),
          bust: data.bust === '' ? null : toNum(data.bust),
          waist: data.waist === '' ? null : toNum(data.waist),
          hip: data.hip === '' ? null : toNum(data.hip),
          thigh: data.thigh === '' ? null : toNum(data.thigh),
          arm: data.arm === '' ? null : toNum(data.arm),
          note: String(data.note || '').trim(),
        };
        const records = Store.state.body.records;
        if (record) {
          Object.assign(record, patch, { updatedAt: Date.now() });
        } else {
          const same = records.find((x) => x.date === patch.date);
          if (same) {
            Object.assign(same, patch, { updatedAt: Date.now() });
            UI.toast('这一天已有记录，已更新');
          } else {
            records.push(Object.assign({
              id: util.uid('bd'), photos: [], createdAt: Date.now(),
            }, patch));
            UI.toast('身体数据已记录');
          }
        }
        App.commit('body');
      },
    });
  }

  function bodyStatsLine(r) {
    const parts = [];
    if (r.height) parts.push('身高 ' + util.fmtNum(r.height) + ' cm');
    if (r.weight) parts.push('体重 ' + util.fmtNum(r.weight) + ' kg');
    if (r.bust) parts.push('胸围 ' + util.fmtNum(r.bust));
    if (r.waist) parts.push('腰围 ' + util.fmtNum(r.waist));
    if (r.hip) parts.push('臀围 ' + util.fmtNum(r.hip));
    if (r.thigh) parts.push('大腿 ' + util.fmtNum(r.thigh));
    if (r.arm) parts.push('手臂 ' + util.fmtNum(r.arm));
    return parts.join(' · ');
  }

  function lineChart(points, unit, color) {
    if (points.length < 2) {
      return '<div class="empty" style="padding:18px"><span>至少两条记录才能画出趋势</span></div>';
    }
    const w = 600, h = 120, pad = 14;
    const values = points.map((p) => p.v);
    let min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (min === max) { min -= 1; max += 1; }
    const span = max - min || 1;
    const coords = points.map((p, i) => {
      const x = points.length === 1 ? w / 2 : pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    const d = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
    const area = d + ' L' + coords[coords.length - 1][0].toFixed(1) + ' ' + h + ' L' + coords[0][0].toFixed(1) + ' ' + h + ' Z';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + d + '"' + (color ? ' style="stroke:' + color + '"' : '') + '/></svg>' +
      '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);margin-top:2px">' +
      '<span>最低 ' + util.fmtNum(min, 1) + unit + '</span><span>最高 ' + util.fmtNum(max, 1) + unit + '</span></div>';
  }

  App.views.body = function () {
    const st = Store.state;
    const tab = App.tab('body', 'records');
    const records = (st.body.records || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const meals = st.body.meals || [];
    let body = '';

    if (tab === 'records') {
      body = '<div class="page-head"><div class="ph-text"><h2>体态记录</h2>' +
          '<p>体重与围度、对应日期的照片，长期留下来就能看到变化。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="body.record.add">' + ICON('plus') + '记录身体数据</button></div></div>' +
        (records.length ? records.map((r) => {
          const bmi = (r.height && r.weight) ? (r.weight / Math.pow(r.height / 100, 2)) : null;
          return '<section class="card body-record">' +
            '<div class="br-head"><span class="br-date">' + fmtDay(r.date) + '</span>' +
              '<span class="badge">' + weekdayCN(r.date) + '</span>' +
              '<span class="badge">' + (r.photos || []).length + ' 张照片</span>' +
              (bmi ? '<span class="badge badge--olive">BMI ' + bmi.toFixed(1) + '</span>' : '') +
              '<div class="br-actions">' +
                '<button type="button" class="btn btn--quiet btn--sm" data-act="body.record.edit" data-id="' + r.id + '">编辑</button>' +
                '<button type="button" class="row-del" data-act="body.record.del" data-id="' + r.id +
                  '" aria-label="删除记录" style="opacity:1">' + ICON('trash') + '</button>' +
              '</div></div>' +
            '<div class="br-vals" style="margin-bottom:12px">' +
              (r.weight ? '<div class="br-val">体重<b>' + util.fmtNum(r.weight) + ' <small style="font-size:10px;font-weight:400">kg</small></b></div>' : '') +
              (r.bust ? '<div class="br-val">胸围<b>' + util.fmtNum(r.bust) + '</b></div>' : '') +
              (r.waist ? '<div class="br-val">腰围<b>' + util.fmtNum(r.waist) + '</b></div>' : '') +
              (r.hip ? '<div class="br-val">臀围<b>' + util.fmtNum(r.hip) + '</b></div>' : '') +
              (r.thigh ? '<div class="br-val">大腿<b>' + util.fmtNum(r.thigh) + '</b></div>' : '') +
              (r.arm ? '<div class="br-val">手臂<b>' + util.fmtNum(r.arm) + '</b></div>' : '') +
              (!bodyStatsLine(r) ? '<div class="br-val" style="color:var(--faint)">这条记录还没有数值</div>' : '') +
            '</div>' +
            (r.note ? '<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px;line-height:1.8">' + esc(r.note) + '</p>' : '') +
            '<div class="photo-grid">' +
              (r.photos || []).map((p) =>
                '<div class="photo" data-act="photo.view" data-caption="' + esc(fmtDay(r.date) + ' 体态记录') + '">' +
                  '<img src="' + p.data + '" alt="' + esc(fmtDay(r.date)) + ' 体态照片" loading="lazy">' +
                  '<button type="button" class="photo-del" data-act="body.photo.del" data-id="' + r.id +
                    '" data-photo-id="' + p.id + '" aria-label="删除照片">' + ICON('close') + '</button>' +
                '</div>').join('') +
              '<input type="file" id="ph_' + r.id + '" class="file-hidden" accept="image/*" multiple data-photo="' + r.id + '">' +
              '<label class="upload-tile" for="ph_' + r.id + '">' + ICON('camera') + '<span>添加照片</span></label>' +
            '</div>' +
          '</section>';
        }).join('')
          : '<section class="card">' + UI.empty('🏃', '还没有体态记录', '从今天的身高、体重或任意一项围度开始。') +
            '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="body.record.add">' +
            ICON('plus') + '记录第一组数据</button></div></section>');

    } else if (tab === 'trends') {
      const sorted = records.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
      const weightPts = sorted.filter((r) => r.weight).map((r) => ({ d: r.date, v: r.weight }));
      const waistPts = sorted.filter((r) => r.waist).map((r) => ({ d: r.date, v: r.waist }));
      const hipPts = sorted.filter((r) => r.hip).map((r) => ({ d: r.date, v: r.hip }));
      const bustPts = sorted.filter((r) => r.bust).map((r) => ({ d: r.date, v: r.bust }));

      let compare = '';
      if (records.length >= 2) {
        const aId = App.ui.cmpA || records[records.length - 1].id;
        const bId = App.ui.cmpB || records[0].id;
        const a = records.find((r) => r.id === aId) || records[records.length - 1];
        const b = records.find((r) => r.id === bId) || records[0];
        const keys = [
          ['weight', '体重', 'kg'], ['bust', '胸围', 'cm'], ['waist', '腰围', 'cm'],
          ['hip', '臀围', 'cm'], ['thigh', '大腿围', 'cm'], ['arm', '手臂围', 'cm'],
        ];
        const rows = keys.filter(([k]) => a[k] || b[k]).map(([k, label, unit]) => {
          const va = a[k], vb = b[k];
          let delta = '—';
          let cls = '';
          if (va != null && vb != null) {
            const d = toNum(vb) - toNum(va);
            delta = (d > 0 ? '+' : '') + util.fmtNum(d, 1) + ' ' + unit;
            cls = d < 0 ? 'style="color:var(--olive-3)"' : (d > 0 ? 'style="color:var(--danger)"' : '');
          }
          return '<tr><td data-label="指标"><span class="cell-main">' + label + '</span></td>' +
            '<td class="num" data-label="' + esc(fmtDay(a.date)) + '">' + (va != null ? util.fmtNum(va) + ' ' + unit : '—') + '</td>' +
            '<td class="num" data-label="' + esc(fmtDay(b.date)) + '">' + (vb != null ? util.fmtNum(vb) + ' ' + unit : '—') + '</td>' +
            '<td class="num" data-label="变化" ' + cls + '>' + delta + '</td></tr>';
        }).join('');
        const pickOptions = records.map((r) => ({ value: r.id, label: fmtDay(r.date) + (r.weight ? ' · ' + util.fmtNum(r.weight) + 'kg' : '') }));
        compare = '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🪞</div><div class="card-head-text">' +
            '<h2>不同时期对比</h2><p>选择两个日期，看看围度与体态照片的变化。</p></div></div>' +
          '<div class="form-grid" style="margin-bottom:14px">' +
            '<div class="field"><label>对比日期 A</label><select data-change="body.cmpA">' +
              pickOptions.map((o) => '<option value="' + o.value + '"' + (o.value === a.id ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label>对比日期 B</label><select data-change="body.cmpB">' +
              pickOptions.map((o) => '<option value="' + o.value + '"' + (o.value === b.id ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table table--stack">' +
            '<thead><tr><th>指标</th><th>' + fmtDay(a.date) + '</th><th>' + fmtDay(b.date) + '</th><th>变化</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="4" style="color:var(--faint)">这两条记录都没有可对比的数值</td></tr>') + '</tbody>' +
          '</table></div>' +
          '<div class="compare-grid" style="margin-top:16px">' +
            [a, b].map((r) => '<div class="compare-col"><div class="cc-head"><span>' + fmtDay(r.date) + '</span>' +
              '<span>' + (r.weight ? util.fmtNum(r.weight) + ' kg' : '') + '</span></div>' +
              ((r.photos || [])[0]
                ? '<img src="' + (r.photos[0].data) + '" alt="' + esc(fmtDay(r.date)) + ' 体态照片" data-act="photo.view">'
                : '<div class="empty" style="padding:28px 8px"><span>这天没有照片</span></div>') +
              '</div>').join('') +
          '</div>' +
        '</section>';
      }

      body = '<div class="page-head"><div class="ph-text"><h2>变化趋势</h2>' +
          '<p>慢一点没关系，方向对就好。</p></div></div>' +
        '<div class="grid">' +
          '<section class="card"><div class="card-head"><div class="ico-box">⚖️</div><div class="card-head-text">' +
            '<h2>体重</h2><p>' + weightPts.length + ' 次记录</p></div></div>' +
            (weightPts.length ? lineChart(weightPts, ' kg') : UI.empty('⚖️', '还没有体重数据')) + '</section>' +
          '<section class="card"><div class="card-head"><div class="ico-box">📏</div><div class="card-head-text">' +
            '<h2>腰围</h2><p>' + waistPts.length + ' 次记录</p></div></div>' +
            (waistPts.length ? lineChart(waistPts, ' cm') : UI.empty('📏', '还没有腰围数据')) + '</section>' +
          '<section class="card"><div class="card-head"><div class="ico-box">📐</div><div class="card-head-text">' +
            '<h2>臀围</h2><p>' + hipPts.length + ' 次记录</p></div></div>' +
            (hipPts.length ? lineChart(hipPts, ' cm') : UI.empty('📐', '还没有臀围数据')) + '</section>' +
          '<section class="card"><div class="card-head"><div class="ico-box">🫧</div><div class="card-head-text">' +
            '<h2>胸围</h2><p>' + bustPts.length + ' 次记录</p></div></div>' +
            (bustPts.length ? lineChart(bustPts, ' cm') : UI.empty('🫧', '还没有胸围数据')) + '</section>' +
        '</div>' + compare;

    } else {
      const mealDate = App.ui.mealDate || addDays(dateStr(), 1);
      const dayMeals = meals.filter((m) => m.date === mealDate);
      const total = dayMeals.reduce((n, m) => n + toNum(m.calories), 0);
      const dates = Array.from(new Set(meals.map((m) => m.date))).sort((a, b) => (a < b ? 1 : -1)).slice(0, 10);

      body = '<div class="page-head"><div class="ph-text"><h2>饮食规划</h2>' +
          '<p>提前安排明天的食材与餐食，热量自动估算。</p></div></div>' +
        '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🥗</div><div class="card-head-text">' +
            '<h2>' + (mealDate === addDays(dateStr(), 1) ? '明天' : fmtDayFull(mealDate)) + '的餐食</h2>' +
            '<p>食材分量按克计算，常见食材会自动匹配热量。</p></div></div>' +
          '<div class="form-row" style="margin-bottom:14px">' +
            '<div class="field" style="max-width:210px"><label>规划日期</label>' +
              '<input type="date" value="' + mealDate + '" data-change="body.mealDate"></div>' +
            '<div style="flex:1"></div>' +
            '<div class="cal-total"><b>' + total + '</b><span>kcal / 天</span></div>' +
          '</div>' +
          '<form class="add-form add-form--wrap" data-form="body.meal.add" id="mealForm">' +
            '<input type="hidden" name="date" value="' + mealDate + '">' +
            '<div style="flex:0 0 106px"><select name="meal" aria-label="餐次"><option>早餐</option><option selected>午餐</option><option>晚餐</option><option>加餐</option></select></div>' +
            '<div style="flex:1 1 180px"><input type="text" name="food" placeholder="食材或餐食名称，例如：鸡胸肉" required maxlength="80" data-food-name></div>' +
            '<div style="flex:0 0 92px"><input type="number" name="grams" min="1" step="1" placeholder="克数" required data-food-grams></div>' +
            '<div style="flex:0 0 104px"><input type="number" name="override" min="0" step="1" placeholder="热量" aria-label="手动热量（可选）" title="可选：手动填写这道食材的热量"></div>' +
            '<button type="submit" class="btn">' + ICON('plus') + '加入</button>' +
          '</form>' +
          '<p class="hint" id="mealPreview" style="margin-top:8px;color:var(--faint);font-size:11.5px">' +
            '输入食材与克数后，这里会显示自动估算的热量。</p>' +
          '<div class="sub-head"><h3>当天餐食</h3><span class="count-chip">' + dayMeals.length + ' 项</span><span class="line"></span></div>' +
          (dayMeals.length ? ['早餐', '午餐', '晚餐', '加餐'].map((group) => {
            const list = dayMeals.filter((m) => m.meal === group);
            if (!list.length) return '';
            return '<div class="meal-day" style="margin-bottom:12px"><div class="meal-day-head"><strong>' + group + '</strong>' +
              '<span class="kcal">' + list.reduce((n, m) => n + toNum(m.calories), 0) + ' kcal</span></div>' +
              list.map((m) => '<div class="meal-row"><span class="meal-tag">' + esc(group) + '</span>' +
                '<span class="meal-name">' + esc(m.food) + ' <span style="color:var(--faint);font-size:11px">' +
                util.fmtNum(m.grams) + 'g' + (m.auto === false ? ' · 手动' : '') + '</span></span>' +
                '<span class="meal-cal">' + util.fmtNum(m.calories) + ' kcal</span>' +
                '<button type="button" class="row-del" data-act="body.meal.del" data-id="' + m.id +
                '" aria-label="删除" style="opacity:1">' + ICON('trash') + '</button></div>').join('') +
            '</div>';
          }).join('') : UI.empty('🥣', '这一天还没有安排', '把想吃的食材和分量加进来吧。')) +
        '</section>' +
        (dates.length ? '<section class="card"><div class="card-head"><div class="ico-box">📆</div><div class="card-head-text">' +
          '<h2>最近的饮食记录</h2><p>点击日期切换查看</p></div></div>' +
          '<div class="date-strip">' + dates.map((d) =>
            '<button type="button" class="date-pill' + (d === mealDate ? ' is-active' : '') +
            '" data-act="body.mealDatePick" data-date="' + d + '"><b>' + util.parseDay(d).getDate() + '</b><span>' +
            (util.parseDay(d).getMonth() + 1) + '月</span></button>').join('') + '</div></section>' : '') +
        '<p style="font-size:11px;color:var(--ghost);line-height:1.8">热量为常见食材的参考值（每 100g），不同品牌与做法会有差异，可手动填写更准确的热量。</p>';
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>温柔地管理身体</h2>' +
        '<p>记录体态、观察趋势，也认真安排明天的三餐。</p></div>' +
        '<div class="ph-actions"><span class="badge badge--olive">' + records.length + ' 次记录</span>' +
        '<span class="badge">' + meals.length + ' 条饮食</span></div></div>' +
      tabBar('body', tab, [
        { id: 'records', label: '体态记录', count: records.length },
        { id: 'trends', label: '变化趋势' },
        { id: 'meals', label: '饮食规划' },
      ]) +
      body +
    '</div>';
  };

  App.actions['body.record.add'] = function () { bodyRecordModal(null); };
  App.actions['body.record.edit'] = function (el) {
    const r = Store.state.body.records.find((x) => x.id === el.dataset.id);
    if (r) bodyRecordModal(r);
  };
  App.actions['body.record.del'] = async function (el) {
    const r = Store.state.body.records.find((x) => x.id === el.dataset.id);
    if (!r) return;
    const ok = await UI.confirm({
      title: '删除这条体态记录？',
      message: fmtDay(r.date) + ' 的数值与 ' + (r.photos || []).length + ' 张照片都会被删除。',
      okText: '删除',
    });
    if (!ok) return;
    App.deleteById(Store.state.body.records, r.id);
    App.commit('body');
    UI.toast('已删除');
  };

  App.actions['body.uploadPhotos'] = async function (input, files) {
    const record = Store.state.body.records.find((x) => x.id === input.dataset.photo);
    if (!record) return;
    if ((record.photos || []).length + files.length > 12) {
      UI.toast('每条记录最多保存 12 张照片', 'warn');
      return;
    }
    const added = [];
    for (const file of files) {
      try {
        const data = await App.readImageFile(file, { max: 1100, quality: 0.74 });
        added.push({ id: util.uid('ph'), data, createdAt: Date.now() });
      } catch (err) {
        UI.toast(err.message || '有一张照片处理失败', 'warn');
      }
    }
    if (!added.length) return;
    record.photos = (record.photos || []).concat(added);
    Store.touch('body');
    const ok = Store.save({ immediate: true });
    if (!ok) {
      record.photos = record.photos.filter((p) => !added.some((a) => a.id === p.id));
    } else {
      UI.toast('照片已保存到本机');
    }
    App.render();
  };

  App.actions['body.photo.del'] = async function (el) {
    const record = Store.state.body.records.find((x) => x.id === el.dataset.id);
    if (!record) return;
    const ok = await UI.confirm({ title: '删除这张照片？', message: '照片删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    record.photos = (record.photos || []).filter((p) => p.id !== el.dataset.photoId);
    App.commit('body', { immediate: true });
    UI.toast('照片已删除');
  };

  App.actions['body.cmpA'] = function (el) { App.ui.cmpA = el.value; App.render(); };
  App.actions['body.cmpB'] = function (el) { App.ui.cmpB = el.value; App.render(); };
  App.actions['body.mealDate'] = function (el) { App.ui.mealDate = el.value; App.render(); };
  App.actions['body.mealDatePick'] = function (el) { App.ui.mealDate = el.dataset.date; App.render(); };

  /* 饮食实时热量预览 */
  document.addEventListener('input', function (e) {
    const form = e.target.closest ? e.target.closest('#mealForm') : null;
    if (!form) return;
    const preview = document.getElementById('mealPreview');
    if (!preview) return;
    const name = (form.querySelector('[data-food-name]') || {}).value || '';
    const grams = (form.querySelector('[data-food-grams]') || {}).value || '';
    const override = (form.querySelector('[name="override"]') || {}).value || '';
    if (!name || !grams) {
      preview.textContent = '输入食材与克数后，这里会显示自动估算的热量。';
      return;
    }
    const res = calcMealKcal(name, grams, override);
    if (override !== '') {
      preview.innerHTML = '已手动指定：约 <b style="color:var(--olive-3)">' + res.kcal + ' kcal</b>';
    } else if (res.matched) {
      preview.innerHTML = '匹配到「' + esc(res.matched) + '」：约 <b style="color:var(--olive-3)">' + res.kcal + ' kcal</b>';
    } else {
      preview.textContent = '未识别这种食材，可先记为 0 或在右侧手动填写热量。';
    }
  });

  App.forms['body.meal.add'] = function (data) {
    const food = String(data.food || '').trim();
    const grams = toNum(data.grams);
    if (!food || grams <= 0) { UI.toast('请填写食材与克数', 'warn'); return; }
    const res = calcMealKcal(food, grams, data.override);
    (Store.state.body.meals || (Store.state.body.meals = [])).push({
      id: util.uid('ml'),
      date: data.date || addDays(dateStr(), 1),
      meal: data.meal || '午餐',
      food,
      grams,
      calories: res.kcal,
      auto: res.auto,
      createdAt: Date.now(),
    });
    App.commit('body');
    UI.toast(res.matched ? '已加入，按「' + res.matched + '」估算 ' + res.kcal + ' kcal' : '已加入，热量可稍后手动修正');
  };

  App.actions['body.meal.del'] = function (el) {
    App.deleteById(Store.state.body.meals, el.dataset.id);
    App.commit('body');
  };

  /* =======================================================
     物品管理
     ======================================================= */
  function stockModal(item) {
    const it = item || {};
    UI.modal({
      title: item ? '编辑物品' : '新增物品',
      desc: '记录护肤品、日用品、食材，消耗时更新余量。',
      wide: true,
      fields: [
        { name: 'name', label: '物品名称', type: 'text', required: true, value: it.name || '', placeholder: '例如：洗发水 / 面霜 / 大米' },
        { name: 'buyDate', label: '购入日期', type: 'date', value: it.buyDate || dateStr() },
        { name: 'remaining', label: '现有余量', type: 'number', step: '0.1', min: '0', value: it.remaining == null ? '' : it.remaining, placeholder: '1' },
        { name: 'unit', label: '单位', type: 'text', value: it.unit || '件', placeholder: '瓶 / 支 / 袋 / kg' },
        { name: 'expiry', label: '保质期至（可选）', type: 'date', value: it.expiry || '' },
        { name: 'note', label: '备注', type: 'text', value: it.note || '', placeholder: '存放位置、购买渠道……' },
      ],
      submitText: item ? '保存修改' : '添加物品',
      onSubmit(data) {
        const name = String(data.name || '').trim();
        if (!name) { UI.toast('请填写物品名称', 'warn'); return false; }
        const patch = {
          name,
          buyDate: data.buyDate || dateStr(),
          remaining: data.remaining === '' ? 0 : Math.max(0, toNum(data.remaining)),
          unit: String(data.unit || '件').trim() || '件',
          expiry: data.expiry || '',
          note: String(data.note || '').trim(),
        };
        if (item) {
          Object.assign(item, patch, { updatedAt: Date.now() });
        } else {
          Store.state.inventory.stock.push(Object.assign({
            id: util.uid('st'), history: [], createdAt: Date.now(),
          }, patch));
        }
        App.commit('inventory');
        UI.toast(item ? '物品已更新' : '物品已入库');
      },
    });
  }

  function consumeModal(item) {
    UI.modal({
      title: '记录一次使用 · ' + item.name,
      desc: '当前剩余 ' + util.fmtNum(item.remaining) + ' ' + item.unit + '，记录后会从余量中扣除。',
      fields: [
        { name: 'amount', label: '消耗数量', type: 'number', step: '0.1', min: '0.1', required: true, value: 1 },
        { name: 'date', label: '日期', type: 'date', value: dateStr() },
        { name: 'note', label: '使用记录 / 备注', type: 'text', placeholder: '例如：早晚各用一次 / 分装给朋友' },
      ],
      submitText: '扣除余量',
      onSubmit(data) {
        const amount = toNum(data.amount);
        if (amount <= 0) { UI.toast('消耗数量要大于 0', 'warn'); return false; }
        if (amount > item.remaining + 0.0001) {
          UI.toast('消耗量超过当前余量，请先编辑余量', 'warn');
          return false;
        }
        item.remaining = Math.max(0, +(item.remaining - amount).toFixed(2));
        item.history = item.history || [];
        item.history.unshift({
          id: util.uid('sh'), date: data.date || dateStr(), amount,
          note: String(data.note || '').trim(), createdAt: Date.now(),
        });
        item.updatedAt = Date.now();
        App.commit('inventory');
        UI.toast('已扣除，剩余 ' + util.fmtNum(item.remaining) + ' ' + item.unit);
      },
    });
  }

  function stockHistoryModal(item) {
    const rows = (item.history || []).slice().sort((a, b) => b.createdAt - a.createdAt);
    UI.modal({
      title: item.name + ' · 使用记录',
      desc: '共 ' + rows.length + ' 次使用，当前剩余 ' + util.fmtNum(item.remaining) + ' ' + item.unit,
      form: false,
      wide: true,
      body: rows.length
        ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>消耗</th><th>备注</th></tr></thead><tbody>' +
          rows.map((h) => '<tr><td>' + fmtDay(h.date) + '</td><td class="num">' +
            util.fmtNum(h.amount) + ' ' + esc(item.unit) + '</td><td>' + esc(h.note || '—') + '</td></tr>').join('') +
          '</tbody></table></div>'
        : UI.empty('📋', '还没有使用记录'),
      footer: '<button type="button" class="btn" data-modal-close>关闭</button>',
    });
  }

  function replaceModal(item) {
    const it = item || {};
    UI.modal({
      title: item ? '编辑更换提醒' : '新增耗材更换提醒',
      desc: '适合隐形眼镜、内衣裤、牙刷、滤芯等需要定期更换的物品。',
      wide: true,
      fields: [
        { name: 'name', label: '物品名称', type: 'text', required: true, value: it.name || '', placeholder: '例如：隐形眼镜 / 内衣 / 净水器滤芯' },
        { name: 'openDate', label: '开封 / 开始使用日期', type: 'date', required: true, value: it.openDate || dateStr() },
        { name: 'cycleDays', label: '建议更换周期（天）', type: 'number', required: true, min: '1', max: '3650', step: '1', value: it.cycleDays || '', placeholder: '例如：30 / 90 / 180' },
        { name: 'note', label: '备注', type: 'text', value: it.note || '', placeholder: '型号、购买渠道、更换位置……' },
      ],
      submitText: item ? '保存修改' : '添加提醒',
      onSubmit(data) {
        const name = String(data.name || '').trim();
        const cycle = Math.round(toNum(data.cycleDays));
        if (!name || cycle <= 0) { UI.toast('请填写名称与周期', 'warn'); return false; }
        const patch = {
          name, openDate: data.openDate || dateStr(), cycleDays: cycle,
          note: String(data.note || '').trim(),
        };
        if (item) {
          Object.assign(item, patch, { updatedAt: Date.now() });
        } else {
          Store.state.inventory.replace.push(Object.assign({
            id: util.uid('rp'), lastReplace: '', records: [], createdAt: Date.now(),
          }, patch));
        }
        App.commit('inventory');
        UI.toast(item ? '提醒已更新' : '提醒已添加');
      },
    });
  }

  function replaceDue(item) {
    const base = item.lastReplace || item.openDate;
    const due = addDays(base, item.cycleDays);
    return { due, days: dayDiff(dateStr(), due) };
  }

  App.views.inventory = function () {
    const st = Store.state;
    const tab = App.tab('inventory', 'stock');
    const stock = st.inventory.stock || [];
    const shopping = st.inventory.shopping || [];
    const replace = st.inventory.replace || [];
    const warnDays = App.thresholdWarnDays();
    let body = '';

    if (tab === 'stock') {
      body = '<div class="page-head"><div class="ph-text"><h2>物品库存</h2>' +
          '<p>记录余量与每次使用，防止囤货遗忘、过期。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="stock.add">' + ICON('plus') + '新增物品</button></div></div>' +
        (stock.length ? '<section class="card" style="padding:8px 16px 14px"><div class="table-wrap">' +
          '<table class="data-table table--stack"><thead><tr>' +
            '<th>物品名称</th><th>购入日期</th><th>现有余量</th><th>使用记录</th><th></th></tr></thead><tbody>' +
          stock.map((it) => {
            const used = (it.history || []).reduce((n, h) => n + toNum(h.amount), 0);
            const total = (it.remaining || 0) + used;
            const pct = total > 0 ? Math.max(2, Math.round((it.remaining / total) * 100)) : 0;
            const expDays = it.expiry ? dayDiff(dateStr(), it.expiry) : null;
            const expBadge = expDays == null ? '' : (expDays < 0
              ? '<span class="badge badge--danger" style="margin-left:6px">已过期 ' + Math.abs(expDays) + ' 天</span>'
              : expDays <= 7 ? '<span class="badge badge--warn" style="margin-left:6px">临期 ' + expDays + ' 天</span>' : '');
            const latest = (it.history || [])[0];
            return '<tr>' +
              '<td data-label="物品"><span class="cell-main">' + esc(it.name) + expBadge + '</span>' +
                (it.note ? '<span class="cell-sub">' + esc(it.note) + '</span>' : '') + '</td>' +
              '<td class="num" data-label="购入">' + fmtDay(it.buyDate) + '</td>' +
              '<td data-label="余量"><div class="stock-bar"><span class="stock-num">' + util.fmtNum(it.remaining) + ' ' + esc(it.unit) + '</span>' +
                '<div class="bar bar--thin"><i style="width:' + pct + '%"></i></div></div></td>' +
              '<td data-label="使用记录">' + (latest
                ? '<button type="button" class="link" data-act="stock.history" data-id="' + it.id + '">' +
                  fmtDay(latest.date) + ' 用掉 ' + util.fmtNum(latest.amount) + ' · 全部 ' + (it.history || []).length + ' 次</button>'
                : '<span style="color:var(--faint);font-size:11.5px">暂无使用记录</span>') + '</td>' +
              '<td><div class="actions">' +
                '<button type="button" class="btn btn--soft btn--sm" data-act="stock.consume" data-id="' + it.id + '">消耗</button>' +
                '<button type="button" class="row-act" data-act="stock.edit" data-id="' + it.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
                '<button type="button" class="row-del" data-act="stock.del" data-id="' + it.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div></section>'
          : '<section class="card">' + UI.empty('🧴', '还没有物品入库', '从每天都会用的护肤品、日用品开始记录。') +
            '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="stock.add">' +
            ICON('plus') + '新增第一件物品</button></div></section>') +
        '<p style="font-size:11px;color:var(--ghost)">余量进度条按「已用 + 现有」估算，仅作提醒参考。</p>';

    } else if (tab === 'shopping') {
      const open = shopping.filter((x) => !x.done);
      const done = shopping.filter((x) => x.done);
      body = '<div class="page-head"><div class="ph-text"><h2>采购清单</h2>' +
          '<p>顺手记下要买的东西，采购完勾掉。</p></div></div>' +
        '<section class="card">' +
          '<form class="add-form add-form--wrap" data-form="shopping.add">' +
            '<div style="flex:1 1 200px"><input type="text" name="name" placeholder="要采购什么？" required maxlength="100"></div>' +
            '<div style="flex:0 0 90px"><input type="number" name="qty" min="1" step="1" value="1" placeholder="数量" aria-label="数量"></div>' +
            '<button type="submit" class="btn">' + ICON('plus') + '加入清单</button>' +
          '</form>' +
          '<div class="sub-head"><h3>待采购</h3><span class="count-chip">' + open.length + '</span><span class="line"></span>' +
            (done.length ? '<button type="button" class="link" data-act="shopping.clearDone">清除已采购</button>' : '') + '</div>' +
          '<div class="check-list">' + (open.length ? open.map((x) => App.checkRow({
            id: x.id, checked: false, label: x.name + (x.qty > 1 ? ' ×' + x.qty : ''),
            change: 'shopping.toggle', delAct: 'shopping.del', meta: '待购买',
          })).join('') : UI.empty('🛒', '清单是空的', '把最近想买的东西写下来。')) + '</div>' +
          (done.length ? '<div class="sub-head"><h3>已采购</h3><span class="count-chip">' + done.length +
            '</span><span class="line"></span></div><div class="check-list">' +
            done.map((x) => App.checkRow({
              id: x.id, checked: true, label: x.name + (x.qty > 1 ? ' ×' + x.qty : ''),
              change: 'shopping.toggle', delAct: 'shopping.del', meta: '已购买',
            })).join('') + '</div>' : '') +
        '</section>';

    } else {
      const dueList = replace.map((it) => ({ it, ...replaceDue(it) })).sort((a, b) => a.days - b.days);
      const warnCount = dueList.filter((x) => x.days <= warnDays).length;
      body = '<div class="page-head"><div class="ph-text"><h2>耗材更换提醒</h2>' +
          '<p>开封日期 + 建议周期，自动算出下一次该换的时间。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="replace.add">' + ICON('plus') + '新增提醒</button></div></div>' +
        (warnCount ? '<div class="card card--cream" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<span style="font-size:20px">⏰</span><strong style="font-size:14px">有 ' + warnCount +
          ' 件耗材临近或已到更换时间</strong><span style="flex:1"></span>' +
          '<span class="badge badge--warn">提前 ' + warnDays + ' 天提醒</span></div>' : '') +
        '<section class="card">' +
        (dueList.length ? dueList.map(({ it, due, days }) => {
          const state = days < 0 ? 'is-over' : days <= warnDays ? 'is-warn' : '';
          const badge = days < 0 ? '<span class="badge badge--danger">已超期 ' + Math.abs(days) + ' 天</span>'
            : days <= warnDays ? '<span class="badge badge--warn">还有 ' + days + ' 天</span>'
            : '<span class="badge badge--olive">正常</span>';
          return '<div class="replace-card">' +
            '<div class="replace-main"><strong>' + esc(it.name) + ' ' + badge + '</strong>' +
              '<p>开封 ' + fmtDay(it.openDate) + ' · 周期 ' + it.cycleDays + ' 天 · 下次 ' + fmtDay(due) +
              (it.lastReplace ? ' · 上次换新 ' + fmtDay(it.lastReplace) : '') + '</p>' +
              (it.note ? '<p>' + esc(it.note) + '</p>' : '') +
              ((it.records || []).length
                ? '<p>换新记录：' + (it.records || []).slice(0, 4).map((r) => fmtDay(r.date)).join(' / ') +
                  ((it.records || []).length > 4 ? ' 等 ' + it.records.length + ' 次' : '') + '</p>'
                : '') +
            '</div>' +
            '<div class="replace-when"><span class="days-big ' + state + '">' +
              (days < 0 ? '+' + Math.abs(days) : days) + '</span><span style="font-size:10.5px;color:var(--faint)">' +
              (days < 0 ? '天前该换' : days === 0 ? '今天换' : '天后') + '</span></div>' +
            '<div class="actions" style="display:flex;gap:2px">' +
              '<button type="button" class="btn btn--soft btn--sm" data-act="replace.renew" data-id="' + it.id + '">已更换</button>' +
              '<button type="button" class="row-act" data-act="replace.edit" data-id="' + it.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
              '<button type="button" class="row-del" data-act="replace.del" data-id="' + it.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
            '</div></div>';
        }).join('') : UI.empty('🪥', '还没有更换提醒', '隐形眼镜、内衣裤、牙刷、滤芯……写下来就不会忘。')) +
        '</section>' +
        '<p style="font-size:11px;color:var(--ghost)">到期时间 = 上次换新日期（未换过则按开封日期）+ 建议周期。可在设置里调整提前提醒天数。</p>';
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>让物品各就各位</h2>' +
        '<p>库存、采购、耗材更换，三件小事一次管好。</p></div>' +
        '<div class="ph-actions"><span class="badge badge--olive">' + stock.length + ' 件库存</span>' +
        '<span class="badge">' + shopping.filter((x) => !x.done).length + ' 项待购</span></div></div>' +
      tabBar('inventory', tab, [
        { id: 'stock', label: '物品库存', count: stock.length },
        { id: 'shopping', label: '采购清单', count: shopping.filter((x) => !x.done).length },
        { id: 'replace', label: '耗材更换', count: replace.length },
      ]) +
      body +
    '</div>';
  };

  App.actions['stock.add'] = function () { stockModal(null); };
  App.actions['stock.edit'] = function (el) {
    const it = Store.state.inventory.stock.find((x) => x.id === el.dataset.id);
    if (it) stockModal(it);
  };
  App.actions['stock.consume'] = function (el) {
    const it = Store.state.inventory.stock.find((x) => x.id === el.dataset.id);
    if (it) consumeModal(it);
  };
  App.actions['stock.history'] = function (el) {
    const it = Store.state.inventory.stock.find((x) => x.id === el.dataset.id);
    if (it) stockHistoryModal(it);
  };
  App.actions['stock.del'] = async function (el) {
    const it = Store.state.inventory.stock.find((x) => x.id === el.dataset.id);
    if (!it) return;
    const ok = await UI.confirm({ title: '删除这件物品？', message: '「' + it.name + '」及其使用记录会被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.inventory.stock, it.id);
    App.commit('inventory');
    UI.toast('已删除');
  };

  App.forms['shopping.add'] = function (data) {
    const name = String(data.name || '').trim();
    if (!name) return;
    Store.state.inventory.shopping.push({
      id: util.uid('sp'), name, qty: Math.max(1, Math.round(toNum(data.qty, 1))),
      done: false, createdAt: Date.now(), doneAt: null,
    });
    App.commit('inventory');
  };

  App.actions['shopping.toggle'] = function (el) {
    const it = Store.state.inventory.shopping.find((x) => x.id === el.dataset.id);
    if (!it) return;
    it.done = el.checked;
    it.doneAt = el.checked ? Date.now() : null;
    App.commit('inventory');
  };
  App.actions['shopping.del'] = async function (el) {
    const it = Store.state.inventory.shopping.find((x) => x.id === el.dataset.id);
    if (!it) return;
    const ok = await UI.confirm({ title: '从采购清单删除？', message: '「' + it.name + '」', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.inventory.shopping, it.id);
    App.commit('inventory');
  };
  App.actions['shopping.clearDone'] = async function () {
    const ok = await UI.confirm({ title: '清除已采购？', message: '所有已勾选的采购项会被删除。', okText: '清除' });
    if (!ok) return;
    Store.state.inventory.shopping = Store.state.inventory.shopping.filter((x) => !x.done);
    App.commit('inventory');
    UI.toast('已清除');
  };

  App.actions['replace.add'] = function () { replaceModal(null); };
  App.actions['replace.edit'] = function (el) {
    const it = Store.state.inventory.replace.find((x) => x.id === el.dataset.id);
    if (it) replaceModal(it);
  };
  App.actions['replace.renew'] = async function (el) {
    const it = Store.state.inventory.replace.find((x) => x.id === el.dataset.id);
    if (!it) return;
    const ok = await UI.confirm({
      title: '记录一次换新？',
      message: '「' + it.name + '」的下次更换时间会从今天重新计算。',
      okText: '已更换',
      danger: false,
    });
    if (!ok) return;
    it.lastReplace = dateStr();
    it.records = it.records || [];
    it.records.unshift({ id: util.uid('rr'), date: dateStr(), createdAt: Date.now() });
    it.updatedAt = Date.now();
    App.commit('inventory');
    UI.toast('已记录，下次更换时间已更新');
  };
  App.actions['replace.del'] = async function (el) {
    const it = Store.state.inventory.replace.find((x) => x.id === el.dataset.id);
    if (!it) return;
    const ok = await UI.confirm({ title: '删除这条提醒？', message: '「' + it.name + '」的更换记录也会删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.inventory.replace, it.id);
    App.commit('inventory');
  };

  /* =======================================================
     穿搭参考
     ======================================================= */
  const COLOR_WORDS = [
    { keys: ['藏青', '藏蓝'], name: '藏青', hex: '#2E3A59' },
    { keys: ['牛仔'], name: '牛仔蓝', hex: '#5B7FA6' },
    { keys: ['米白', '米色', '燕麦', '奶油白'], name: '米白', hex: '#E8DCC4' },
    { keys: ['白'], name: '月白', hex: '#F6F2E6' },
    { keys: ['黑'], name: '黑巧棕', hex: '#3A231E' },
    { keys: ['棕', '咖', '咖啡', '焦糖', '驼'], name: '焦糖棕', hex: '#8B5E3C' },
    { keys: ['卡其', '杏'], name: '卡其', hex: '#C3A982' },
    { keys: ['灰'], name: '雾灰', hex: '#9A9A96' },
    { keys: ['橄榄', '军绿', '绿'], name: '橄榄绿', hex: '#8AA832' },
    { keys: ['红', '酒红', '砖红'], name: '砖红', hex: '#A84A3C' },
    { keys: ['粉', '玫瑰'], name: '奶油粉', hex: '#E3B7B0' },
    { keys: ['紫', '香芋'], name: '香芋紫', hex: '#9C8AB0' },
    { keys: ['黄', '姜黄'], name: '姜黄', hex: '#D8B04A' },
    { keys: ['橙', '橘'], name: '暖橘', hex: '#CE8A4C' },
    { keys: ['蓝'], name: '雾蓝', hex: '#6E93B5' },
    { keys: ['金'], name: '浅金', hex: '#C9A227' },
    { keys: ['银'], name: '银', hex: '#C0C0C0' },
  ];

  const STYLE_PALETTES = {
    '简约': ['米白', '黑巧棕', '卡其'],
    '通勤': ['月白', '藏青', '焦糖棕'],
    '休闲': ['牛仔蓝', '米白', '橄榄绿'],
    '约会': ['奶油粉', '米白', '焦糖棕'],
    '运动': ['橄榄绿', '雾灰', '月白'],
    '度假': ['暖橘', '米白', '橄榄绿'],
    '复古': ['焦糖棕', '橄榄绿', '米白'],
    '甜酷': ['黑巧棕', '雾灰', '橄榄绿'],
    '温柔': ['奶油粉', '米白', '焦糖棕'],
    '知性': ['燕麦', '藏青', '雾灰'],
    '法式': ['米白', '砖红', '藏青'],
    '街头': ['黑巧棕', '雾灰', '橄榄绿'],
    '学院': ['藏青', '米白', '卡其'],
  };

  const STYLE_TRENDS = {
    '简约': ['同色系叠穿：米白 + 燕麦 + 焦糖，靠材质差异做层次。', '上短下长：短外套 + 高腰直筒裤，比例干净利落。'],
    '通勤': ['低饱和 + 挺括面料 + 小金属配饰，是本季最稳的通勤公式。', '西装 + 直筒牛仔 + 乐福鞋，松弛但有精神。'],
    '休闲': ['美拉德配色：棕 + 米 + 橄榄绿，适合秋冬。', '上宽下窄：oversize 卫衣 + 直筒裤或骑行裤。'],
    '约会': ['柔光感：针织 + 缎面半裙 + 小包，颜色控制在奶油色系。', '只露一处：锁骨、手腕或脚踝，留一点呼吸感。'],
    '运动': ['Athleisure：运动内衣 + 阔腿运动裤 + 薄外套。', '鞋袜同色，把腿部线条一口气延伸下去。'],
    '度假': ['衬衫裙 + 草编包 + 平底凉鞋，颜色可以明亮一点。', '亚麻套装选同色系，显高又防晒。'],
    '复古': ['美拉德 + 格纹 + 棕色皮鞋，材质要有分量。', '高腰微喇裤 + 短针织，复刻 90 年代比例。'],
    '甜酷': ['黑 + 灰 + 一点橄榄绿，硬朗材质混搭柔软内搭。', '短上衣 + 工装裤 + 厚底鞋，重心稳、比例好。'],
    '温柔': ['奶油色系 + 柔软针织 + 半裙，材质一定要垂坠。', '同色系鞋包，整体轻一点、软一点。'],
    '知性': ['衬衫 + 西装阔腿裤 + 细框眼镜，线条利落。', '燕麦 / 藏青 / 雾灰，全身不超过三色。'],
    '法式': ['条纹衫 + 直筒牛仔 + 芭蕾鞋，头发随意一点。', '红唇 + 基础款，少即是多。'],
    '街头': ['oversize + 工装 + 球鞋，用叠穿增加层次。', '黑灰为主，亮色只放在帽子或鞋上。'],
    '学院': ['衬衫 + 针织背心 + 百褶裙或直筒裤，藏青米白最稳。', '乐福鞋 + 中筒袜，学院感立刻出来。'],
  };

  const OCCASION_TIPS = {
    '通勤': ['线条干净的衬衫、西装外套或直筒裤，减少荷叶边和大面积印花。', '鞋包尽量同色，整个人会显得更利落。', '用小面积金属耳饰提亮，不要超过两处重点。'],
    '日常': ['舒服的版型优先，上松下紧或上紧下松只选一个。', '用一件有质感的外套把基础款串起来。', '帆布包、棒球帽能让整体更松弛。'],
    '约会': ['材质柔软、有一点垂坠感的单品更显温柔。', '全身只保留一处露肤：锁骨、手腕或脚踝。', '把亮点放在脸附近，例如小耳饰或有颜色的内搭。'],
    '运动': ['优先透气、弹力面料，避免太多硬挺配件。', '鞋袜与下装同色，腿部线条更完整。', '外层选轻薄防风，方便随时脱。'],
    '度假': ['轻盈的棉麻、衬衫裙或阔腿裤，方便走动。', '把颜色交给配饰：草帽、丝巾、编织包。', '注意防晒，浅色更不吸热。'],
    '正式': ['结构感外套 + 低饱和内搭，避免复杂装饰。', '尖头鞋或乐福鞋拉长脚背，配一只小号手袋。', '金属配饰小而精，全身不超过两种材质。'],
    '聚会': ['选一个视觉重点：亮色上衣、光泽裙或夸张耳饰。', '其他单品保持黑、白、棕，让重点真正突出。', '可以用一点缎面或金属光泽增加氛围。'],
    '居家': ['柔软针织、宽松长裤，减少束缚感。', '同色系叠穿，舒服也好看。', '准备一件薄外套，起身见人也不狼狈。'],
  };

  function colorsInText(text) {
    let t = String(text || '');
    const found = [];
    COLOR_WORDS.forEach((c) => {
      let at = -1;
      c.keys.forEach((k) => {
        const i = t.indexOf(k);
        if (i >= 0 && (at < 0 || i < at)) at = i;
      });
      if (at < 0) return;
      if (!found.some((o) => o.hex === c.hex)) found.push({ name: c.name, hex: c.hex, at });
      // 去掉已识别的词，避免「米白」又被「白」重复识别
      c.keys.forEach((k) => { t = t.split(k).join('　'); });
    });
    return found.sort((a, b) => a.at - b.at).map((c) => ({ name: c.name, hex: c.hex }));
  }

  function colorByName(name) {
    const c = COLOR_WORDS.find((x) => x.name === name);
    return c ? c.hex : '#E8DCC4';
  }

  function getBodyShape(b) {
    if (!b) return { shape: '匀称型', text: '', bmi: null };
    let shape = '直筒型';
    if (b.hip && b.bust && b.waist) {
      if (b.hip - b.bust >= 5 && b.waist / b.hip < 0.8) shape = '梨形';
      else if (b.bust - b.hip >= 5) shape = '倒三角';
      else if (b.waist / b.hip <= 0.75) shape = '沙漏型';
      else if (b.waist / b.hip >= 0.85) shape = '苹果型';
    } else if (b.waist && b.hip) {
      if (b.waist / b.hip >= 0.85) shape = '苹果型';
      else if (b.waist / b.hip <= 0.75) shape = '沙漏型';
    }
    const bmi = b.height && b.weight ? +(b.weight / Math.pow(b.height / 100, 2)).toFixed(1) : null;
    return { shape, bmi, height: b.height, weight: b.weight };
  }

  function shapeAdvice(shape) {
    const map = {
      '梨形': [
        '上半身用有结构感的肩线、泡泡袖或浅色把视线提上去，下半身选 A 字、直筒或微阔腿。',
        '下装尽量选深色、垂坠面料，避免紧身包臀与大面积横条纹。',
        '外套长度停在胯骨最宽处上方或下方，不要正好卡在最宽的位置。',
      ],
      '苹果型': [
        '用 V 领、开襟或落肩拉开上半身线条，把注意力放在锁骨和脸部。',
        '下装选高腰直筒裤或 A 字裙，腰部避免层层叠叠的装饰。',
        '薄软贴身的面料容易显腰腹，优先选有挺度的棉、西装料。',
      ],
      '沙漏型': [
        '一定要露出腰线：收腰连衣裙、高腰裤 + 短上衣都很适合。',
        '避免从头到脚都宽松的 oversize，会把优势藏起来。',
        '下装选贴合但不紧绷的直筒或微喇，平衡上下比例。',
      ],
      '倒三角': [
        '上装保持简洁，把量感放在下半身：阔腿裤、伞裙、工装裤。',
        'V 领和落肩能柔化肩线，避免夸张垫肩和横向宽条纹。',
        '用腰带或收腰外套制造腰线，避免上半身一整块。',
      ],
      '直筒型': [
        '用腰带、短上衣或塞衣角制造腰线，让比例更明确。',
        '叠穿增加层次：衬衫 + 针织背心、外套 + 内搭。',
        '下装可选 A 字或微阔腿，给身体多一点曲线。',
      ],
      '匀称型': [
        '你的身材限制很少，按场合选版型即可。',
        '想更有记忆点，可以用一件有设计感的单品 + 其余基础款。',
        '保持腰线清晰，整体就不会显得拖沓。',
      ],
    };
    return map[shape] || map['匀称型'];
  }

  function buildOutfitAdvice(form, bodyRec) {
    const style = form.style || '简约';
    const occasion = form.occasion || '日常';
    const texts = [form.top, form.bottom, form.shoes, form.acc].filter(Boolean).join(' ');
    let userColors = colorsInText(texts);
    if (!userColors.length) {
      userColors = (STYLE_PALETTES[style] || STYLE_PALETTES['简约']).map((n) => ({ name: n, hex: colorByName(n) }));
    } else if (userColors.length === 1) {
      const extra = STYLE_PALETTES[style] || STYLE_PALETTES['简约'];
      const add = colorByName(extra[1] || extra[0]);
      if (add !== userColors[0].hex) userColors.push({ name: extra[1], hex: add });
    } else if (userColors.length === 2) {
      userColors.push({ name: '黑巧棕', hex: '#3A231E' });
    }
    userColors = userColors.slice(0, 3);
    const body = getBodyShape(bodyRec);
    const shape = body.shape;
    const h = body.height ? +body.height : null;
    const bmi = body.bmi;
    const occasionTips = OCCASION_TIPS[occasion] || OCCASION_TIPS['日常'];
    const shapeTips = shapeAdvice(shape);

    const colorItems = [
      '以「' + userColors[0].name + '」为主色，占全身约 60%；「' + (userColors[1] || userColors[0]).name +
        '」做过渡，占 30%；「' + (userColors[2] || userColors[1] || userColors[0]).name + '」只做 10% 的点缀。',
      form.top || form.bottom
        ? '你已经选好「' + [form.top, form.bottom, form.shoes].filter(Boolean).join(' + ') +
          '」，把鞋或包的颜色对齐其中一个颜色，整体会更完整。'
        : '先定一个主色，再让鞋、包、腰带围绕它做同色或邻近色。',
      '全身不超过三种高饱和色；如果上衣已经很亮，下装和鞋就回到米白、雾灰或棕色。',
      '想显高，试试下装与鞋同色、袜子与鞋同色，让腿部线条一口气延伸下去。',
    ];

    const fitItems = [];
    if (form.note) {
      fitItems.push('你特别提到「' + form.note + '」：先用腰线和版型解决，不要用一件过大的衣服把整体遮住。');
    }
    if (form.top || form.bottom) {
      fitItems.push('上装「' + (form.top || '基础款') + '」与下装「' + (form.bottom || '基础款') +
        '」组合时，保证一个松、一个紧，不要同时松垮。');
    }
    fitItems.push(...shapeTips);

    const heightItems = [];
    if (h && h < 160) {
      heightItems.push('身高 ' + h + ' cm：优先高腰线、短外套、九分裤，外套长度不要超过小腿中部。');
      heightItems.push('裙长选在膝盖上方或脚踝上方 5 cm，避开小腿最粗的位置。');
    } else if (h && h >= 170) {
      heightItems.push('身高 ' + h + ' cm：可以驾驭长外套与阔腿裤，但要用腰线或内搭明确比例。');
      heightItems.push('避免全身都宽松，至少让一处（腰、脚踝、手腕）保持利落。');
    } else {
      heightItems.push('把上衣前摆塞进下装，腰线抬高 3–5 cm，比例立刻变好。');
      heightItems.push('露出最细的地方：脚踝、手腕或锁骨，任选一处即可。');
    }
    heightItems.push('用竖向线条拉长：开衫、长项链、中缝裤、竖向条纹。');
    if (bmi && bmi >= 24) {
      heightItems.push('BMI ' + bmi + '：优先挺括、有垂坠感的面料，避开薄软贴身与横条纹。');
    } else if (bmi && bmi < 18.5) {
      heightItems.push('BMI ' + bmi + '：用叠穿与浅色增加体积感，避免过于紧身的单品。');
    }

    const summary = [form.top, form.bottom, form.shoes].filter(Boolean).join(' + ') +
      '，' + (form.acc ? '加一件' + form.acc + '，' : '') +
      '整体走' + style + '路线，适合' + occasion + '。';

    const sections = [
      { h: '颜色搭配', items: colorItems },
      { h: '版型与身材', items: fitItems },
      { h: '适合场景', items: occasionTips },
      { h: '流行趋势参考', items: STYLE_TRENDS[style] || STYLE_TRENDS['简约'] },
      { h: '显高显瘦思路', items: heightItems },
      { h: '配饰与细节', items: [
        form.acc ? '配饰「' + form.acc + '」是这套的重点，其他部分尽量安静。' : '如果觉得单调，加一条细项链或一只小包，面积越小越精致。',
        '鞋型决定气质：乐福鞋偏通勤，帆布鞋偏日常，尖头鞋更正式。',
        '头发和妆面也是搭配的一部分，保持干净清爽就赢了一半。',
      ] },
    ];

    return {
      summary,
      colors: userColors,
      sections,
      highlights: [colorItems[0], fitItems[1] || fitItems[0], heightItems[0]],
      meta: { shape, height: h, bmi, style, occasion },
    };
  }

  function wrapText(g, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = String(text || '').split('');
    let line = '';
    let lines = 0;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (g.measureText(test).width > maxWidth && line) {
        g.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
        lines++;
        if (maxLines && lines >= maxLines) return y;
      } else {
        line = test;
      }
    }
    if (line) { g.fillText(line, x, y); y += lineHeight; }
    return y;
  }

  function roundRect(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function drawOutfitImage(form, advice) {
    const W = 720, H = 900;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif';

    g.fillStyle = '#FFFDF4';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,251,211,.45)';
    g.beginPath(); g.arc(80, 40, 190, 0, Math.PI * 2); g.fill();

    g.fillStyle = '#331915';
    g.font = '650 28px ' + FONT;
    g.fillText('穿搭参考', 48, 78);
    g.fillStyle = 'rgba(51,25,21,.45)';
    g.font = '12px ' + FONT;
    g.textAlign = 'right';
    g.fillText(fmtDayFull(dateStr()), 672, 74);
    g.textAlign = 'left';

    g.strokeStyle = 'rgba(51,25,21,.12)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(48, 102); g.lineTo(672, 102); g.stroke();

    const topColor = colorByName((colorsInText(form.top)[0] || {}).name || '') === '#E8DCC4'
      ? (colorsInText(form.top)[0] ? colorsInText(form.top)[0].hex : '#E8DCC4')
      : (colorsInText(form.top)[0] ? colorsInText(form.top)[0].hex : '#E8DCC4');
    const bottomColor = colorsInText(form.bottom)[0] ? colorsInText(form.bottom)[0].hex : '#8B5E3C';
    const shoeColor = colorsInText(form.shoes)[0] ? colorsInText(form.shoes)[0].hex : '#3A231E';
    const accentColor = colorsInText(form.acc)[0] ? colorsInText(form.acc)[0].hex : '#8AA832';

    const cx = 220;
    // 影子
    g.fillStyle = 'rgba(51,25,21,.07)';
    g.beginPath(); g.ellipse(cx + 10, 760, 120, 18, 0, 0, Math.PI * 2); g.fill();

    // 皮肤
    const skin = '#E8CFB8';
    // 腿
    g.fillStyle = skin;
    roundRect(g, cx - 46, 600, 34, 110, 15); g.fill();
    roundRect(g, cx + 12, 600, 34, 110, 15); g.fill();
    // 头
    g.fillStyle = skin;
    g.beginPath(); g.arc(cx, 185, 40, 0, Math.PI * 2); g.fill();
    // 头发
    g.fillStyle = '#4A2B22';
    g.beginPath(); g.arc(cx, 176, 45, Math.PI * 0.96, Math.PI * 2.04); g.fill();
    g.beginPath(); g.arc(cx - 38, 205, 15, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 38, 205, 15, 0, Math.PI * 2); g.fill();
    // 脖子
    g.fillStyle = '#DFC3AA';
    roundRect(g, cx - 12, 218, 24, 26, 8); g.fill();

    // 上衣
    g.fillStyle = topColor;
    g.beginPath();
    g.moveTo(cx - 56, 244);
    g.quadraticCurveTo(cx, 230, cx + 56, 244);
    g.lineTo(cx + 63, 392);
    g.quadraticCurveTo(cx, 410, cx - 63, 392);
    g.closePath(); g.fill();
    // 袖子
    g.fillStyle = topColor;
    g.save(); g.translate(cx - 58, 252); g.rotate(0.12);
    roundRect(g, -16, 0, 32, 125, 15); g.fill(); g.restore();
    g.save(); g.translate(cx + 58, 252); g.rotate(-0.12);
    roundRect(g, -16, 0, 32, 125, 15); g.fill(); g.restore();
    // 手
    g.fillStyle = skin;
    g.beginPath(); g.arc(cx - 70, 386, 12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 70, 386, 12, 0, Math.PI * 2); g.fill();
    // 领口
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.ellipse(cx, 248, 22, 10, 0, 0, Math.PI * 2); g.fill();
    // 项链
    g.strokeStyle = '#C9A227'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, 252, 26, 0.3, Math.PI - 0.3); g.stroke();
    g.fillStyle = '#C9A227'; g.beginPath(); g.arc(cx, 281, 3.2, 0, Math.PI * 2); g.fill();

    // 下装：裙 or 裤
    const isSkirt = /裙/.test(form.bottom || '');
    const isShorts = /短裤/.test(form.bottom || '');
    g.fillStyle = bottomColor;
    if (isSkirt) {
      g.beginPath();
      g.moveTo(cx - 60, 402); g.lineTo(cx + 60, 402);
      g.lineTo(cx + 90, 600); g.quadraticCurveTo(cx, 620, cx - 90, 600);
      g.closePath(); g.fill();
    } else {
      const legBottom = isShorts ? 500 : 640;
      roundRect(g, cx - 62, 400, 58, legBottom - 400, 18); g.fill();
      roundRect(g, cx + 4, 400, 58, legBottom - 400, 18); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(cx - 1, 405, 2, legBottom - 415);
      if (isShorts) {
        g.fillStyle = skin;
        roundRect(g, cx - 44, 500, 30, 105, 14); g.fill();
        roundRect(g, cx + 14, 500, 30, 105, 14); g.fill();
      }
    }
    // 腰带
    g.fillStyle = '#3A231E';
    roundRect(g, cx - 62, 398, 124, 13, 6); g.fill();
    g.fillStyle = '#C9A227';
    g.beginPath(); g.arc(cx, 405, 5, 0, Math.PI * 2); g.fill();

    // 鞋
    g.fillStyle = shoeColor;
    roundRect(g, cx - 52, 704, 48, 20, 8); g.fill();
    roundRect(g, cx + 6, 704, 48, 20, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.fillRect(cx - 50, 718, 44, 2);
    g.fillRect(cx + 8, 718, 44, 2);

    // 包
    g.strokeStyle = accentColor; g.lineWidth = 4;
    g.beginPath(); g.arc(cx + 104, 412, 22, Math.PI, Math.PI * 2); g.stroke();
    g.fillStyle = accentColor;
    roundRect(g, cx + 76, 412, 56, 44, 10); g.fill();

    // 右侧配色
    const px = 420;
    g.fillStyle = 'rgba(51,25,21,.45)';
    g.font = '11px ' + FONT;
    g.fillText('COLOR PALETTE', px, 160);
    advice.colors.forEach((c, i) => {
      const y = 178 + i * 44;
      g.fillStyle = c.hex;
      roundRect(g, px, y, 36, 32, 9); g.fill();
      if (c.hex === '#F6F2E6') { g.strokeStyle = 'rgba(51,25,21,.12)'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = '#331915';
      g.font = '600 13px ' + FONT;
      g.fillText(c.name, px + 48, y + 14);
      g.fillStyle = 'rgba(51,25,21,.38)';
      g.font = '10px ' + FONT;
      g.fillText(c.hex.toUpperCase(), px + 48, y + 28);
    });

    g.fillStyle = 'rgba(51,25,21,.45)';
    g.font = '11px ' + FONT;
    g.fillText('STYLE / OCCASION', px, 330);
    g.fillStyle = '#331915';
    g.font = '600 24px ' + FONT;
    g.fillText(form.style || '简约', px, 362);
    g.fillStyle = 'rgba(51,25,21,.6)';
    g.font = '14px ' + FONT;
    g.fillText('场合 · ' + (form.occasion || '日常'), px, 388);

    // 体型
    if (advice.meta) {
      g.fillStyle = 'rgba(51,25,21,.45)';
      g.font = '11px ' + FONT;
      g.fillText('BODY', px, 430);
      g.fillStyle = '#331915';
      g.font = '600 15px ' + FONT;
      const bodyText = [advice.meta.height ? advice.meta.height + 'cm' : '', advice.meta.shape,
        advice.meta.bmi ? 'BMI ' + advice.meta.bmi : ''].filter(Boolean).join(' · ') || '未录入身材数据';
      g.fillText(bodyText, px, 454);
    }

    // 三条建议
    g.fillStyle = 'rgba(51,25,21,.45)';
    g.font = '11px ' + FONT;
    g.fillText('KEY NOTES', px, 502);
    g.fillStyle = 'rgba(51,25,21,.72)';
    g.font = '12.5px ' + FONT;
    let ty = 528;
    advice.highlights.slice(0, 3).forEach((t) => {
      g.fillStyle = '#8AA832';
      g.beginPath(); g.arc(px + 3, ty - 4, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(51,25,21,.72)';
      ty = wrapText(g, t, px + 14, ty, 236, 20, 3) + 8;
    });

    // 底部
    g.strokeStyle = 'rgba(51,25,21,.10)';
    g.beginPath(); g.moveTo(48, 824); g.lineTo(672, 824); g.stroke();
    g.fillStyle = 'rgba(51,25,21,.45)';
    g.font = '11px ' + FONT;
    g.fillText('我的工作台 · 本地生成，仅供参考', 48, 850);
    g.textAlign = 'right';
    g.fillText(form.top || '', 672, 850);
    g.textAlign = 'left';

    return canvas.toDataURL('image/jpeg', 0.86);
  }

  function adviceHTML(a) {
    return '<p style="font-size:14px;line-height:1.85;color:var(--brown);margin-bottom:4px">' + esc(a.summary) + '</p>' +
      '<div class="swatch-row" style="margin:12px 0 4px">' + a.colors.map((c) =>
        '<span class="swatch" style="background:' + c.hex + '" title="' + esc(c.name) + '"></span>').join('') +
      '<span style="font-size:11px;color:var(--faint);align-self:center;margin-left:4px">' +
      a.colors.map((c) => c.name).join(' / ') + '</span></div>' +
      a.sections.map((s) => '<div class="advice-block"><h4>' + esc(s.h) + '</h4><ul class="advice-list">' +
        s.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join('');
  }

  App.views.outfits = function () {
    const st = Store.state;
    const history = (st.outfits || []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const last = history[0];
    const bodyRec = App.latestBody();
    const pre = (last && last.form) || {};
    const occasions = ['日常', '通勤', '约会', '运动', '度假', '正式', '聚会', '居家'];
    const styles = ['简约', '通勤', '休闲', '约会', '运动', '度假', '复古', '甜酷', '温柔', '知性', '法式', '街头', '学院'];

    const bodyHint = bodyRec
      ? '已读取你最近的体态数据：' + [bodyRec.height ? bodyRec.height + 'cm' : '', bodyRec.weight ? bodyRec.weight + 'kg' : '',
        bodyRec.waist ? '腰围 ' + bodyRec.waist : '', bodyRec.hip ? '臀围 ' + bodyRec.hip : ''].filter(Boolean).join(' · ') +
        '。搭配逻辑来自内置的流行趋势库。'
      : '还没有体态数据，去「身体管理」记一笔，建议会更贴合你。搭配逻辑来自内置的流行趋势库。';

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>今天穿什么</h2>' +
        '<p>结合你的身材、场合与风格偏好，给出具体的搭配思路和参考图。</p></div></div>' +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">👗</div><div class="card-head-text">' +
          '<h2>输入今天的穿搭</h2><p>' + esc(bodyHint) + '</p></div></div>' +
        '<form data-form="outfit.generate">' +
          '<div class="form-grid">' +
            '<div class="field"><label>上衣</label><input type="text" name="top" value="' + esc(pre.top || '') +
              '" placeholder="白色衬衫 / 米色针织" maxlength="80" required></div>' +
            '<div class="field"><label>下装</label><input type="text" name="bottom" value="' + esc(pre.bottom || '') +
              '" placeholder="牛仔直筒裤 / 黑色半裙" maxlength="80" required></div>' +
            '<div class="field"><label>鞋子</label><input type="text" name="shoes" value="' + esc(pre.shoes || '') +
              '" placeholder="棕色乐福鞋 / 白色帆布鞋" maxlength="80"></div>' +
            '<div class="field"><label>配饰</label><input type="text" name="acc" value="' + esc(pre.acc || '') +
              '" placeholder="金色小耳环 / 帆布包 / 墨镜" maxlength="80"></div>' +
            '<div class="field"><label>场合</label><select name="occasion">' +
              occasions.map((o) => '<option' + (pre.occasion === o ? ' selected' : '') + '>' + o + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label>风格偏好</label><select name="style">' +
              styles.map((s) => '<option' + (pre.style === s ? ' selected' : '') + '>' + s + '</option>').join('') +
            '</select></div>' +
            '<div class="field span-2"><label>想突出的优点 / 在意的点（可选）</label>' +
              '<input type="text" name="note" value="' + esc(pre.note || '') +
              '" placeholder="例如：想显腿长 / 遮住小肚子 / 今天想穿得温柔一点" maxlength="120"></div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center">' +
            '<button type="submit" class="btn">' + ICON('spark') + '生成搭配建议与参考图</button>' +
            '<span style="font-size:11px;color:var(--faint)">参考图由浏览器本地绘制，不会上传任何数据。</span>' +
          '</div>' +
        '</form>' +
      '</section>' +

      (last ? '<section class="card">' +
        '<div class="card-head"><div class="ico-box">✨</div><div class="card-head-text">' +
          '<h2>最近一次搭配参考</h2><p>' + fmtDayFull(dateStr(new Date(last.createdAt))) + ' · ' +
          esc((last.form && last.form.occasion) || '日常') + '</p></div>' +
          '<div class="head-actions"><button type="button" class="btn btn--quiet btn--sm" data-act="outfit.del" data-id="' +
            last.id + '">删除</button></div></div>' +
        '<div class="outfit-layout">' +
          '<div>' + adviceHTML(last.advice) + '</div>' +
          '<div><div class="outfit-preview"><img src="' + last.image + '" alt="穿搭参考图" data-act="photo.view" ' +
            'style="cursor:zoom-in"></div>' +
            '<p style="font-size:11px;color:var(--faint);margin-top:8px;text-align:center">点击图片可放大查看</p></div>' +
        '</div>' +
      '</section>' : '') +

      '<section class="card">' +
        '<div class="card-head"><div class="ico-box">🗂</div><div class="card-head-text">' +
          '<h2>历史穿搭参考 <span class="count-chip">' + history.length + '</span></h2>' +
          '<p>每一次生成都会自动保存，随时回看。</p></div></div>' +
        (history.length ? '<div class="history-grid">' + history.map((h) =>
          '<div class="history-card"><img src="' + h.image + '" alt="穿搭参考" loading="lazy" data-act="outfit.view" data-id="' + h.id + '">' +
          '<div class="hc-body"><strong>' + esc(((h.form && h.form.top) || '') + ' + ' + ((h.form && h.form.bottom) || '')) + '</strong>' +
          '<span>' + fmtDay(dateStr(new Date(h.createdAt))) + ' · ' + esc((h.form && h.form.occasion) || '') + '</span></div>' +
          '<div class="hc-actions"><button type="button" class="link" data-act="outfit.view" data-id="' + h.id + '">查看</button>' +
          '<button type="button" class="link link--danger" data-act="outfit.del" data-id="' + h.id + '">删除</button></div></div>').join('') + '</div>'
          : UI.empty('👗', '还没有搭配记录', '填写上面的信息，生成第一张参考图。')) +
      '</section>' +
    '</div>';
  };

  App.forms['outfit.generate'] = function (data) {
    const form = {
      top: String(data.top || '').trim(),
      bottom: String(data.bottom || '').trim(),
      shoes: String(data.shoes || '').trim(),
      acc: String(data.acc || '').trim(),
      occasion: data.occasion || '日常',
      style: data.style || '简约',
      note: String(data.note || '').trim(),
    };
    if (!form.top || !form.bottom) { UI.toast('至少写下上衣和下装', 'warn'); return; }
    const bodyRec = App.latestBody();
    const advice = buildOutfitAdvice(form, bodyRec);
    let image = '';
    try {
      image = drawOutfitImage(form, advice);
    } catch (err) {
      console.error(err);
      UI.toast('参考图生成失败，建议文字仍可保存', 'warn');
    }
    const record = { id: util.uid('of'), createdAt: Date.now(), form, advice, image };
    Store.state.outfits.push(record);
    Store.touch('outfits');
    const ok = Store.save({ immediate: true });
    if (!ok) {
      const idx = Store.state.outfits.indexOf(record);
      if (idx >= 0) Store.state.outfits.splice(idx, 1);
    }
    App.render();
    if (ok) UI.toast('搭配建议已生成并保存');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  App.actions['outfit.view'] = function (el) {
    const item = Store.state.outfits.find((x) => x.id === el.dataset.id);
    if (!item) return;
    UI.modal({
      title: '穿搭参考 · ' + fmtDay(dateStr(new Date(item.createdAt))),
      desc: (item.form.top || '') + ' + ' + (item.form.bottom || '') + ' · ' + (item.form.occasion || ''),
      form: false,
      wide: true,
      body: '<div class="outfit-layout">' +
        '<div>' + adviceHTML(item.advice) + '</div>' +
        '<div><img src="' + item.image + '" alt="穿搭参考" style="width:100%;border-radius:14px;border:1px solid var(--line)"></div>' +
        '</div>',
      footer: '<button type="button" class="btn" data-modal-close>关闭</button>',
    });
  };

  App.actions['outfit.del'] = async function (el) {
    const item = Store.state.outfits.find((x) => x.id === el.dataset.id);
    if (!item) return;
    const ok = await UI.confirm({ title: '删除这条穿搭记录？', message: '建议与参考图都会被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.outfits, item.id);
    App.commit('outfits', { immediate: true });
    UI.toast('已删除');
  };
})();
