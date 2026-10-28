package com.loschuckys.notiweb;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;

/** Denegar por defecto; si la configuración no se actualiza, no se exporta. */
public final class AppPolicy {
    private AppPolicy() {}
    private static final long MAX_AGE_MS = 90_000L;
    public static boolean isFresh(Context context) {
        SharedPreferences p = Prefs.prefs(context);
        return p.getBoolean("enabled", false) && p.getLong("policyFetchedAt", 0L) > 0
            && System.currentTimeMillis() - p.getLong("policyFetchedAt", 0L) <= MAX_AGE_MS;
    }
    public static boolean isAllowed(Context context, String pkg) {
        if (!isFresh(context) || pkg == null) return false;
        try {
            JSONArray allowed = new JSONArray(Prefs.prefs(context).getString("remoteAllowed", "[]"));
            for (int i = 0; i < allowed.length(); i++) if (pkg.equals(allowed.optString(i))) return true;
        } catch (Exception ignored) {}
        return false;
    }
    public static void apply(Context context, JSONArray allowlist) {
        Prefs.prefs(context).edit().putString("remoteAllowed", allowlist.toString())
            .putLong("policyFetchedAt", System.currentTimeMillis()).commit();
    }
    public static void invalidate(Context context) {
        Prefs.prefs(context).edit().putLong("policyFetchedAt", 0L).apply();
    }
}
