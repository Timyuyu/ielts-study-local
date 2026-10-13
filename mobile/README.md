# 雅思离线学习 · 安卓版 V1

[下载安装包](https://github.com/Timyuyu/ielts-study-local/releases/download/android-v1.0.0/ielts-offline-android-V1.apk) · [版本说明](https://github.com/Timyuyu/ielts-study-local/releases/tag/android-v1.0.0)

## 在手机上安装

1. 用手机浏览器下载 `ielts-offline-android-V1.apk`，约 300 MB。
2. 打开下载的文件，按系统提示允许这个来源安装应用，然后安装。
3. 桌面上打开 **雅思离线学习**。无需 Node.js、电脑、服务器或账号。
4. 如使用口语模考录音，首次按提示允许麦克风。

面向安卓手机制作，最低安卓 8.0，需使用较新的 Android System WebView；本次验证重点为安卓 16。vivo X300 / OriginOS 6 属于此目标环境，具体手机上的安装与权限表现仍需实际确认。

## 离线内容

安装包直接包含 990 句、听说题库、Part 2 音频、单词音频、5 万词词典、本地字体，以及额外 2,983 段课程朗读录音。已内置的学习内容不需要首次联网缓存，安装后即可开启飞行模式学习。

学习进度、生词收藏、句子收藏、播放位置和设置保存在应用本地。APK 没有联网权限。内置课程的朗读使用打包录音；自行输入且没有内置录音的新词句，可使用手机已有的英语离线 TTS 语音包。离线词典未收录的词语无法调用在线翻译。口语模考录音沿用原版的本次页面复盘方式。

更新时直接覆盖安装，不要先卸载；卸载或清除应用数据会删除本地学习记录。

## 源码与维护

安卓界面复用 `app/StudyApp.tsx`，通过独立 Vite 入口打包，APK 内的 WebView 直接读取安装包资源。音标在本地 JavaScript 中计算；原电脑版本的运行方式保持独立。

Windows 构建需要 Node.js 22.13+、JDK 21、Android SDK（platforms;android-35、build-tools;35.0.0）、FFmpeg 和 Windows 英语离线语音。先设置 `JAVA_HOME`、`ANDROID_HOME` 并在项目根目录运行 `npm ci`，再执行：

```powershell
.\mobile\build-android-V1.ps1
```

新增课程录音由 Windows 本地英语语音生成，构建过程中不调用在线语音服务。录音与打包后的资源属于生成产物，不重复提交到仓库。发布维护者需要使用原签名密钥签名 APK，才能作为现有安装的更新；私钥不在本仓库中。

检查命令：

```sh
node --test mobile/speech.test.mjs
```

Gradle 的 `testReleaseUnitTest` 检查音频区间请求，`assembleReleaseAndroidTest` 构建安卓设备运行检查。`OfflineDeviceCheck` 在安装后的 APK 中验证断网启动、词典、音标、朗读、播放、拖动进度和重启后的本地存储。
