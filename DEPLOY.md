# 部署到 GitHub Pages / Netlify

这个工作台是**纯静态站点**：没有后端、没有数据库、没有构建步骤。部署到任意 HTTPS 静态托管后，手机访问一次并添加到桌面，Service Worker 会缓存整套页面，**之后电脑关机也能离线打开**；数据仍然只保存在手机浏览器里。

> 部署包：`workbench-static-site.zip`。解压后，文件夹里**直接就是** `index.html`、`assets` 等站点文件，不要再套一层文件夹。
> 包内已包含 `.nojekyll`、`robots.txt` 和部署说明；不要上传 `工作台备份-*.json`。

---

## 0. 先备份手机上的现有数据

手机当前如果用的是 `http://192.168.1.4:8080`，数据存在这个网址下。换成 HTTPS 网址后，浏览器会把它当成另一个站点，**旧数据不会自动出现**。

1. 电脑保持开机，手机打开旧地址。
2. 进入「设置 → 导出全部数据备份」，把 JSON 文件保存到手机「文件 / 下载」。
3. 部署完成后，在新网址里进入「设置 → 导入备份文件」，选择这个 JSON。
4. 核对任务、笔记、照片数量无误后，再停用旧地址。

如果目前还没有录入数据，可以跳过这一步。

---

## 1. 解压部署包

把 `workbench-static-site.zip` 解压到一个文件夹（例如 `workbench-static-site`）。打开后应当**直接看到**：

```text
index.html
manifest.webmanifest
sw.js
.nojekyll
robots.txt
DEPLOY.md
assets/
├── css/styles.css
├── js/*.js
└── icons/*.png
```

**上传这些文件和 `assets` 文件夹，不要再套一层目录**，否则网站根地址会变成 `/workbench-site/`，虽然能用，但不推荐。

---

## 2. GitHub Pages（免费，推荐）

免费账号的 Pages 需要**公开仓库**；公开的只是应用代码，个人数据不会上传，仍只存在你的手机浏览器里。

### 2.1 创建仓库

