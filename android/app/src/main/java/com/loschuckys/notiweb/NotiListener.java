package com.loschuckys.notiweb;

import android.app.Notification;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONException;
import org.json.JSONObject;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

public class NotiListener extends NotificationListenerService {
    private ScheduledExecutorService worker;
    private static final Pattern SENSITIVE = Pattern.compile("(?i)(\\b(otp|2fa|passcode|password|verification code|one.time password|authentication code)\\b|c[oó]digo\\s+(de\\s+)?(verificaci[oó]n|seguridad|acceso|inicio|confirmaci[oó]n)|contrase[nñ]a|pin de acceso)");

    @Override public void onListenerConnected() {
        super.onListenerConnected();
        if (worker != null) worker.shutdownNow();
        Prefs.prefs(this).edit().putBoolean("listenerConnected", true).apply();
        worker = Executors.newSingleThreadScheduledExecutor();
        // Reintenta las notificaciones pendientes cuando el teléfono vuelve a tener internet.
        worker.scheduleWithFixedDelay(() -> {
            try { NotiSync.poll(getApplicationContext()); }
            catch (Exception ignored) { /* Mantener los reintentos programados. */ }
        }, 0, 30, TimeUnit.SECONDS);
    }
    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        SharedPreferences p = Prefs.prefs(this);
        if (!p.getBoolean("enabled", false)) return;
        if (sbn.getPackageName().equals(getPackageName())) return;
        // Antes de leer el título o el cuerpo, comprobar si el usuario permitió esta app.
        if (!AppPolicy.isAllowed(this, sbn.getPackageName())) return;
        Notification notification = sbn.getNotification();
        if (notification == null) return;
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        Bundle extras = notification.extras;
        if (extras == null) return;
        CharSequence titleVal = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence regular = extras.getCharSequence(Notification.EXTRA_TEXT);
        String title = titleVal == null ? "" : titleVal.toString();
        String message = big == null ? (regular == null ? "" : regular.toString()) : big.toString();
        if (title.isEmpty() && message.isEmpty()) return;
        if (SENSITIVE.matcher(title + " " + message).find()) return;
        String appName = sbn.getPackageName();
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(sbn.getPackageName(), 0);
            appName = pm.getApplicationLabel(ai).toString();
        } catch (Exception ignored) { }
        try {
            JSONObject obj = new JSONObject();
            obj.put("deviceId", Prefs.deviceId(this));
            obj.put("deviceName", p.getString("name", "Mi Android"));
            obj.put("appPackage", sbn.getPackageName());
            obj.put("appName", appName);
            obj.put("title", title.length() > 350 ? title.substring(0, 350) : title);
            obj.put("message", message.length() > 1800 ? message.substring(0, 1800) : message);
            obj.put("postedAt", sbn.getPostTime());
            obj.put("eventId", sha256(sbn.getKey() + ":" + sbn.getPostTime()));
            NotiSync.enqueue(this, obj);
            if (worker != null) worker.execute(() -> NotiSync.flush(this));
        } catch (JSONException ignored) { }
    }
    private String sha256(String input) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte b : bytes) out.append(String.format(Locale.US, "%02x", b & 0xff));
            return out.toString();
        } catch (Exception e) { return ""; }
    }
    @Override public void onListenerDisconnected() {
        Prefs.prefs(this).edit().putBoolean("listenerConnected", false).apply();
        super.onListenerDisconnected();
    }
    @Override public void onDestroy() {
        Prefs.prefs(this).edit().putBoolean("listenerConnected", false).apply();
        if (worker != null) worker.shutdownNow();
        super.onDestroy();
    }
}
