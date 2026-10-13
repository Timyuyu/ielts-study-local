# 雅思学习 APP · 本地版

在自己的电脑和浏览器里练习雅思听力、口语和单词，无需登录 ChatGPT。学习记录保存在当前浏览器的本地存储中。

## 下载与使用（Windows）

1. 前往 [下载页面](https://github.com/Timyuyu/ielts-study-local/releases/latest)，点击 **Source code (zip)** 并完整解压；也可 [直接下载 v1.0.0](https://github.com/Timyuyu/ielts-study-local/archive/refs/tags/v1.0.0.zip)。
2. 安装 [Node.js](https://nodejs.org/) 22.13 或更高版本（建议使用 LTS）。安装后若仍提示找不到 Node.js，请重新打开终端或重启电脑。
3. 首次使用时，双击 **安装依赖.bat**，等待安装完成。这一步需要联网。
4. 双击 **启动雅思学习APP.vbs**，等待浏览器自动打开；如果启动失败，用 **启动雅思学习APP.bat** 查看错误。
5. 使用结束后，可双击 **停止雅思学习APP.bat** 关闭服务。

应用地址是 <http://localhost:3000/>。运行期间请保留项目文件夹，下载包内含音频、词典和字体。它是本地网页应用，需要 Node.js，并非免安装的 Windows EXE。

也可以点击仓库的 **Code → Download ZIP** 下载源码，完整解压后按相同步骤使用。

## 学习内容

- 990 句口语表达、双语搜索、收藏、跟读与听写练习。
- 雅思听说训练题库与 Part 2 音频。
- 本地 MP3 音频及约 5 万词的 ECDICT 离线词典。
- 学习记录、词汇收藏与练习草稿保存在浏览器中。

## 离线使用与学习记录

依赖安装完成后，本地题库、音频、词典和字体可以离线使用；离线词典未收录的词语可能调用在线查询。浏览器语音功能是否离线可用，取决于系统已安装的语音包。

请勿删除 `public/` 或 `node_modules/`。清除浏览器网站数据、使用隐私模式、换浏览器或换电脑都会影响原有学习记录。本地版默认不启用账号登录和云端同步。

## 命令行运行

在解压后的项目目录打开终端：

```sh
npm ci
npm run dev
```

打开 <http://localhost:3000/>；按 `Ctrl+C` 停止。macOS / Linux 可以用以上命令运行，仓库中的双击启动器用于 Windows。

维护者可运行 `npm run build` 检查构建。技术栈为 React、Next.js、Vinext 和 Vite。

## 常见问题

- **缺少依赖**：先运行 `安装依赖.bat`，不要直接在 ZIP 文件内启动。
- **端口 3000 被占用**：关闭占用端口的程序后重试。
- **启动失败或白屏**：运行 `启动雅思学习APP.bat` 查看错误；无窗口启动器的日志位于 `dev.log`。
- **依赖安装失败**：检查网络、Node.js 版本和可用磁盘空间，再重新安装。

## 第三方资源

离线词典来源于 [ECDICT](https://github.com/skywind3000/ECDICT)，保留其 [MIT 许可](third-party-licenses/ECDICT-LICENSE.txt)。Geist 字体来源于 [Geist](https://github.com/vercel/geist-font)，保留其 [SIL Open Font License](third-party-licenses/Geist-OFL.txt)。这些许可适用于对应第三方资源。

如有使用问题，请在本仓库的 [Issues](https://github.com/Timyuyu/ielts-study-local/issues) 提交反馈。
