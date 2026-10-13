package com.timyuyu.ielts.offline;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.view.WindowInsets;
import java.util.Locale;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady;
    private PermissionRequest pendingMicrophone;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        setContentView(web);
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setBlockNetworkLoads(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new AssetClient(getAssets()));
        web.addJavascriptInterface(new SpeechBridge(), "AndroidSpeech");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!AssetClient.isLocal(request.getOrigin())) { request.deny(); return; }
                    boolean wantsAudio = false;
                    for (String resource : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;
                    if (!wantsAudio) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    else {
                        if (pendingMicrophone != null) pendingMicrophone.deny();
                        pendingMicrophone = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 7);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (pendingMicrophone == request) pendingMicrophone = null; }
        });
        tts = new TextToSpeech(this, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (!ttsReady) return;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { speechEvent(id, "start"); }
                @Override public void onDone(String id) { speechEvent(id, "end"); }
                @Override public void onError(String id) { speechEvent(id, "error"); }
            });
        });
        web.loadUrl("https://" + AssetClient.HOST + "/index.html");
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != 7 || pendingMicrophone == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) pendingMicrophone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else pendingMicrophone.deny();
        pendingMicrophone = null;
    }
    private void speechEvent(String id, String type) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.__offlineSpeechEvent && window.__offlineSpeechEvent(" + JSONObject.quote(id) + "," + JSONObject.quote(type) + ")", null); });
    }
    private final class SpeechBridge {
        @JavascriptInterface public void cancel() { runOnUiThread(() -> { if (ttsReady) tts.stop(); }); }
        @JavascriptInterface public void speak(String text, String lang, double rate, double pitch, String id) {
            runOnUiThread(() -> {
                Voice chosen = null;
                if (ttsReady && tts.getVoices() != null) {
                    Locale requested = Locale.forLanguageTag(lang);
                    for (Voice voice : tts.getVoices()) {
                        if (!voice.isNetworkConnectionRequired() && voice.getLocale().getLanguage().equals("en")) {
                            chosen = voice;
                            if (voice.getLocale().equals(requested)) break;
                        }
                    }
                }
                if (chosen == null || text.length() > TextToSpeech.getMaxSpeechInputLength()) {
                    speechEvent(id, "error");
                    new AlertDialog.Builder(MainActivity.this).setMessage("这个自定义词句没有内置录音。若需要朗读，请在手机的文字转语音设置中安装英语离线语音包；内置课程录音不受影响。").setPositiveButton("知道了", null).show();
                    return;
                }
                tts.setVoice(chosen);
                tts.setSpeechRate((float)Math.max(0.5, Math.min(2, rate)));
                tts.setPitch((float)Math.max(0.5, Math.min(2, pitch)));
                if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), id) == TextToSpeech.ERROR) speechEvent(id, "error");
            });
        }
    }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() {
        if (pendingMicrophone != null) pendingMicrophone.deny();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.removeJavascriptInterface("AndroidSpeech"); web.destroy(); web = null; }
        super.onDestroy();
    }
}
