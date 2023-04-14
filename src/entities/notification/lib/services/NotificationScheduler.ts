import notifee, { TimeUnit, TriggerType } from '@notifee/react-native';

import { IS_ANDROID } from '@app/shared/lib';

import { SYSTEM_RESCHEDULING_NOTIFICATION_ID } from '../constants';
import { LocalEventTriggerNotification } from '../types';

function sortLocalEventTriggerNotifications(
  a: LocalEventTriggerNotification,
  b: LocalEventTriggerNotification,
) {
  return a.notification.data.scheduledAt - b.notification.data.scheduledAt;
}

function NotificationScheduler() {
  function scheduleLocalNotification(
    triggerNotification: LocalEventTriggerNotification,
  ) {
    const { notification, trigger } = triggerNotification;

    return notifee.createTriggerNotification(notification, trigger);
  }

  async function getAllScheduledNotifications() {
    const triggerNotifications =
      (await notifee.getTriggerNotifications()) as LocalEventTriggerNotification[];

    triggerNotifications.sort(sortLocalEventTriggerNotifications);

    return triggerNotifications;
  }

  async function getScheduledNotification(notificationId: string) {
    const triggerNotifications = await getAllScheduledNotifications();

    const notification = triggerNotifications.find(
      triggerNotification =>
        triggerNotification.notification.id === notificationId,
    );

    return notification;
  }

  async function scheduleSystemIOSNotification(fireDate: number) {
    if (IS_ANDROID) {
      return;
    }

    const localNotification: LocalEventTriggerNotification = {
      notification: {
        title: 'MindLogger',
        body: 'Tap to update the schedule',
        id: SYSTEM_RESCHEDULING_NOTIFICATION_ID,
        data: {
          isLocal: 'true',
          type: 'request-to-reschedule-due-to-limit',
          scheduledAt: fireDate,
          scheduledAtString: new Date(fireDate).toString(),
        },
      },
      trigger: {
        type: TriggerType.INTERVAL,
        interval: 1,
        // @ts-ignore
        timestamp: fireDate,
        timeUnit: TimeUnit.HOURS,
        alarmManager: {
          allowWhileIdle: true,
        },
      },
    };

    return scheduleLocalNotification(localNotification);
  }

  function cancelAllNotifications() {
    return notifee.cancelAllNotifications();
  }

  function cancelNotification(notificationId: string) {
    return notifee.cancelNotification(notificationId);
  }

  return {
    scheduleLocalNotification,
    scheduleSystemIOSNotification,

    getScheduledNotification,
    getAllScheduledNotifications,

    cancelNotification,
    cancelAllNotifications,
  };
}

export default NotificationScheduler();
