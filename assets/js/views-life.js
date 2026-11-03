/* =========================================================
   板块：美妆护肤 / 存钱目标 / 纪念日 / 人情台账 / 愿望清单
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
     美妆护肤
     ======================================================= */
  const FACE_SHAPES = ['鹅蛋脸', '圆脸', '方脸', '长脸', '心形脸', '菱形脸'];
  const MAKEUP_CATEGORIES = ['底妆', '眉妆', '眼妆', '腮红', '唇妆', '修容', '工具', '护肤'];

  function makeupAdvice(form, products) {
    const face = form.face || '鹅蛋脸';
    const occasion = form.occasion || '日常';
    const style = form.style || '简约';

    const faceMap = {
      '鹅蛋脸': ['底妆保持薄透，重点放在提亮面中，轮廓不用刻意修。', '眉形顺着原生眉骨，眼妆可以尝试任何形状。', '腮红打在苹果肌，向太阳穴轻扫即可。'],
      '圆脸': ['修容从颧骨下方斜向太阳穴，下颌线轻扫，拉长脸型。', '眉毛画一点眉峰，眼线向外拉长，避免圆眼妆。', '腮红斜向上扫，不要打在苹果肌正中央。'],
      '方脸': ['用柔和的弧形眉中和下颌角，避免挑眉。', '修容弱化下颌角，腮红在颧骨上打圈。', '眼妆重点放在上眼睑，唇妆选柔润质地。'],
      '长脸': ['腮红横向打在颧骨，视觉上把脸“截短”。', '眉毛画平一点，眼妆强调下眼影与卧蚕。', '修容少用在下颌，避免脸更长。'],
      '心形脸': ['额头两侧轻扫修容，弱化上宽下窄。', '腮红位置略低，靠近颧骨下方。', '唇妆可以饱满一些，平衡尖下巴。'],
      '菱形脸': ['颧骨处修容要柔和，腮红打在颧骨内侧。', '眉形放柔，避免过挑的眉峰。', '眼妆横向晕染，弱化颧骨的存在感。'],
    };

    const occasionMap = {
      '通勤': '低饱和大地色眼影 + 干净底妆 + 豆沙/奶茶色唇，十分钟能出门。',
      '约会': '粉调眼影 + 卧蚕 + 水光唇，腮红打在苹果肌，整体柔和有气色。',
      '日常': '防晒 + 局部遮瑕 + 眉 + 润唇，保持皮肤原本的质感。',
      '聚会': '可以加一点亮片或上扬眼线，唇色选饱和一点的红或莓果色。',
      '拍照': '底妆选哑光，修容比平时略深一档，避免高倍闪片反光。',
      '面试': '自然眉形 + 内眼线 + 低饱和唇色，避免大面积亮片。',
      '运动': '轻薄防汗底妆，不画眼线，重点防晒 + 眉 + 润唇。',
      '度假': '带防晒的轻薄底妆，橘调腮红与唇色，随身带补水喷雾。',
    };

    const styleMap = {
      '简约': '配色统一在裸棕、奶茶色系，重点只有一个：干净的皮肤或一支好看的唇色。',
      '温柔': '粉调、杏调腮红，唇妆选水光质地，眼妆用浅棕打底即可。',
      '甜酷': '眼线可以利落上扬，唇色选低饱和莓果，腮红少量。',
      '复古': '红唇 + 上挑眼线 + 浅棕眼窝，底妆保持哑光。',
      '运动': '尽量薄，防晒与眉是重点，其他从简。',
      '通勤': '大地色眼影 + 内眼线 + 豆沙唇，五分钟完成。',
    };

    const faceTips = faceMap[face] || faceMap['鹅蛋脸'];
    const picked = (products || []).slice(0, 4);
    const sections = [
      { h: '底妆', items: ['底妆保持薄透，粉底只上在面中，边缘用余粉带过。', '遮瑕点在泪沟、鼻翼、痘印，少量多次。', '定妆只压容易出油的 T 区，保留一点皮肤光泽。'] },
      { h: '眉毛', items: [faceTips[1], '用眉粉先铺形状，再用眉笔补毛流，眉头要淡。'] },
      { h: '眼妆', items: [occasionMap[occasion] || occasionMap['日常'], '眼影不超过三个颜色，最深色只放在睫毛根部。'] },
      { h: '腮红', items: [faceTips[2], '腮红少量多次，先在手背抖掉余粉再上脸。'] },
      { h: '修容', items: [faceTips[0], '修容少量多次，边界一定要晕开，不要留下明显色块。'] },
      { h: '唇妆', items: ['唇色跟腮红同一色系，整体会更干净。', '唇部状态不好时先厚涂润唇，再擦掉上色。'] },
      { h: '整体', items: [styleMap[style] || styleMap['简约'], '出门前在自然光下检查一次，边界晕开就好。'] },
    ];
    if (picked.length) {
      sections.splice(6, 0, {
        h: '用到的彩妆',
        items: picked.map((p) => p.name + (p.category ? '（' + p.category + '）' : '') +
          (p.remaining != null ? ' · 余量约 ' + Math.round(toNum(p.remaining)) + '%' : '')),
      });
    }

    return {
      summary: '今天是' + style + '风格、' + occasion + '场合，' + face + '适合「柔和轮廓 + 一个视觉重点」的妆容。',
      sections,
      products: picked.map((p) => p.name),
      meta: { face, occasion, style },
    };
  }

  function productPickerHTML(selected, products) {
    if (!products.length) {
      return '<div class="empty" style="padding:16px"><span>还没有登记彩妆，先到「彩妆收纳」添加产品。</span></div>';
    }
    return '<div class="check-grid">' + products.map((p) =>
      '<label class="check-option"><input type="checkbox" name="products" value="' + p.id + '"' +
      (selected && selected.indexOf(p.id) >= 0 ? ' checked' : '') + '>' +
      esc(p.name) + '<span style="color:var(--faint);font-size:10px;margin-left:auto">' + esc(p.category || '') + '</span></label>'
    ).join('') + '</div>';
  }

  function closetModal(item) {
    const products = Store.state.beauty.products || [];
    const preset = item ? (item.productIds || []) : [];
    UI.modal({
      title: item ? '编辑妆容清单' : '新建妆容清单',
      desc: '把打造这个妆容需要的彩妆挑出来，出门前按单核对。',
      wide: true,
      body: '<div class="form-grid" style="margin-bottom:16px">' +
          '<div class="field"><label>妆容名称</label><input type="text" name="name" required maxlength="60" value="' +
            esc(item ? item.name : '') + '" placeholder="例如：通勤 5 分钟妆"></div>' +
          '<div class="field"><label>适合场合</label><input type="text" name="occasion" maxlength="40" value="' +
            esc(item ? item.occasion : '') + '" placeholder="通勤 / 约会 / 聚会"></div>' +
          '<div class="field span-2"><label>备注</label><input type="text" name="note" maxlength="120" value="' +
            esc(item ? item.note : '') + '" placeholder="例如：重点在唇色"></div>' +
        '</div>' +
        '<div class="field-label" style="margin-bottom:8px">选择需要的彩妆</div>' +
        productPickerHTML(preset, products),
      submitText: item ? '保存修改' : '保存清单',
      onSubmit(data, form) {
        const name = String(data.name || '').trim();
        if (!name) { UI.toast('给这个妆容起个名字', 'warn'); return false; }
        const ids = Array.from(form.querySelectorAll('input[name="products"]:checked')).map((x) => x.value);
        const patch = {
          name, occasion: String(data.occasion || '').trim(),
          note: String(data.note || '').trim(), productIds: ids,
        };
        if (item) {
          Object.assign(item, patch, { updatedAt: Date.now() });
        } else {
          Store.state.beauty.closet.push(Object.assign({ id: util.uid('cl'), createdAt: Date.now() }, patch));
        }
        App.commit('beauty');
        UI.toast(item ? '妆容清单已更新' : '妆容清单已保存');
      },
    });
  }

  function productModal(item) {
    const p = item || {};
    UI.modal({
      title: item ? '编辑彩妆' : '登记一件彩妆',
      fields: [
        { name: 'name', label: '产品名称', type: 'text', required: true, value: p.name || '', placeholder: '例如：XX 粉底液 01 号色' },
        { name: 'category', label: '分类', type: 'select', value: p.category || '底妆', options: MAKEUP_CATEGORIES },
        { name: 'remaining', label: '剩余量 (%)', type: 'number', min: '0', max: '100', step: '1', value: p.remaining == null ? 100 : p.remaining },
        { name: 'note', label: '备注', type: 'text', value: p.note || '', placeholder: '色号、开封日期、适合的妆容……' },
      ],
      submitText: item ? '保存修改' : '添加',
      onSubmit(data) {
        const name = String(data.name || '').trim();
        if (!name) { UI.toast('请填写产品名称', 'warn'); return false; }
        const patch = {
          name, category: data.category || '底妆',
          remaining: util.clamp(toNum(data.remaining, 100), 0, 100),
          note: String(data.note || '').trim(),
        };
        if (item) Object.assign(item, patch, { updatedAt: Date.now() });
        else Store.state.beauty.products.push(Object.assign({ id: util.uid('pr'), createdAt: Date.now() }, patch));
        App.commit('beauty');
        UI.toast(item ? '已更新' : '已登记');
      },
    });
  }

  App.views.beauty = function () {
    const st = Store.state;
    const beauty = st.beauty;
    const tab = App.tab('beauty', 'tutorials');
    const tutorials = beauty.tutorials || [];
    const looks = (beauty.looks || []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const products = beauty.products || [];
    const closet = beauty.closet || [];
    const profile = beauty.profile || (beauty.profile = { face: '鹅蛋脸' });
    let body = '';

    if (tab === 'tutorials') {
      body = '<div class="page-head"><div class="ph-text"><h2>博主教程收藏</h2>' +
          '<p>想学的妆容、想跟的博主，都在这里，随时回看。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="beauty.tutorial.add">' + ICON('plus') + '收藏教程</button></div></div>' +
        '<section class="card">' +
        (tutorials.length ? tutorials.slice().sort((a, b) => (a.done === b.done ? b.createdAt - a.createdAt : (a.done ? 1 : -1))).map((t) => {
          const url = App.safeUrl(t.url);
          return '<div style="padding:12px 0;border-bottom:1px solid rgba(51,25,21,.06)">' +
            App.checkRow({
              id: t.id, checked: t.done, label: t.title, change: 'beauty.tutorial.toggle', delAct: 'beauty.tutorial.del',
              sub: (t.blogger ? '博主：' + t.blogger + ' · ' : '') + (t.type || '妆容') + (t.done ? ' · 已学习' : ''),
            }) +
            (url ? '<div class="link-row" style="margin-left:34px">' + ICON('external') +
              '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a></div>' : '') +
          '</div>';
        }).join('')
          : UI.empty('🎬', '还没有收藏教程', '把想学的化妆博主和视频链接存进来，想练的时候直接打开。')) +
        '</section>';

    } else if (tab === 'looks') {
      const last = looks[0];
      body = '<div class="page-head"><div class="ph-text"><h2>妆容搭配参考</h2>' +
          '<p>告诉我今天的风格、场合和脸型，给你一套能落地的妆容思路。</p></div></div>' +
        '<section class="card">' +
          '<form data-form="beauty.look.generate">' +
            '<div class="form-grid">' +
              '<div class="field"><label>穿搭风格</label><input type="text" name="style" maxlength="40" placeholder="例如：温柔 / 甜酷 / 通勤" value="' +
                esc((last && last.form.style) || '简约') + '"></div>' +
              '<div class="field"><label>出行场合</label><select name="occasion">' +
                ['日常', '通勤', '约会', '聚会', '拍照', '面试', '运动', '度假'].map((o) =>
                  '<option' + (last && last.form.occasion === o ? ' selected' : '') + '>' + o + '</option>').join('') +
              '</select></div>' +
              '<div class="field"><label>脸型</label><select name="face" data-change="beauty.face">' +
                FACE_SHAPES.map((f) => '<option' + (profile.face === f ? ' selected' : '') + '>' + f + '</option>').join('') +
              '</select></div>' +
              '<div class="field" style="justify-content:flex-end"><button type="submit" class="btn makeup-submit">' +
                ICON('spark') + '生成妆容建议</button></div>' +
            '</div>' +
          '</form>' +
        '</section>' +
        (last ? '<section class="card">' +
          '<div class="card-head"><div class="ico-box">✨</div><div class="card-head-text">' +
            '<h2>最近一次妆容建议</h2><p>' + fmtDayFull(dateStr(new Date(last.createdAt))) + ' · ' +
            esc(last.form.face) + ' · ' + esc(last.form.occasion) + '</p></div>' +
            '<div class="head-actions"><button type="button" class="link" data-act="beauty.look.view" data-id="' +
              last.id + '">查看完整</button></div></div>' +
          '<p style="font-size:14px;color:var(--brown);line-height:1.8">' + esc(last.advice.summary) + '</p>' +
          '<div style="margin-top:12px">' + last.advice.sections.slice(0, 2).map((s) =>
            '<div class="advice-block"><h4>' + esc(s.h) + '</h4><ul class="advice-list">' +
            s.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join('') + '</div>' +
          '</section>' : '') +
        '<section class="card">' +
          '<div class="card-head"><div class="ico-box">🗂</div><div class="card-head-text">' +
            '<h2>历史妆容建议 <span class="count-chip">' + looks.length + '</span></h2>' +
            '<p>每次生成都会自动保存。</p></div></div>' +
          (looks.length ? looks.map((l) =>
            '<div class="entry-row"><span class="e-date">' + fmtDay(dateStr(new Date(l.createdAt))) + '</span>' +
            '<span class="e-note">' + esc(l.form.style) + ' · ' + esc(l.form.occasion) + ' · ' + esc(l.form.face) + '</span>' +
            '<button type="button" class="link" data-act="beauty.look.view" data-id="' + l.id + '">查看</button>' +
            '<button type="button" class="link link--danger" data-act="beauty.look.del" data-id="' + l.id + '">删除</button></div>').join('')
            : UI.empty('💄', '还没有妆容建议', '填写上面的信息，生成第一套方案。')) +
        '</section>';

    } else if (tab === 'products') {
      const byCat = {};
      products.forEach((p) => {
        const c = p.category || '其他';
        (byCat[c] = byCat[c] || []).push(p);
      });
      body = '<div class="page-head"><div class="ph-text"><h2>彩妆收纳记录</h2>' +
          '<p>登记拥有的彩妆和余量，避免重复购买，也方便整理妆容清单。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="beauty.product.add">' + ICON('plus') + '登记彩妆</button></div></div>' +
        (products.length ? '<div class="grid">' + MAKEUP_CATEGORIES.filter((c) => byCat[c]).map((cat) =>
          '<section class="card"><div class="card-head"><div class="ico-box">🧴</div><div class="card-head-text">' +
            '<h2>' + cat + ' <span class="count-chip">' + byCat[cat].length + '</span></h2></div></div>' +
            byCat[cat].map((p) =>
              '<div class="product-row">' +
                '<div class="product-main"><strong>' + esc(p.name) + '</strong>' +
                  (p.note ? '<span> · ' + esc(p.note) + '</span>' : '') + '</div>' +
                '<div class="product-remain"><div class="bar bar--thin" style="width:64px"><i style="width:' +
                  util.clamp(toNum(p.remaining), 0, 100) + '%"></i></div>' +
                  '<span class="stock-num">' + Math.round(toNum(p.remaining)) + '%</span></div>' +
                '<div class="actions" style="display:flex;gap:2px">' +
                  '<button type="button" class="row-act" data-act="beauty.product.edit" data-id="' + p.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
                  '<button type="button" class="row-del" data-act="beauty.product.del" data-id="' + p.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
                '</div>' +
              '</div>').join('') +
          '</section>').join('') + '</div>'
          : '<section class="card">' + UI.empty('💄', '彩妆盒还是空的', '把拥有的底妆、眼影、唇膏登记进来。') +
            '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="beauty.product.add">' +
            ICON('plus') + '登记第一件彩妆</button></div></section>');

    } else {
      body = '<div class="page-head"><div class="ph-text"><h2>妆容清单</h2>' +
          '<p>不同妆容分别需要哪些彩妆，整理成清单，出门前照着拿。</p></div>' +
          '<div class="ph-actions"><button type="button" class="btn" data-act="beauty.closet.add">' + ICON('plus') + '新建清单</button></div></div>' +
        (closet.length ? closet.map((c) => {
          const names = (c.productIds || []).map((id) => (products.find((p) => p.id === id) || {}).name).filter(Boolean);
          return '<div class="closet-card">' +
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
              '<h4>' + esc(c.name) + '</h4>' +
              (c.occasion ? '<span class="badge">' + esc(c.occasion) + '</span>' : '') +
              '<span style="flex:1"></span>' +
              '<button type="button" class="link" data-act="beauty.closet.edit" data-id="' + c.id + '">编辑</button>' +
              '<button type="button" class="link link--danger" data-act="beauty.closet.del" data-id="' + c.id + '">删除</button>' +
            '</div>' +
            (c.note ? '<p style="font-size:12px;color:var(--faint);margin-top:5px">' + esc(c.note) + '</p>' : '') +
            '<div class="closet-products">' + (names.length ? names.map((n) => '<span class="badge">' + esc(n) + '</span>').join('')
              : '<span class="badge">还没有选择产品</span>') + '</div>' +
          '</div>';
        }).join('') : '<section class="card">' + UI.empty('🧺', '还没有妆容清单', '把「通勤妆」「约会妆」需要的产品分组存起来。') + '</section>');
    }

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>好好化妆，也好好护肤</h2>' +
        '<p>收藏教程、生成妆容、收纳彩妆，把变美这件事变简单。</p></div>' +
        '<div class="ph-actions"><span class="badge badge--olive">' +
        (products.length ? Math.round(products.reduce((n, p) => n + toNum(p.remaining), 0) / products.length) : 0) +
        '% 平均余量</span></div></div>' +
      tabBar('beauty', tab, [
        { id: 'tutorials', label: '博主教程', count: tutorials.length },
        { id: 'looks', label: '妆容参考', count: looks.length },
        { id: 'products', label: '彩妆收纳', count: products.length },
        { id: 'closet', label: '妆容清单', count: closet.length },
      ]) +
      body +
    '</div>';
  };

  App.actions['beauty.tutorial.add'] = function () {
    UI.modal({
      title: '收藏化妆教程',
      fields: [
        { name: 'blogger', label: '博主 / 作者', type: 'text', required: true, placeholder: '例如：@某某' },
        { name: 'title', label: '教程标题', type: 'text', required: true, placeholder: '例如：圆脸显脸小妆容' },
        { name: 'url', label: '视频链接', type: 'url', placeholder: 'https://' },
        { name: 'type', label: '妆容类型', type: 'text', placeholder: '通勤 / 约会 / 复古……' },
      ],
      submitText: '收藏',
      onSubmit(data) {
        if (!String(data.title || '').trim()) { UI.toast('请填写标题', 'warn'); return false; }
        const url = String(data.url || '').trim();
        if (url && !/^https?:\/\//i.test(url)) { UI.toast('链接需要以 http(s):// 开头', 'warn'); return false; }
        Store.state.beauty.tutorials.push({
          id: util.uid('bt'), blogger: String(data.blogger || '').trim(), title: String(data.title).trim(),
          url, type: String(data.type || '妆容').trim(),
          done: false, createdAt: Date.now(), doneAt: null,
        });
        App.commit('beauty');
        UI.toast('教程已收藏');
      },
    });
  };

  App.actions['beauty.tutorial.toggle'] = function (el) {
    const t = Store.state.beauty.tutorials.find((x) => x.id === el.dataset.id);
    if (!t) return;
    t.done = el.checked;
    t.doneAt = el.checked ? Date.now() : null;
    App.commit('beauty');
  };

  App.actions['beauty.tutorial.del'] = async function (el) {
    const ok = await UI.confirm({ title: '删除这条教程？', message: '收藏的链接会被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.beauty.tutorials, el.dataset.id);
    App.commit('beauty');
  };

  App.actions['beauty.face'] = function (el) {
    Store.state.beauty.profile = Store.state.beauty.profile || {};
    Store.state.beauty.profile.face = el.value;
    Store.save();
  };

  App.forms['beauty.look.generate'] = function (data) {
    const form = {
      style: String(data.style || '简约').trim() || '简约',
      occasion: data.occasion || '日常',
      face: data.face || '鹅蛋脸',
    };
    const advice = makeupAdvice(form, Store.state.beauty.products || []);
    Store.state.beauty.looks.push({
      id: util.uid('bl'), createdAt: Date.now(), form, advice,
    });
    Store.touch('beauty');
    Store.save();
    App.render();
    UI.toast('妆容建议已生成并保存');
  };

  App.actions['beauty.look.view'] = function (el) {
    const l = Store.state.beauty.looks.find((x) => x.id === el.dataset.id);
    if (!l) return;
    UI.modal({
      title: '妆容建议 · ' + l.form.face,
      desc: l.form.style + ' · ' + l.form.occasion,
      form: false,
      wide: true,
      body: '<p style="font-size:14px;color:var(--brown);line-height:1.8;margin-bottom:6px">' + esc(l.advice.summary) + '</p>' +
        l.advice.sections.map((s) => '<div class="advice-block"><h4>' + esc(s.h) + '</h4><ul class="advice-list">' +
          s.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join(''),
      footer: '<button type="button" class="btn" data-modal-close>关闭</button>',
    });
  };

  App.actions['beauty.look.del'] = async function (el) {
    const ok = await UI.confirm({ title: '删除这条妆容建议？', message: '删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.beauty.looks, el.dataset.id);
    App.commit('beauty');
  };

  App.actions['beauty.product.add'] = function () { productModal(null); };
  App.actions['beauty.product.edit'] = function (el) {
    const p = Store.state.beauty.products.find((x) => x.id === el.dataset.id);
    if (p) productModal(p);
  };
  App.actions['beauty.product.del'] = async function (el) {
    const p = Store.state.beauty.products.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const ok = await UI.confirm({ title: '删除这件彩妆？', message: '「' + p.name + '」会从收纳与妆容清单中移除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.beauty.products, p.id);
    Store.state.beauty.closet.forEach((c) => {
      c.productIds = (c.productIds || []).filter((id) => id !== p.id);
    });
    App.commit('beauty');
  };

  App.actions['beauty.closet.add'] = function () { closetModal(null); };
  App.actions['beauty.closet.edit'] = function (el) {
    const c = Store.state.beauty.closet.find((x) => x.id === el.dataset.id);
    if (c) closetModal(c);
  };
  App.actions['beauty.closet.del'] = async function (el) {
    const ok = await UI.confirm({ title: '删除这份妆容清单？', message: '清单删除后，彩妆产品不会被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.beauty.closet, el.dataset.id);
    App.commit('beauty');
  };

  /* =======================================================
     存钱目标
     ======================================================= */
  function goalStats(g) {
    const entries = g.entries || [];
    const income = entries.filter((e) => e.type !== 'out').reduce((n, e) => n + toNum(e.amount), 0);
    const expense = entries.filter((e) => e.type === 'out').reduce((n, e) => n + toNum(e.amount), 0);
    const current = income - expense;
    const target = toNum(g.target);
    const remain = Math.max(0, target - current);
    const pct = target > 0 ? util.clamp((current / target) * 100, 0, 100) : 0;
    const daysLeft = g.deadline ? dayDiff(dateStr(), g.deadline) : null;
    const monthsLeft = daysLeft != null && daysLeft > 0 ? Math.max(1, daysLeft / 30) : null;
    const monthly = monthsLeft && remain > 0 ? remain / monthsLeft : null;
    return { entries, income, expense, current, target, remain, pct, daysLeft, monthly };
  }

  function moneySpark(g) {
    const entries = (g.entries || []).slice().sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : (a.date < b.date ? -1 : 1)));
    if (entries.length < 2) return '';
    let acc = 0;
    const pts = entries.map((e) => {
      acc += (e.type === 'out' ? -1 : 1) * toNum(e.amount);
      return acc;
    });
    const w = 600, h = 56, pad = 6;
    let min = Math.min(0, Math.min.apply(null, pts));
    let max = Math.max.apply(null, pts);
    if (min === max) max = min + 1;
    const coords = pts.map((v, i) => [
      pad + (i / (pts.length - 1)) * (w - pad * 2),
      h - pad - ((v - min) / (max - min)) * (h - pad * 2),
    ]);
    const d = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="area" d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + ' Z"/>' +
      '<path class="line" d="' + d + '"/></svg>';
  }

  function goalModal(goal) {
    const g = goal || {};
    UI.modal({
      title: goal ? '编辑存钱目标' : '新建存钱目标',
      desc: '先定一个想去的地方，再一点点靠近。',
      fields: [
        { name: 'title', label: '目标名称', type: 'text', required: true, value: g.title || '', placeholder: '例如：日本旅行基金 / 换电脑 / 应急金' },
        { name: 'target', label: '目标金额 (元)', type: 'number', required: true, min: '1', step: '1', value: g.target || '', placeholder: '10000' },
        { name: 'deadline', label: '计划完成时间', type: 'date', value: g.deadline || '' },
        { name: 'note', label: '备注', type: 'text', value: g.note || '', span: 2, placeholder: '为什么想存这笔钱？' },
      ],
      submitText: goal ? '保存修改' : '创建目标',
      onSubmit(data) {
        const title = String(data.title || '').trim();
        if (!title || toNum(data.target) <= 0) { UI.toast('请填写名称和目标金额', 'warn'); return false; }
        const patch = {
          title, target: toNum(data.target), deadline: data.deadline || '',
          note: String(data.note || '').trim(),
        };
        if (goal) Object.assign(goal, patch, { updatedAt: Date.now() });
        else Store.state.money.goals.push(Object.assign({ id: util.uid('mg'), entries: [], createdAt: Date.now() }, patch));
        App.commit('money');
        UI.toast(goal ? '目标已更新' : '存钱目标已创建');
      },
    });
  }

  function entryModal(goal, type) {
    UI.modal({
      title: (type === 'out' ? '记录一笔支出' : '存入一笔钱') + ' · ' + goal.title,
      fields: [
        { name: 'amount', label: '金额 (元)', type: 'number', required: true, min: '0.01', step: '0.01', value: '' },
        { name: 'date', label: '日期', type: 'date', value: dateStr() },
        { name: 'note', label: '备注', type: 'text', span: 2, placeholder: type === 'out' ? '这笔钱花在了哪里？' : '这次是怎么省下来的？' },
      ],
      submitText: type === 'out' ? '记一笔支出' : '确认存入',
      onSubmit(data) {
        const amount = toNum(data.amount);
        if (amount <= 0) { UI.toast('金额要大于 0', 'warn'); return false; }
        goal.entries = goal.entries || [];
        goal.entries.push({
          id: util.uid('me'), type: type === 'out' ? 'out' : 'in',
          amount, date: data.date || dateStr(), note: String(data.note || '').trim(),
          createdAt: Date.now(),
        });
        goal.updatedAt = Date.now();
        App.commit('money');
        UI.toast(type === 'out' ? '支出已记录' : '已存入 ' + util.money(amount));
      },
    });
  }

  function entriesModal(goal) {
    const s = goalStats(goal);
    const list = (goal.entries || []).slice().sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));
    UI.modal({
      title: goal.title + ' · 收支明细',
      desc: '存入 ' + util.money(s.income) + ' · 支出 ' + util.money(s.expense) + ' · 当前 ' + util.money(s.current),
      form: false,
      wide: true,
      body: list.length ? '<div class="table-wrap"><table class="data-table table--stack"><thead><tr>' +
        '<th>日期</th><th>类型</th><th>金额</th><th>备注</th><th></th></tr></thead><tbody>' +
        list.map((e) => '<tr><td data-label="日期">' + fmtDay(e.date) + '</td>' +
          '<td data-label="类型">' + (e.type === 'out' ? '支出' : '存入') + '</td>' +
          '<td class="num" data-label="金额" style="color:' + (e.type === 'out' ? 'var(--danger)' : 'var(--olive-3)') + '">' +
          (e.type === 'out' ? '-' : '+') + util.money(e.amount) + '</td>' +
          '<td data-label="备注">' + esc(e.note || '—') + '</td>' +
          '<td><button type="button" class="row-del" data-act="money.entry.del" data-goal="' + goal.id +
          '" data-id="' + e.id + '" aria-label="删除" style="opacity:1">' + ICON('trash') + '</button></td></tr>').join('') +
        '</tbody></table></div>' : UI.empty('💰', '还没有收支记录'),
      footer: '<button type="button" class="btn" data-modal-close>关闭</button>',
    });
  }

  App.views.money = function () {
    const goals = Store.state.money.goals || [];
    const totals = goals.reduce((acc, g) => {
      const s = goalStats(g);
      acc.target += s.target;
      acc.current += Math.max(0, s.current);
      return acc;
    }, { target: 0, current: 0 });

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>一点点存下想要的生活</h2>' +
        '<p>设定目标、记录每次存入，进度会自动计算。</p></div>' +
        '<div class="ph-actions"><button type="button" class="btn" data-act="money.goal.add">' + ICON('plus') + '新建存钱目标</button></div></div>' +

      (goals.length ? '<div class="card card--cream">' +
        '<div class="big-progress"><div class="big-num">' + util.money(totals.current) + '<small> / ' + util.money(totals.target) + '</small></div>' +
        '<span style="flex:1"></span><span class="badge badge--olive">总进度 ' +
        (totals.target > 0 ? Math.round((totals.current / totals.target) * 100) : 0) + '%</span></div>' +
        '<div class="bar" style="margin-top:14px"><i style="width:' +
        (totals.target > 0 ? util.clamp((totals.current / totals.target) * 100, 0, 100) : 0) + '%"></i></div>' +
      '</div>' : '') +

      (goals.length ? goals.map((g) => {
        const s = goalStats(g);
        const entries = (g.entries || []).slice().sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));
        const deadlineBadge = g.deadline
          ? (s.daysLeft < 0 ? '<span class="badge badge--danger">已超过计划时间</span>'
            : '<span class="badge ' + (s.daysLeft <= 30 ? 'badge--warn' : '') + '">还有 ' + s.daysLeft + ' 天</span>')
          : '<span class="badge">未设置期限</span>';
        return '<section class="card goal-card">' +
          '<div class="goal-top"><div class="goal-name"><h3>' + esc(g.title) + '</h3>' +
            '<p>' + (g.deadline ? '计划完成 ' + fmtDayFull(g.deadline) : '没有期限，按自己的节奏') +
            (g.note ? ' · ' + esc(g.note) : '') + '</p></div>' +
            '<div class="actions" style="display:flex;gap:2px">' +
              '<button type="button" class="row-act" data-act="money.goal.edit" data-id="' + g.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
              '<button type="button" class="row-del" data-act="money.goal.del" data-id="' + g.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
            '</div></div>' +
          '<div class="goal-amounts">' +
            '<div class="ga ga--accent"><div class="k">当前存款</div><div class="v">' + util.money(s.current) + '</div></div>' +
            '<div class="ga"><div class="k">目标金额</div><div class="v">' + util.money(s.target) + '</div></div>' +
            '<div class="ga"><div class="k">还差</div><div class="v">' + util.money(s.remain) + '</div></div>' +
            '<div class="ga"><div class="k">每月建议存</div><div class="v">' + (s.monthly ? util.money(Math.ceil(s.monthly)) : '—') + '</div></div>' +
          '</div>' +
          '<div class="progress-row"><div class="bar"><i style="width:' + s.pct.toFixed(1) + '%"></i></div>' +
            '<span class="pct">' + s.pct.toFixed(0) + '%</span>' +
            (s.current >= s.target && s.target > 0 ? '<span class="badge badge--done">已达成</span>' : '') +
            deadlineBadge + '</div>' +
          moneySpark(g) +
          '<div style="display:flex;gap:8px;margin:14px 0 10px;flex-wrap:wrap">' +
            '<button type="button" class="btn btn--sm" data-act="money.entry.in" data-id="' + g.id + '">' + ICON('plus') + '存入</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-act="money.entry.out" data-id="' + g.id + '">记一笔支出</button>' +
            '<span style="flex:1"></span>' +
            '<button type="button" class="link" data-act="money.entries" data-id="' + g.id + '">全部收支明细 (' + (g.entries || []).length + ')</button>' +
          '</div>' +
          (entries.length ? '<div>' + entries.slice(0, 5).map((e) =>
            '<div class="entry-row"><span class="e-type' + (e.type === 'out' ? ' out' : '') + '">' +
              (e.type === 'out' ? '支出' : '存入') + '</span>' +
            '<span class="e-date">' + fmtDay(e.date) + '</span>' +
            '<span class="e-note">' + esc(e.note || '—') + '</span>' +
            '<span class="e-amt' + (e.type === 'out' ? ' out' : '') + '">' +
              (e.type === 'out' ? '-' : '+') + util.money(e.amount) + '</span>' +
            '<button type="button" class="row-del" data-act="money.entry.del" data-goal="' + g.id +
              '" data-id="' + e.id + '" aria-label="删除" style="opacity:1">' + ICON('trash') + '</button></div>').join('') + '</div>'
            : '<p style="font-size:11.5px;color:var(--faint)">还没有存入记录，先存第一笔吧。</p>') +
        '</section>';
      }).join('')
        : '<section class="card">' + UI.empty('💰', '还没有存钱目标', '想买的东西、想去的地方，都可以变成一个具体的目标。') +
          '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="money.goal.add">' +
          ICON('plus') + '创建第一个目标</button></div></section>') +
    '</div>';
  };

  App.actions['money.goal.add'] = function () { goalModal(null); };
  App.actions['money.goal.edit'] = function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.id);
    if (g) goalModal(g);
  };
  App.actions['money.goal.del'] = async function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.id);
    if (!g) return;
    const ok = await UI.confirm({ title: '删除这个存钱目标？', message: '「' + g.title + '」及其全部收支记录会被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.money.goals, g.id);
    App.commit('money');
    UI.toast('已删除');
  };
  App.actions['money.entry.in'] = function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.id);
    if (g) entryModal(g, 'in');
  };
  App.actions['money.entry.out'] = function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.id);
    if (g) entryModal(g, 'out');
  };
  App.actions['money.entries'] = function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.id);
    if (g) entriesModal(g);
  };
  App.actions['money.entry.del'] = async function (el) {
    const g = Store.state.money.goals.find((x) => x.id === el.dataset.goal);
    if (!g) return;
    const ok = await UI.confirm({ title: '删除这条收支记录？', message: '删除后金额会重新计算。', okText: '删除' });
    if (!ok) return;
    App.deleteById(g.entries, el.dataset.id);
    App.commit('money');
    UI.toast('已删除');
  };

  /* =======================================================
     纪念日
     ======================================================= */
  function nextOccurrence(str, repeat) {
    const d = util.parseDay(str);
    if (!d) return null;
    if (repeat !== 'yearly') return dateStr(d);
    const today = util.parseDay(dateStr());
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    return dateStr(next);
  }

  function anniModal(item) {
    const a = item || {};
    UI.modal({
      title: item ? '编辑纪念日' : '添加纪念日',
      desc: '生日、在一起的日子、重要节点，都可以记在这里。',
      fields: [
        { name: 'title', label: '名称', type: 'text', required: true, value: a.title || '', placeholder: '例如：妈妈生日 / 在一起纪念日' },
        { name: 'date', label: '日期', type: 'date', required: true, value: a.date || dateStr() },
        { name: 'repeat', label: '重复方式', type: 'select', value: a.repeat || 'yearly', options: [{ value: 'yearly', label: '每年重复' }, { value: 'once', label: '仅一次' }] },
        { name: 'relation', label: '关系 / 分类', type: 'text', value: a.relation || '', placeholder: '家人 / 朋友 / 伴侣 / 自己' },
        { name: 'note', label: '备注', type: 'text', span: 2, value: a.note || '', placeholder: '想说的话、礼物计划……' },
      ],
      submitText: item ? '保存修改' : '添加纪念日',
      onSubmit(data) {
        const title = String(data.title || '').trim();
        if (!title || !data.date) { UI.toast('请填写名称与日期', 'warn'); return false; }
        const patch = {
          title, date: data.date, repeat: data.repeat === 'once' ? 'once' : 'yearly',
          relation: String(data.relation || '').trim(), note: String(data.note || '').trim(),
        };
        if (item) Object.assign(item, patch, { updatedAt: Date.now() });
        else Store.state.anniversaries.push(Object.assign({ id: util.uid('an'), createdAt: Date.now() }, patch));
        App.commit('anniversaries');
        UI.toast(item ? '已更新' : '纪念日已保存');
      },
    });
  }

  App.views.anniversaries = function () {
    const list = (Store.state.anniversaries || []).map((a) => {
      const next = nextOccurrence(a.date, a.repeat);
      return { a, next, days: next ? dayDiff(dateStr(), next) : 0 };
    }).sort((x, y) => x.days - y.days);

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>重要的日子，提前记得</h2>' +
        '<p>生日与纪念日每年自动倒数，永久保存在本机。</p></div>' +
        '<div class="ph-actions"><button type="button" class="btn" data-act="anni.add">' + ICON('plus') + '添加纪念日</button></div></div>' +

      (list.length ? '<section class="card">' +
        (list.some((x) => x.days <= 7) ? '<p style="font-size:12px;color:var(--olive-3);margin-bottom:8px">' +
          '⏳ 最近 7 天有 ' + list.filter((x) => x.days <= 7).length + ' 个重要日子，别忘了准备。' : '') +
        list.map(({ a, next, days }) => {
          const isOncePast = a.repeat === 'once' && days < 0;
          const shownDate = a.repeat === 'yearly' && next ? next : a.date;
          const d = util.parseDay(shownDate);
          return '<div class="anni-card">' +
            '<div class="anni-date"><b>' + (d ? d.getDate() : '—') + '</b><span>' + (d ? (d.getMonth() + 1) + '月' : '') + '</span></div>' +
            '<div class="anni-main"><strong>' + esc(a.title) + '</strong>' +
              '<p>' + (a.relation ? esc(a.relation) + ' · ' : '') +
              fmtDayFull(shownDate).replace(/^\d{4}年/, '') + (a.repeat === 'yearly' ? ' · 每年' : ' · 仅一次') + '</p>' +
              (a.note ? '<p>' + esc(a.note) + '</p>' : '') + '</div>' +
            '<div class="anni-days"><b class="' + (days === 0 ? 'today' : '') + '">' +
              (isOncePast ? '已过' : days === 0 ? '今天' : days) + '</b>' +
              '<span>' + (isOncePast ? Math.abs(days) + ' 天前' : days === 0 ? '别忘了' : '天后') + '</span></div>' +
            '<div class="actions" style="display:flex;gap:2px">' +
              '<button type="button" class="row-act" data-act="anni.edit" data-id="' + a.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
              '<button type="button" class="row-del" data-act="anni.del" data-id="' + a.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
            '</div></div>';
        }).join('') + '</section>'
        : '<section class="card">' + UI.empty('🎀', '还没有纪念日', '把家人朋友的生日、重要的日子记下来。') +
          '<div style="text-align:center;padding-bottom:12px"><button type="button" class="btn" data-act="anni.add">' +
          ICON('plus') + '添加第一个纪念日</button></div></section>') +
    '</div>';
  };

  App.actions['anni.add'] = function () { anniModal(null); };
  App.actions['anni.edit'] = function (el) {
    const a = Store.state.anniversaries.find((x) => x.id === el.dataset.id);
    if (a) anniModal(a);
  };
  App.actions['anni.del'] = async function (el) {
    const a = Store.state.anniversaries.find((x) => x.id === el.dataset.id);
    if (!a) return;
    const ok = await UI.confirm({ title: '删除这个纪念日？', message: '「' + a.title + '」删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.anniversaries, a.id);
    App.commit('anniversaries');
  };

  /* =======================================================
     人情台账
     ======================================================= */
  function favorModal(item) {
    const f = item || {};
    UI.modal({
      title: item ? '编辑人情记录' : '新增人情记录',
      desc: '记录送出与回赠，方便以后随礼、应酬参考。',
      wide: true,
      fields: [
        { name: 'name', label: '对方姓名', type: 'text', required: true, value: f.name || '', placeholder: '例如：小王' },
        { name: 'date', label: '发生日期', type: 'date', value: f.date || dateStr() },
        { name: 'gave', label: '我方送出（礼物 / 礼金）', type: 'text', value: f.gave || '', placeholder: '例如：结婚礼金 / 一盒茶叶' },
        { name: 'gaveValue', label: '送出金额 (元)', type: 'number', min: '0', step: '0.01', value: f.gaveValue || '', placeholder: '600' },
        { name: 'got', label: '对方回赠（礼品 / 礼金）', type: 'text', value: f.got || '', placeholder: '例如：回礼 / 请吃饭' },
        { name: 'gotValue', label: '回赠金额 (元)', type: 'number', min: '0', step: '0.01', value: f.gotValue || '', placeholder: '200' },
        { name: 'note', label: '备注事项', type: 'textarea', rows: 2, span: 2, value: f.note || '', placeholder: '场合、关系、以后怎么还人情……' },
      ],
      submitText: item ? '保存修改' : '保存记录',
      onSubmit(data) {
        const name = String(data.name || '').trim();
        if (!name) { UI.toast('请填写对方姓名', 'warn'); return false; }
        const patch = {
          name, date: data.date || dateStr(),
          gave: String(data.gave || '').trim(), gaveValue: toNum(data.gaveValue),
          got: String(data.got || '').trim(), gotValue: toNum(data.gotValue),
          note: String(data.note || '').trim(),
        };
        if (item) Object.assign(item, patch, { updatedAt: Date.now() });
        else Store.state.favors.push(Object.assign({ id: util.uid('fv'), createdAt: Date.now() }, patch));
        App.commit('favors');
        UI.toast(item ? '已更新' : '人情记录已保存');
      },
    });
  }

  App.views.favors = function () {
    const list = (Store.state.favors || []).slice().sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));
    const gave = list.reduce((n, f) => n + toNum(f.gaveValue), 0);
    const got = list.reduce((n, f) => n + toNum(f.gotValue), 0);
    const query = (App.ui.favorQuery || '').trim();
    const filtered = query ? list.filter((f) => (f.name + f.gave + f.got + f.note).indexOf(query) >= 0) : list;

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>人情往来，心里有数</h2>' +
        '<p>送出与回赠都记下来，以后随礼、应酬有据可查。</p></div>' +
        '<div class="ph-actions"><button type="button" class="btn" data-act="favor.add">' + ICON('plus') + '新增记录</button></div></div>' +

      '<section class="card card--cream">' +
        '<div class="sum-row">' +
          '<div class="sum"><div class="k">我方送出合计</div><div class="v give">' + util.money(gave) + '</div></div>' +
          '<div class="sum"><div class="k">对方回赠合计</div><div class="v got">' + util.money(got) + '</div></div>' +
          '<div class="sum"><div class="k">收支差</div><div class="v">' + util.money(gave - got) + '</div></div>' +
          '<div class="sum"><div class="k">记录数</div><div class="v">' + list.length + '</div></div>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="form-row" style="margin-bottom:12px">' +
          '<div class="field" style="flex:1"><input type="search" id="favorSearch" placeholder="搜索姓名、礼物或备注…" value="' +
            esc(query) + '"></div>' +
        '</div>' +
        (filtered.length ? '<div class="table-wrap"><table class="data-table table--stack" id="favorTable"><thead><tr>' +
          '<th>对方姓名</th><th>发生日期</th><th>我方送出</th><th>对方回赠</th><th>备注</th><th></th></tr></thead><tbody>' +
          filtered.map((f) =>
            '<tr data-search="' + esc((f.name + f.gave + f.got + f.note).toLowerCase()) + '">' +
            '<td data-label="对方"><span class="cell-main">' + esc(f.name) + '</span></td>' +
            '<td class="num" data-label="日期">' + fmtDay(f.date) + '</td>' +
            '<td data-label="送出"><span class="cell-main">' + (f.gaveValue ? util.money(f.gaveValue) : '—') + '</span>' +
              (f.gave ? '<span class="cell-sub">' + esc(f.gave) + '</span>' : '') + '</td>' +
            '<td data-label="回赠"><span class="cell-main">' + (f.gotValue ? util.money(f.gotValue) : '—') + '</span>' +
              (f.got ? '<span class="cell-sub">' + esc(f.got) + '</span>' : '') + '</td>' +
            '<td data-label="备注">' + esc(f.note || '—') + '</td>' +
            '<td><div class="actions">' +
              '<button type="button" class="row-act" data-act="favor.edit" data-id="' + f.id + '" aria-label="编辑">' + ICON('edit') + '</button>' +
              '<button type="button" class="row-del" data-act="favor.del" data-id="' + f.id + '" aria-label="删除">' + ICON('trash') + '</button>' +
            '</div></td></tr>').join('') + '</tbody></table></div>'
          : UI.empty('🤝', query ? '没有匹配的记录' : '还没有人情记录', query ? '换个关键词试试。' : '记录第一笔送礼或回礼。')) +
      '</section>' +
    '</div>';
  };

  App.actions['favor.add'] = function () { favorModal(null); };
  App.actions['favor.edit'] = function (el) {
    const f = Store.state.favors.find((x) => x.id === el.dataset.id);
    if (f) favorModal(f);
  };
  App.actions['favor.del'] = async function (el) {
    const f = Store.state.favors.find((x) => x.id === el.dataset.id);
    if (!f) return;
    const ok = await UI.confirm({ title: '删除这条人情记录？', message: '「' + f.name + '」的记录将被删除。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.favors, f.id);
    App.commit('favors');
    UI.toast('已删除');
  };

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'favorSearch') {
      const q = e.target.value.trim().toLowerCase();
      App.ui.favorQuery = e.target.value;
      const rows = document.querySelectorAll('#favorTable tbody tr[data-search]');
      rows.forEach((tr) => {
        tr.style.display = !q || tr.dataset.search.indexOf(q) >= 0 ? '' : 'none';
      });
    }
  });

  /* =======================================================
     愿望清单
     ======================================================= */
  const WISH_CATS = ['旅行', '梦想', '体验', '目标', '其他'];

  function wishModal(item) {
    const w = item || {};
    UI.modal({
      title: item ? '编辑愿望' : '添加一个愿望',
      desc: '写具体一点，实现的那天会更清晰。',
      fields: [
        { name: 'title', label: '愿望 / 目的地', type: 'text', required: true, value: w.title || '', placeholder: '例如：去冰岛看一次极光' },
        { name: 'category', label: '分类', type: 'select', value: w.category || '旅行', options: WISH_CATS },
        { name: 'date', label: '计划时间（可选）', type: 'date', value: w.date || '' },
        { name: 'note', label: '备注', type: 'textarea', rows: 3, span: 2, value: w.note || '', placeholder: '为什么想去？打算和谁一起？实现后想做什么？' },
      ],
      submitText: item ? '保存修改' : '添加愿望',
      onSubmit(data) {
        const title = String(data.title || '').trim();
        if (!title) { UI.toast('请写下你的愿望', 'warn'); return false; }
        const patch = {
          title, category: data.category || '旅行', date: data.date || '',
          note: String(data.note || '').trim(),
        };
        if (item) Object.assign(item, patch, { updatedAt: Date.now() });
        else Store.state.wishes.push(Object.assign({
          id: util.uid('wi'), done: false, createdAt: Date.now(), doneAt: null,
        }, patch));
        App.commit('wishes');
        UI.toast(item ? '已更新' : '愿望已收进清单');
      },
    });
  }

  App.views.wishes = function () {
    const all = Store.state.wishes || [];
    const filter = App.ui.wishFilter || 'all';
    const doneCount = all.filter((w) => w.done).length;
    const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
    const list = all.filter((w) => filter === 'all' || (filter === 'done' ? w.done : !w.done))
      .sort((a, b) => (a.done === b.done ? b.createdAt - a.createdAt : (a.done ? 1 : -1)));

    return '<div class="stack">' +
      '<div class="page-head"><div class="ph-text"><h2>想做的事，一件件实现</h2>' +
        '<p>梦想、旅行、想体验的人生，都值得被认真记下来。</p></div>' +
        '<div class="ph-actions"><button type="button" class="btn" data-act="wish.add">' + ICON('plus') + '添加愿望</button></div></div>' +

      (all.length ? '<section class="card card--cream">' +
        '<div class="big-progress"><div class="big-num">' + pct + '<small>%</small></div>' +
          '<div style="flex:1"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<p style="font-size:11.5px;color:var(--faint);margin-top:6px">已实现 ' + doneCount + ' 个 · 待实现 ' +
          (all.length - doneCount) + ' 个 · 共 ' + all.length + ' 个愿望</p></div></div>' +
      '</section>' : '') +

      '<section class="card">' +
        '<div class="tabs" style="margin-bottom:14px">' +
          [{ id: 'all', label: '全部', n: all.length }, { id: 'open', label: '待实现', n: all.length - doneCount },
           { id: 'done', label: '已实现', n: doneCount }].map((f) =>
            '<button type="button" class="tab' + (filter === f.id ? ' is-active' : '') +
            '" data-act="wish.filter" data-filter="' + f.id + '"><span class="tab-dot"></span>' +
            f.label + ' <span class="count-chip">' + f.n + '</span></button>').join('') +
        '</div>' +
        (list.length ? '<div class="wish-grid">' + list.map((w) =>
          '<div class="wish-card' + (w.done ? ' is-done' : '') + '">' +
            App.checkRow({
              id: w.id, checked: w.done, label: w.title, change: 'wish.toggle', delAct: 'wish.del',
            }) +
            (w.note ? '<p class="wish-note">' + esc(w.note) + '</p>' : '') +
            '<div class="wish-foot">' +
              '<span class="badge">' + esc(w.category || '其他') + '</span>' +
              (w.date ? '<span class="badge">计划 ' + fmtDay(w.date) + '</span>' : '') +
              (w.done ? '<span class="badge badge--done">已实现</span>' : '<span class="badge badge--olive">待实现</span>') +
              '<span style="flex:1"></span>' +
              '<button type="button" class="link" data-act="wish.edit" data-id="' + w.id + '">编辑</button>' +
            '</div>' +
          '</div>').join('') + '</div>'
          : UI.empty('✈️', filter === 'done' ? '还没有实现的愿望' : '清单是空的',
            filter === 'done' ? '每一个勾选，都是一次真实的抵达。' : '写下第一个想去的地方吧。')) +
      '</section>' +
    '</div>';
  };

  App.actions['wish.filter'] = function (el) { App.ui.wishFilter = el.dataset.filter; App.render(); };
  App.actions['wish.add'] = function () { wishModal(null); };
  App.actions['wish.edit'] = function (el) {
    const w = Store.state.wishes.find((x) => x.id === el.dataset.id);
    if (w) wishModal(w);
  };
  App.actions['wish.toggle'] = function (el) {
    const w = Store.state.wishes.find((x) => x.id === el.dataset.id);
    if (!w) return;
    w.done = el.checked;
    w.doneAt = el.checked ? Date.now() : null;
    App.commit('wishes');
    if (w.done) UI.toast('又实现了一个愿望 ✨');
  };
  App.actions['wish.del'] = async function (el) {
    const w = Store.state.wishes.find((x) => x.id === el.dataset.id);
    if (!w) return;
    const ok = await UI.confirm({ title: '删除这个愿望？', message: '「' + w.title + '」删除后无法恢复。', okText: '删除' });
    if (!ok) return;
    App.deleteById(Store.state.wishes, w.id);
    App.commit('wishes');
  };
})();
