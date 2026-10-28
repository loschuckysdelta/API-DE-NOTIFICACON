package com.loschuckys.notiweb;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.UUID;

public final class Prefs {
    private Prefs() {}
    public static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences("notiweb_private", Context.MODE_PRIVATE);
    }
    public static synchronized String deviceId(Context context) {
        SharedPreferences p = prefs(context);
        String id = p.getString("deviceId", "");
        if (id.isEmpty()) {
            id = "android-" + UUID.randomUUID().toString();
            p.edit().putString("deviceId", id).commit();
        }
        return id;
    }
}
