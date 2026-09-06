package com.ultron.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.app.AlarmManager;
import java.util.concurrent.TimeUnit;
import androidx.core.app.NotificationCompat;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "ultron-reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Ultron reminders", NotificationManager.IMPORTANCE_HIGH));
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pending = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.ultron.app.R.mipmap.ic_launcher)
                .setContentTitle(intent.getStringExtra("title"))
                .setContentText(intent.getStringExtra("note"))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH);
        manager.notify(intent.getIntExtra("id", 0), notification.build());

        long interval = "weekly".equals(intent.getStringExtra("frequency"))
                ? TimeUnit.DAYS.toMillis(7) : TimeUnit.DAYS.toMillis(1);
        Intent nextIntent = new Intent(context, ReminderReceiver.class)
                .putExtras(intent);
        PendingIntent nextPending = PendingIntent.getBroadcast(context, intent.getIntExtra("id", 0), nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        long nextTrigger = System.currentTimeMillis() + interval;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger, nextPending);
        } else {
            alarms.setRepeating(AlarmManager.RTC_WAKEUP, nextTrigger, interval, nextPending);
        }
    }
}