1. 登录 [github.com](https://github.com)，点右上角 **+ → New repository**。
2. Repository name 填一个名字，例如 `my-workbench`。
3. 选择 **Public**。
4. 不要勾选 “Add a README file”（保持空仓库）。
5. 点 **Create repository**。

### 2.2 上传文件

1. 在新仓库页面点 **Add file → Upload files**。
2. 打开解压后的站点文件夹，全选里面的**文件与 `assets` 文件夹**：
   - `index.html`
   - `assets` 文件夹
   - `manifest.webmanifest`
   - `sw.js`
   - `robots.txt`
   - `DEPLOY.md`
   - `.nojekyll`（隐藏文件，见下方说明）
3. 拖到上传区域，或点 “choose your files” 选择。
4. 在下方 Commit changes 里填一句 `deploy workbench`，点 **Commit changes**。

> **`.nojekyll` 上传不了怎么办？**
> 它用于关闭 GitHub Pages 的 Jekyll 处理，不是必须，但建议加。
> 在仓库页点 **Add file → Create new file**，文件名填 `.nojekyll`，内容留空，点 **Commit changes**。

### 2.3 开启 Pages

1. 进入仓库的 **Settings → Pages**。
2. Build and deployment：
   - **Source** 选 `Deploy from a branch`
   - **Branch** 选 `main`
   - **Folder** 选 `/ (root)`
3. 点 **Save**。
4. 等待 1–3 分钟，刷新页面，顶部会出现：

```text
https://你的用户名.github.io/my-workbench/
```

5. 打开这个地址，能看到工作台和隐私提醒即成功。
6. 以后更新：重新上传改动过的文件并 commit，Pages 会自动重新发布。

> 如果出现 404：确认 `index.html` 在仓库**根目录**，而不是在某个子文件夹里；确认 Pages 的 Branch 是 `main`、Folder 是 `/ (root)`；刚开启时多等几分钟。

---

## 3. Netlify Drop（不用 Git，最快）

1. 打开 [app.netlify.com/drop](https://app.netlify.com/drop) 并登录（可用 GitHub / 邮箱注册）。
2. 解压 `workbench-static-site.zip`。
3. 把**解压后的站点文件夹**（例如 `workbench-static-site`）拖进 Drop 区域；它里面应直接有 `index.html`，不要拖它的上一层目录。
4. 等待几十秒，得到类似地址：

```text
https://random-name-123456.netlify.app
```

5. 想换成好记的网址：进入 **Site configuration → Change site name**，改成例如 `my-workbench`，地址变成 `https://my-workbench.netlify.app`。
6. 以后更新：把新的站点文件夹再拖一次，URL 不变，手机上的数据也会保留。

> 如果拖入后首页是 404，说明拖错了层级：站点根目录必须直接包含 `index.html`。
> 也可以用 Netlify CLI（可选，需要 Node.js）：
>
> ```bash
> npm install -g netlify-cli
> netlify login
> cd workbench-static-site
> netlify deploy --prod --dir .
> ```

---

## 4. 手机添加到桌面 + 离线验证

### iPhone / Safari

1. 用 **Safari** 打开 HTTPS 网址（不要在微信、QQ 等 App 的内置浏览器里打开）。
2. 等页面完全加载 2–3 秒，让 Service Worker 缓存资源。
3. 点底部分享按钮 → **添加到主屏幕**。
4. 之后从桌面图标打开。

### Android / Chrome

1. 用 **Chrome** 打开 HTTPS 网址。
2. 等页面加载完成。
3. 右上角菜单 → **添加到主屏幕** / **安装应用**。
4. 之后从桌面图标打开。

### 验证是否真的离线可用

1. 先在线打开一次，停留几秒。
2. 打开手机**飞行模式**（或关闭 Wi-Fi 和流量）。
3. 点桌面图标，应该还能进入工作台，数据也在。
4. 如果显示离线错误：恢复网络，再打开一次，等几秒后关闭重开。首次访问必须完整加载过一次。

> 离线能力来自 Service Worker，**只有 HTTPS（或 localhost）才生效**。
> 之前的 `http://192.168.1.4:8080` 是局域网 HTTP，不能注册 Service Worker，所以电脑一关就打不开。

---

## 5. 数据迁移与固定网址

- 本地数据按**网址（origin）**隔离：
  - `http://192.168.1.4:8080`
  - `https://你的用户名.github.io/my-workbench/`
  - `https://my-workbench.netlify.app`
  这是三个不同的存储位置，数据不会互通。
- 换网址前：旧网址导出备份 → 新网址导入备份。
- 选定一个正式网址后，**不要再换**。换仓库名、换 Netlify 站点名、换自定义域名，都会改变 origin，需要重新导出/导入。
- 如果继续用电脑局域网方式而不是部署：在路由器里给电脑固定 IP，否则 IP 变了，手机上的旧数据也会“看起来消失”。

### iOS 的额外提醒

iOS 可能清理长期不用的网站数据。建议每隔一段时间在「设置 → 导出全部数据备份」保存一份 JSON，不要只依赖浏览器本地存储。

---

## 6. 更新站点

### GitHub Pages

1. 在仓库里重新上传改动过的文件（或直接编辑文件 / push）。
2. commit 后等待 Pages 自动构建。
3. 手机上如果看到的还是旧版本：关闭页面重新打开，必要时刷新两次。Service Worker 会先返回缓存，再在后台更新。

### Netlify

1. 重新拖入新的站点文件夹，或 `netlify deploy --prod`。
2. URL 不变，手机本地数据不会丢。
3. 同样建议刷新两次或重开桌面图标，让新缓存生效。

---

## 7. 隐私与安全

- 部署到公开仓库 / 公开网址的只有 **HTML、CSS、JS、图标**，没有任何个人记录。
- **绝对不要**把 `工作台备份-*.json` 上传到 GitHub、Netlify 或任何公开位置；备份里包含你的打卡、笔记、照片和财务数据。
- `robots.txt` 已设置为不允许搜索引擎抓取；如果希望被收录，可以删掉它。
- 建议给仓库 / Netlify 站点起一个不容易被猜到的名字；应用本身没有登录功能，知道网址的人都能打开**空白应用**，但看不到你的数据。

---

## 8. 常见问题

| 现象 | 处理 |
| --- | --- |
| GitHub Pages 打开 404 | 确认 `index.html` 在仓库根目录；Pages Branch=`main`、Folder=`/ (root)`；多等几分钟 |
| 页面能开但样式全丢 | `assets` 文件夹没有按原结构上传；确认 `assets/css/styles.css` 等路径存在 |
| 手机能开，电脑关机后打不开 | 当前用的是局域网 HTTP；按本文部署到 HTTPS，并在线打开过一次 |
| 添加到桌面后仍显示 Safari 界面 | iOS 用 Safari 的「添加到主屏幕」；Android 用 Chrome 的「安装应用」；不要在微信内置浏览器里操作 |
| 新网址里数据是空的 | 这是正常的，origin 不同；从旧网址导出备份，在新网址导入 |
| 导入备份提示格式不对 | 选择「设置 → 导出全部数据备份」生成的 JSON，不要手改文件 |
| 更新后还是旧界面 | 刷新两次；或在浏览器设置里清除该站点缓存后重新打开 |
| 离线打开白屏 | 首次在线加载没有完成；联网打开一次，停留几秒，再试飞行模式 |

---

完成部署后，手机就可以脱离电脑使用：电脑关机、断网都不影响已经缓存好的工作台，数据也仍然只保存在手机浏览器里。
