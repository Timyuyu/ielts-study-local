package com.timyuyu.ielts.offline;

import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

final class AssetClient extends WebViewClient {
    static final String HOST = "appassets.androidplatform.net";
    private final AssetManager assets;
    AssetClient(AssetManager assets) { this.assets = assets; }
    static boolean isLocal(Uri uri) { return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()); }
    @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !isLocal(request.getUrl()); }
    private WebResourceResponse error(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason, new HashMap<>(), new ByteArrayInputStream(reason.getBytes()));
    }
    @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!isLocal(uri)) return error(403, "Offline content only");
        String path = uri.getPath();
        if (path == null || path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return error(403, "Invalid path");
        path = path.equals("/") ? "index.html" : path.substring(1);
        String mime = path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".json") ? "application/json" : path.endsWith(".html") ? "text/html" : path.endsWith(".txt") ? "text/plain" : path.endsWith(".mp3") ? "audio/mpeg" : path.endsWith(".woff2") ? "font/woff2" : path.endsWith(".png") ? "image/png" : path.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream";
        try {
            if (!path.endsWith(".mp3")) return new WebResourceResponse(mime, "UTF-8", assets.open(path));
            AssetFileDescriptor descriptor = assets.openFd(path);
            long length = descriptor.getLength();
            String rangeHeader = request.getRequestHeaders().get("Range");
            if (rangeHeader == null) rangeHeader = request.getRequestHeaders().get("range");
            long[] range;
            try { range = parseRange(rangeHeader, length); }
            catch (IllegalArgumentException invalid) { descriptor.close(); return error(416, "Range Not Satisfiable"); }
            InputStream input = descriptor.createInputStream();
            long skip = range[0];
            while (skip > 0) { long count = input.skip(skip); if (count <= 0) { if (input.read() < 0) throw new IOException("Unexpected end"); count = 1; } skip -= count; }
            final long bytes = range[1] - range[0] + 1;
            InputStream bounded = new FilterInputStream(input) {
                private long remaining = bytes;
                @Override public int read() throws IOException { if (remaining == 0) return -1; int value = super.read(); if (value >= 0) remaining--; return value; }
                @Override public int read(byte[] buffer, int offset, int count) throws IOException { if (remaining == 0) return -1; int read = in.read(buffer, offset, (int)Math.min(count, remaining)); if (read > 0) remaining -= read; return read; }
                @Override public void close() throws IOException { try { super.close(); } finally { descriptor.close(); } }
            };
            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");
            headers.put("Content-Length", Long.toString(bytes));
            if (rangeHeader != null) headers.put("Content-Range", "bytes " + range[0] + "-" + range[1] + "/" + length);
            return new WebResourceResponse(mime, null, rangeHeader == null ? 200 : 206, rangeHeader == null ? "OK" : "Partial Content", headers, bounded);
        } catch (IOException missing) { return error(404, "Asset not found"); }
    }
    static long[] parseRange(String header, long length) {
        if (header == null) return new long[]{0, length - 1};
        if (!header.matches("bytes=[0-9]*-[0-9]*")) throw new IllegalArgumentException();
        String[] parts = header.substring(6).split("-", -1);
        try {
            long start, end;
            if (parts[0].isEmpty()) { long suffix = Long.parseLong(parts[1]); if (suffix <= 0) throw new IllegalArgumentException(); start = Math.max(0, length - suffix); end = length - 1; }
            else { start = Long.parseLong(parts[0]); end = parts[1].isEmpty() ? length - 1 : Math.min(length - 1, Long.parseLong(parts[1])); }
            if (start < 0 || start >= length || end < start) throw new IllegalArgumentException();
            return new long[]{start, end};
        } catch (NumberFormatException invalid) { throw new IllegalArgumentException(invalid); }
    }
}
