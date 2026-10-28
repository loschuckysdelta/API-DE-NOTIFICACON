package com.loschuckys.notiweb;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class NotiSync {
    private NotiSync() {}
    private static final Object QUEUE_LOCK = new Object();
    private static final Object SEND_LOCK = new Object();

    // Este código solo recibe contenido de aplicaciones que el usuario permitió.
    public static void enqueue(Context context, JSONObject obj) {
        if (!AppPolicy.isAllowed(context, obj.optString("appPackage"))) return;
        synchronized (QUEUE_LOCK) {
            SharedPreferences prefs = Prefs.prefs(context);
            try {
                JSONArray original = new JSONArray(prefs.getString("pending", "[]"));
                JSONArray updated = new JSONArray();
                int first = Math.max(0, original.length() - 149);
                for (int i = first; i < original.length(); i++) updated.put(original.get(i));
                updated.put(obj);
                prefs.edit().putString("pending", updated.toString()).commit();
            } catch (Exception ignored) { }
        }
    }
    public static void clearQueue(Context context) {
        synchronized (QUEUE_LOCK) { Prefs.prefs(context).edit().remove("pending").commit(); }
    }
    private static JSONObject head(Context context) {
        synchronized (QUEUE_LOCK) {
            try {
                JSONArray items = new JSONArray(Prefs.prefs(context).getString("pending", "[]"));
                return items.length() == 0 ? null : items.getJSONObject(0);
            } catch (Exception e) { return null; }
        }
    }
    private static void discardHeadIfMatch(Context context, String expectedEventId) {
        synchronized (QUEUE_LOCK) {
            SharedPreferences prefs = Prefs.prefs(context);
            try {
                JSONArray pending = new JSONArray(prefs.getString("pending", "[]"));
                if (pending.length() == 0 || !expectedEventId.equals(pending.getJSONObject(0).optString("eventId"))) return;
                JSONArray remaining = new JSONArray();
                for (int i = 1; i < pending.length(); i++) remaining.put(pending.get(i));
                prefs.edit().putString("pending", remaining.toString()).commit();
            } catch (Exception ignored) { }
        }
    }

    // Ejecutar fuera del hilo principal de Android.
    public static void poll(Context context) {
        synchronized (SEND_LOCK) {
            SharedPreferences p = Prefs.prefs(context);
            if (!p.getBoolean("enabled", false)) return;
            String base = p.getString("url", "");
            String token = p.getString("token", "");
            if (!base.startsWith("https://") || token.length() < 32) return;
            refreshPolicy(context, base, token);
            // Enviar solamente nombres y paquetes de apps visibles en el lanzador de Android.
            if (System.currentTimeMillis() - p.getLong("catalogSentAt", 0L) > 6L * 3600_000L) {
                if (sendCatalog(context, base, token)) p.edit().putLong("catalogSentAt", System.currentTimeMillis()).apply();
            }
            flushLocked(context, base, token);
        }
    }
    private static void refreshPolicy(Context context, String base, String token) {
        try {
            Response r = call(base + "/api/device-config", token, "GET", null);
            if (r.status == 200) {
                JSONObject body = new JSONObject(r.body);
                JSONArray allowed = body.optJSONArray("allowedApps");
                if (body.optBoolean("ok", false) && allowed != null) AppPolicy.apply(context, allowed);
            }
        } catch (Exception ignored) { /* Política anterior caduca: en duda, no exportar. */ }
    }
    private static boolean sendCatalog(Context context, String base, String token) {
        try {
            PackageManager pm = context.getPackageManager();
            Intent launcher = new Intent(Intent.ACTION_MAIN);
            launcher.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> candidates = pm.queryIntentActivities(launcher, 0);
            Map<String, String> unique = new LinkedHashMap<>();
            for (ResolveInfo r : candidates) {
                if (r.activityInfo == null || r.activityInfo.packageName == null) continue;
                String pkg = r.activityInfo.packageName;
                if (pkg.equals(context.getPackageName())) continue;
                if (unique.size() >= 250) break;
                CharSequence label = r.loadLabel(pm);
                unique.put(pkg, label == null ? pkg : label.toString());
            }
            JSONArray list = new JSONArray();
            for (Map.Entry<String, String> app : unique.entrySet()) {
                JSONObject obj = new JSONObject();
                obj.put("appPackage", app.getKey());
                obj.put("appName", app.getValue());
                list.put(obj);
            }
            if (list.length() == 0) return false;
            JSONObject payload = new JSONObject();
            payload.put("deviceId", Prefs.deviceId(context));
            payload.put("apps", list);
            return call(base + "/api/device-catalog", token, "POST", payload.toString()).status == 200;
        } catch (Exception ignored) { return false; }
    }
    public static void flush(Context context) {
        synchronized (SEND_LOCK) {
            SharedPreferences p = Prefs.prefs(context);
            if (!p.getBoolean("enabled", false)) return;
            String base = p.getString("url", ""), token = p.getString("token", "");
            if (base.startsWith("https://") && token.length() >= 32) flushLocked(context, base, token);
        }
    }
    private static void flushLocked(Context context, String base, String token) {
        if (!AppPolicy.isFresh(context)) return;
        for (int count = 0; count < 150; count++) {
            if (!AppPolicy.isFresh(context)) break;
            JSONObject item = head(context);
            if (item == null) break;
            String id = item.optString("eventId");
            // Si fue desactivada en el panel, borra su mensaje de la cola local.
            if (!AppPolicy.isAllowed(context, item.optString("appPackage"))) {
                discardHeadIfMatch(context, id);
                continue;
            }
            try {
                Response result = call(base + "/api/ingest", token, "POST", item.toString());
                if (result.status != 200) break;
                discardHeadIfMatch(context, id);
            } catch (Exception ignored) { break; }
        }
    }
    private static final class Response {
        final int status; final String body;
        Response(int status, String body) { this.status = status; this.body = body; }
    }
    private static Response call(String address, String token, String method, String body) throws Exception {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(address).openConnection();
            c.setRequestMethod(method);
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setRequestProperty("Authorization", "Bearer " + token);
            c.setRequestProperty("Accept", "application/json");
            if (body != null) {
                c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                c.setDoOutput(true);
                try (OutputStream stream = c.getOutputStream()) {
                    stream.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = c.getResponseCode();
            InputStream in = (status >= 200 && status < 400) ? c.getInputStream() : c.getErrorStream();
            String response = "";
            if (in != null) try (InputStream stream = in) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[2048]; int n;
                while ((n = stream.read(chunk)) != -1 && buffer.size() < 250_000) buffer.write(chunk, 0, n);
                response = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            }
            return new Response(status, response);
        } finally { if (c != null) c.disconnect(); }
    }
}
