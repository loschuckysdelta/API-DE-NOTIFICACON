package com.loschuckys.notiweb;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private EditText url, token, name;
    private TextView status, listenerStatus;
    private final int bg = 0xFF110A1B;
    private final int card = 0xFF251633;
    private final int accent = 0xFF790699;
    private final int pale = 0xFFD8C8E8;

    private TextView text(String content, int size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(content);
        view.setTextColor(Color.WHITE);
        view.setTextSize(size);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        view.setPadding(0, 9, 0, 9);
        return view;
    }
    private EditText field(LinearLayout parent, String label, String value, boolean secret) {
        TextView caption = text(label, 13, false);
        caption.setTextColor(pale);
        parent.addView(caption);
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(0xFFB5A7C4);
        input.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFC187FF));
        input.setText(value);
        input.setInputType(secret ? InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD : InputType.TYPE_CLASS_TEXT);
        parent.addView(input, new LinearLayout.LayoutParams(-1, -2));
        return input;
    }
    private Button button(LinearLayout parent, String caption) {
        Button btn = new Button(this);
        btn.setText(caption);
        btn.setTextColor(Color.WHITE);
        btn.setAllCaps(false);
        btn.setBackgroundTintList(android.content.res.ColorStateList.valueOf(accent));
        LinearLayout.LayoutParams param = new LinearLayout.LayoutParams(-1, -2);
        param.topMargin = 14;
        parent.addView(btn, param);
        return btn;
    }
    private void toast(String txt) { Toast.makeText(this, txt, Toast.LENGTH_LONG).show(); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(bg);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(bg);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(28, 28, 28, 45);
        scroll.addView(layout);
        setContentView(scroll);

        TextView title = text("🔔 NotiWeb", 30, true);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        layout.addView(title);
        TextView subtitle = text("Los Chuckys · Notificaciones privadas a MongoDB", 14, false);
        subtitle.setTextColor(pale);
        subtitle.setGravity(Gravity.CENTER_HORIZONTAL);
        layout.addView(subtitle);
        layout.addView(text("Solo funciona con acceso explícito del propietario del teléfono. Puedes pausar el envío en cualquier momento.", 13, false));

        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(20, 20, 20, 24);
        form.setBackgroundColor(card);
        LinearLayout.LayoutParams formParam = new LinearLayout.LayoutParams(-1, -2);
        formParam.topMargin = 14;
        layout.addView(form, formParam);

        url = field(form, "URL de Vercel (HTTPS)", Prefs.prefs(this).getString("url", "https://api-de-notificacion.vercel.app"), false);
        token = field(form, "Token privado de envío (INGEST_TOKEN)", Prefs.prefs(this).getString("token", ""), true);
        name = field(form, "Nombre de este celular", Prefs.prefs(this).getString("name", "Mi Android"), false);
        TextView help = text("Controla qué apps se permiten desde el panel de Vercel. Todas están bloqueadas por defecto. NotiWeb enviará solo los nombres de apps visibles en el lanzador para que puedas elegirlas en el panel.", 12, false);
        help.setTextColor(pale);
        form.addView(help);
        TextView deviceIdLabel = text("ID de este celular: " + Prefs.deviceId(this), 12, false);
        deviceIdLabel.setTextColor(pale);
        form.addView(deviceIdLabel);

        Button save = button(form, "Guardar configuración");
        save.setOnClickListener(v -> save());
        Button settings = button(layout, "1. Conceder acceso a notificaciones");
        settings.setOnClickListener(v -> {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            startActivity(i);
        });
        Button start = button(layout, "2. INICIAR ENVÍO A MONGODB");
        start.setOnClickListener(v -> {
            if (!save()) return;
            if (!hasPermission()) { toast("Primero concede permiso de acceso a notificaciones"); return; }
            Prefs.prefs(this).edit().putBoolean("enabled", true).apply();
            AppPolicy.invalidate(this);
            new Thread(() -> NotiSync.poll(getApplicationContext())).start();
            toast("Envío activado. Las nuevas notificaciones se sincronizarán.");
            showStatus();
        });
        Button check = button(layout, "3. COMPROBAR CONEXIÓN Y SINCRONIZAR APPS");
        check.setOnClickListener(v -> {
            if (!save()) return;
            check.setEnabled(false);
            new Thread(() -> {
                String result = NotiSync.testConnection(getApplicationContext());
                runOnUiThread(() -> { check.setEnabled(true); showStatus(); toast(result); });
            }).start();
        });
        Button pause = button(layout, "⏸ Pausar envío");
        pause.setOnClickListener(v -> {
            Prefs.prefs(this).edit().putBoolean("enabled", false).apply();
            AppPolicy.invalidate(this);
            NotiSync.clearQueue(this);
            toast("Envío pausado inmediatamente");
            showStatus();
        });
        listenerStatus = text("", 15, true);
        layout.addView(listenerStatus);
        status = text("", 14, false);
        layout.addView(status);
        TextView privacy = text("🔒 SOLO notificaciones nuevas de apps permitidas. No accedemos a los movimientos internos de un banco. Nunca compartas el token. Puedes pausar el envío o revocar el permiso desde Ajustes de Android. Los avisos de pago no son comprobantes verificados.", 12, false);
        privacy.setTextColor(pale);
        layout.addView(privacy);
        showStatus();
    }
    private boolean hasPermission() {
        String value = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return value != null && value.contains(new ComponentName(this, NotiListener.class).flattenToString());
    }
    private boolean save() {
        String u = url.getText().toString().trim().replaceAll("/+$", "");
        String t = token.getText().toString().trim();
        String n = name.getText().toString().trim();
        if (!u.matches("https://[a-zA-Z0-9.-]+(?::[0-9]+)?") || u.length() > 240) {
            toast("URL inválida: ingresa https://tu-proyecto.vercel.app"); return false;
        }
        if (t.length() < 32 || n.length() < 2 || n.length() > 80) {
            toast("El token requiere 32 caracteres mínimo y el celular un nombre de 2 a 80 caracteres"); return false;
        }
        String oldUrl = Prefs.prefs(this).getString("url", "");
        String oldToken = Prefs.prefs(this).getString("token", "");
        Prefs.prefs(this).edit().putString("url", u).putString("token", t).putString("name", n).apply();
        if (!oldUrl.equals(u) || !oldToken.equals(t)) {
            AppPolicy.invalidate(this);
            NotiSync.clearQueue(this);
            Prefs.prefs(this).edit().remove("heartbeatSentAt").remove("catalogSentAt").apply();
        }
        toast("Configuración guardada");
        return true;
    }
    private void showStatus() {
        if (listenerStatus == null || status == null) return;
        boolean granted = hasPermission();
        boolean enabled = Prefs.prefs(this).getBoolean("enabled", false);
        listenerStatus.setText(granted ? "✅ Permiso de notificaciones: concedido" : "⚠️ Permiso de notificaciones: pendiente");
        String listener = Prefs.prefs(this).getBoolean("listenerConnected", false) ? " · lector conectado" : " · lector esperando conexión";
        String last = Prefs.prefs(this).getString("lastConnectionStatus", "Sin prueba de conexión todavía");
        status.setText((enabled && granted ? (AppPolicy.isFresh(this) ? "🟢 Envío activo" : "🟠 Esperando filtros de Vercel") : "⚪ Envío PAUSADO / sin permiso")
            + listener + "\n" + last);
    }
    @Override protected void onResume() { super.onResume(); showStatus(); }
}
