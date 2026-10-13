package com.timyuyu.ielts.offline;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Runs against the installed APK, without a browser server or internet access. */
public final class OfflineDeviceCheck extends Instrumentation {
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private Activity activity;
    private WebView web;
    private String evaluate(String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        runOnMainSync(() -> web.evaluateJavascript(expression, result -> { value.set(result); latch.countDown(); }));
        if (!latch.await(10, TimeUnit.SECONDS)) throw new AssertionError("JavaScript callback timed out");
        return value.get();
    }
    private void waitTrue(String expression) throws Exception {
        long until = System.currentTimeMillis() + 60000;
        while (System.currentTimeMillis() < until) { if ("true".equals(evaluate(expression))) return; Thread.sleep(250); }
        throw new AssertionError("Timed out: " + expression);
    }
    private void launch() throws Exception {
        Intent intent = new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = startActivitySync(intent);
        Field field = MainActivity.class.getDeclaredField("web");
        field.setAccessible(true);
        web = (WebView)field.get(activity);
        waitTrue("Boolean(document.getElementById('root')?.children.length)");
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            launch();
            evaluate("window.__deviceCheck={done:false}; (async()=>{try{"
                + "const d=await(await fetch('/dict/ecdict.json')).json(); if(d.count!==50000)throw Error('dictionary');"
                + "const p=await(await fetch('/api/phonetic?text=hello')).json();if(!p.phonetic.includes('h'))throw Error('phonetic');"
                + "await new Promise((ok,bad)=>{const t=setTimeout(()=>bad(Error('speech timeout')),10000);const u=new SpeechSynthesisUtterance(\"I'm on duty.\");u.onstart=()=>{clearTimeout(t);speechSynthesis.cancel();ok()};u.onerror=()=>{clearTimeout(t);bad(Error('speech'))};speechSynthesis.speak(u)});"
                + "const a=new Audio('/audio/part2/p2-01.mp3');a.volume=0;await a.play();await new Promise(r=>setTimeout(r,500));"
                + "if(a.currentTime<=0||a.duration<30)throw Error('audio playback');a.currentTime=12;await new Promise(r=>setTimeout(r,700));"
                + "if(a.currentTime<12)throw Error('audio seek');a.pause();localStorage.setItem('__offline-device-check','saved');"
                + "window.__deviceCheck={done:true,words:d.count,duration:a.duration,time:a.currentTime};"
                + "}catch(e){window.__deviceCheck={done:true,error:String(e)}}})();");
            waitTrue("window.__deviceCheck.done");
            if (!"false".equals(evaluate("Boolean(window.__deviceCheck.error)"))) throw new AssertionError(evaluate("window.__deviceCheck.error"));
            String checks = evaluate("JSON.stringify(window.__deviceCheck)");
            runOnMainSync(() -> activity.finish());
            Thread.sleep(1000);
            launch();
            if (!"true".equals(evaluate("localStorage.getItem('__offline-device-check')==='saved'"))) throw new AssertionError("storage did not survive restart");
            result.putString("stream", "Android 16 installed APK: offline launch, dictionary, phonetics, recorded speech, audio playback and seeking, and local storage restart passed. " + checks + "\n");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("stream", "Device check failed: " + error + "\n");
            finish(Activity.RESULT_CANCELED, result);
        }
    }
}
