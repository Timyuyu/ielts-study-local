' ============================================================
'  雅思学习APP 本地启动器（无黑窗版）
'  双击本文件即可：自动启动本地服务并打开浏览器
' ============================================================
Option Explicit

Dim shell, fso, appDir, t, ok, msg
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)

' ---------- 1. 检查依赖是否完整 ----------
If Not fso.FolderExists(appDir & "\node_modules\vite") Or _
   Not fso.FolderExists(appDir & "\node_modules\vinext") Then
    msg = "缺少运行依赖（node_modules 不完整）。" & vbCrLf & vbCrLf & _
          "请先双击运行同目录下的「安装依赖.bat」，" & vbCrLf & _
          "安装完成后再双击本文件启动。"
    MsgBox msg, vbExclamation, "雅思学习APP - 提示"
    WScript.Quit 1
End If

' ---------- 2. 探测服务是否已在运行 ----------
If HttpOk("http://localhost:3000/") Then
    ' 服务已在运行，直接打开浏览器
    shell.Run "http://localhost:3000/", 1, False
    WScript.Quit 0
End If

' ---------- 3. 启动开发服务器（隐藏窗口，日志写入 dev.log） ----------
shell.Run "cmd /c cd /d """ & appDir & """ && npm run dev > dev.log 2>&1", 0, False

' ---------- 4. 轮询等待就绪（最多 90 秒） ----------
ok = False
For t = 1 To 90
    WScript.Sleep 1000
    If HttpOk("http://localhost:3000/") Then
        ok = True
        Exit For
    End If
Next

If ok Then
    shell.Run "http://localhost:3000/", 1, False
Else
    msg = "启动超时或失败。" & vbCrLf & _
          "请打开同目录下的 dev.log 查看具体原因，" & vbCrLf & _
          "或改用「启动雅思学习APP.bat」查看启动过程。"
    MsgBox msg, vbExclamation, "雅思学习APP - 提示"
End If

' ============================================================
'  辅助函数
' ============================================================

' HTTP 探测：服务器是否已响应（localhost 在 Windows 下可解析到 IPv6）
Function HttpOk(url)
    Dim http
    HttpOk = False
    On Error Resume Next
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.open "GET", url, False
    http.setRequestHeader "User-Agent", "local-launcher"
    http.send
    If http.status >= 200 And http.status < 500 Then HttpOk = True
    Set http = Nothing
    On Error GoTo 0
End Function
