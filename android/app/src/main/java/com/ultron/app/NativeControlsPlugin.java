package com.ultron.app;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;
import java.util.Calendar;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeControls")
public class NativeControlsPlugin extends Plugin {
    @PluginMethod
    public void call(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber", "");
        if (phoneNumber.trim().isEmpty()) {
            call.reject("A phone number is required.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(phoneNumber)));
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber", "");
        String message = call.getString("message", "");
        if (phoneNumber.trim().isEmpty()) {
            call.reject("A phone number is required.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(phoneNumber)));
        intent.putExtra("sms_body", message);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void lockScreen(PluginCall call) {
        DevicePolicyManager policyManager = (DevicePolicyManager) getContext().getSystemService(DevicePolicyManager.class);
        ComponentName admin = new ComponentName(getContext(), UltronDeviceAdminReceiver.class);
        if (!policyManager.isAdminActive(admin)) {
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Ultron needs device-admin access to lock the screen on your command.");
            getContext().startActivity(intent);
            call.reject("Device-admin permission is required.");
            return;
        }
        policyManager.lockNow();
        call.resolve();
    }

    @PluginMethod
    public void scheduleReminder(PluginCall call) {
        int id = call.getInt("id", 0);
        String title = call.getString("title", "Ultron reminder");
        String note = call.getString("note", "");
        String time = call.getString("time", "09:00");
        String frequency = call.getString("frequency", "daily");
        String[] parts = time.split(":");
        if (id == 0 || parts.length != 2) {
            call.reject("A reminder id and valid time are required.");
            return;
        }
        Calendar trigger = Calendar.getInstance();
        trigger.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        trigger.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        trigger.set(Calendar.SECOND, 0);
        trigger.set(Calendar.MILLISECOND, 0);
        if (trigger.getTimeInMillis() <= System.currentTimeMillis()) trigger.add(Calendar.DAY_OF_YEAR, 1);

        Intent intent = new Intent(getContext(), ReminderReceiver.class);
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("note", note);
        intent.putExtra("frequency", frequency);
        PendingIntent pending = PendingIntent.getBroadcast(getContext(), id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(AlarmManager.class);
        long interval = "weekly".equals(frequency) ? AlarmManager.INTERVAL_DAY * 7 : AlarmManager.INTERVAL_DAY;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger.getTimeInMillis(), pending);
        } else {
            alarms.setRepeating(AlarmManager.RTC_WAKEUP, trigger.getTimeInMillis(), interval, pending);
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelReminder(PluginCall call) {
        int id = call.getInt("id", 0);
        Intent intent = new Intent(getContext(), ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(getContext(), id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(AlarmManager.class);
        alarms.cancel(pending);
        call.resolve();
    }
}
