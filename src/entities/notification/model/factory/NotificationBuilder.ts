import { isEqual, startOfDay } from 'date-fns';
import i18next from 'i18next';

import { ActivityPipelineType } from '@app/abstract/lib/types/activityPipeline';
import {
  AvailabilityType,
  NotificationTriggerType,
  PeriodicityType,
} from '@app/abstract/lib/types/event';
import { DatesFromTo } from '@app/shared/lib/types/dateTime';
import { ILogger } from '@app/shared/lib/types/logger';

import { INotificationBuilder } from './INotificationBuilder';
import { NotificationDaysExtractor } from './NotificationDaysExtractor';
import { NotificationUtility } from './NotificationUtility';
import { ReminderCreator } from './ReminderCreator';
import {
  AppletNotificationDescribers,
  BreakReason,
  Entity,
  EventEntity,
  EventNotificationDescribers,
  NotificationBuilderInput,
  NotificationDescriber,
  NotificationType,
  RandomCrossBorderType,
  ReminderSetting,
  ScheduleEvent,
} from '../../lib/types/notificationBuilder';

export class NotificationBuilder implements INotificationBuilder {
  private appletName: string;

  private eventEntities: EventEntity[];

  private keepDebugData: boolean;

  private notificationDaysExtractor: NotificationDaysExtractor;

  private reminderCreator: ReminderCreator;

  private utility: NotificationUtility;

  private appletId: string;

  private logger: ILogger;

  constructor(inputData: NotificationBuilderInput, logger: ILogger) {
    this.appletName = inputData.appletName;
    this.eventEntities = inputData.eventEntities;

    this.keepDebugData = false;

    this.notificationDaysExtractor = new NotificationDaysExtractor(
      inputData.appletId,
      inputData.progressions,
      logger,
    );

    this.reminderCreator = new ReminderCreator(
      inputData.appletId,
      inputData.progressions,
      inputData.responseTimes,
    );

    this.utility = new NotificationUtility(
      inputData.appletId,
      inputData.progressions,
    );

    this.appletId = inputData.appletId;
    this.logger = logger;
  }

  private processEventDay(
    day: Date,
    event: ScheduleEvent,
    entity: Entity,
    targetSubjectId: string | null,
  ): NotificationDescriber[] {
    const activityId: string | null =
      entity.pipelineType === ActivityPipelineType.Regular ? entity.id : null;

    const activityFlowId: string | null =
      entity.pipelineType === ActivityPipelineType.Flow ? entity.id : null;

    const entityName = entity.name;

    const entityDescription = i18next.t(
      'local_notifications:complete_activity',
    );

    const eventNotifications = event.notificationSettings.notifications;

    const result: NotificationDescriber[] = [];

    const currentInterval: DatesFromTo = this.utility.getAvailabilityInterval(
      day,
      event,
    );

    const isSpread = this.utility.isSpreadToNextDay(event);

    for (const eventNotification of eventNotifications) {
      const { from, to, at, triggerType } = eventNotification;

      let triggerAt: Date;
      let randomBorderType: RandomCrossBorderType | null | undefined;

      if (triggerType === NotificationTriggerType.FIXED) {
        const isNextDay =
          isSpread && this.utility.isNextDay(event, eventNotification.at!);

        triggerAt = this.utility.getTriggerAtForFixed(day, at!, isNextDay);
      }

      if (triggerType === NotificationTriggerType.RANDOM) {
        randomBorderType = !isSpread
          ? 'both-in-current-day'
          : this.utility.getRandomBorderType(event, eventNotification)!;

        triggerAt = this.utility.getTriggerAtForRandom(
          day,
          from!,
          to!,
          randomBorderType,
        );

        if (!triggerAt) {
          this.logger.warn(
            '[NotificationBuilder.processEventDay]: triggerAt is not defined for random notification',
          );
          continue;
        }
      }

      const notification: NotificationDescriber =
        this.utility.createNotification(
          triggerAt!,
          entityName,
          entityDescription,
          activityId,
          activityFlowId,
          event.id,
          targetSubjectId,
          NotificationType.Regular,
        );

      notification.fallType = this.utility.getFallType(triggerAt!, day);
      notification.isSpreadInEventSet = isSpread;
      notification.randomDayCrossType = randomBorderType;
      notification.eventDayString = day.toString();

      if (
        event.availability.periodicityType !== PeriodicityType.Always ||
        event.availability.oneTimeCompletion
      ) {
        this.utility.markNotificationIfActivityCompleted(
          (activityId ?? activityFlowId)!,
          event.id,
          targetSubjectId,
          notification,
          currentInterval,
        );
      }

      this.utility.markIfNotificationOutdated(notification, event);

      result.push(notification);
    }

    return result;
  }

  private processEvent(
    event: ScheduleEvent,
    entity: Entity,
    targetSubjectId: string | null,
  ): EventNotificationDescribers {
    const eventResult: EventNotificationDescribers = {
      eventId: event.id,
      notifications: [],
      eventName: '',
      scheduleEvent: event,
    };

    if (!event.scheduledAt) {
      eventResult.breakReason = BreakReason.ScheduledAtIsEmpty;
      return eventResult;
    }

    const scheduledDay = startOfDay(event.scheduledAt);

    const firstScheduleDay = this.utility.currentDay;

    const eventDayFrom = event.availability.startDate;

    const eventDayTo = event.availability.endDate;

    const periodicity = event.availability.periodicityType;

    const entityName = entity.name;

    const isEntityHidden = !entity.isVisible;

    const eventNotifications = event.notificationSettings.notifications;

    const reminderSetting: ReminderSetting | null =
      event.notificationSettings.reminder;

    eventResult.eventName = this.utility.generateEventName(
      entityName,
      periodicity,
      eventNotifications,
      reminderSetting,
    );

    const isPeriodicitySet =
      periodicity === PeriodicityType.Daily ||
      periodicity === PeriodicityType.Weekly ||
      periodicity === PeriodicityType.Weekdays ||
      periodicity === PeriodicityType.Monthly;

    const isOnceEvent = periodicity === PeriodicityType.Once;

    if (isOnceEvent && scheduledDay < this.utility.yesterday) {
      eventResult.breakReason = BreakReason.ScheduledDayIsLessThanYesterday;
      return eventResult;
    }
    if (
      isPeriodicitySet &&
      eventDayTo &&
      eventDayTo < this.utility.currentDay
    ) {
      eventResult.breakReason = BreakReason.EventDayToIsLessThanCurrentDay;
      return eventResult;
    }

    if (
      isPeriodicitySet &&
      eventDayFrom &&
      eventDayFrom > this.utility.lastScheduleDay
    ) {
      eventResult.breakReason =
        BreakReason.EventDayFromIsMoreThanLastScheduleDay;
      return eventResult;
    }

    if (isEntityHidden) {
      eventResult.breakReason = BreakReason.EntityHidden;
      return eventResult;
    }

    if (
      event.availability.availabilityType ===
        AvailabilityType.AlwaysAvailable &&
      event.availability.oneTimeCompletion &&
      this.utility.isCompleted(entity.id, event.id, targetSubjectId)
    ) {
      eventResult.breakReason = BreakReason.OneTimeCompletion;
      return eventResult;
    }

    if (isOnceEvent) {
      const notifications = this.processEventDay(
        scheduledDay,
        event,
        entity,
        targetSubjectId,
      );

      eventResult.notifications.push(...notifications);

      const reminders = this.reminderCreator.create(
        [scheduledDay],
        [scheduledDay],
        event,
        entity,
        targetSubjectId,
      );
      if (reminders.length) {
        eventResult.notifications.push(reminders[0].reminder);
      }
    } else {
      const eventDays = this.notificationDaysExtractor.extract(
        firstScheduleDay,
        this.utility.lastScheduleDay,
        eventDayFrom,
        eventDayTo,
        periodicity,
        scheduledDay,
      );

      const reminderDays = this.notificationDaysExtractor.extractForReminders(
        this.utility.lastScheduleDay,
        eventDayFrom,
        eventDayTo,
        periodicity,
        scheduledDay,
      );

      const reminders = this.reminderCreator.create(
        eventDays,
        reminderDays,
        event,
        entity,
        targetSubjectId,
      );

      const reminderFromPastDays = reminders.filter(
        r => !eventDays.some(ed => isEqual(ed, r.eventDay)),
      );

      eventResult.notifications.push(
        ...reminderFromPastDays.map(x => x.reminder),
      );

      for (const day of eventDays) {
        const notifications = this.processEventDay(
          day,
          event,
          entity,
          targetSubjectId,
        );
        eventResult.notifications.push(...notifications);

        const currentReminder = reminders.find(x => isEqual(x.eventDay, day));

        if (currentReminder) {
          eventResult.notifications.push(currentReminder.reminder);
        }
      }
    }

    if (this.keepDebugData) {
      for (const notification of eventResult.notifications) {
        notification.toString_Debug = JSON.stringify(notification, null, 2);
        notification.scheduledEvent_Debug = event;
        notification.scheduledEventString_Debug = JSON.stringify(
          event,
          null,
          2,
        );
      }
    }

    return eventResult;
  }

  // PUBLIC

  public build(): AppletNotificationDescribers {
    const eventNotificationsResult: Array<EventNotificationDescribers> = [];

    for (const eventEntity of this.eventEntities) {
      try {
        const { assignment } = eventEntity;

        // Normalize target subject ID to null for self-reports
        const targetSubjectId =
          assignment && assignment.target.id !== assignment.respondent.id
            ? assignment.target.id
            : null;

        const eventNotifications = this.processEvent(
          eventEntity.event,
          eventEntity.entity,
          targetSubjectId,
        );
        eventNotificationsResult.push(eventNotifications);
      } catch (error) {
        console.error(
          `[NotificationBuilder.build] Error occurred during process event: "${eventEntity.event.id}", entity: "${eventEntity.entity?.name}" :\n\n${error}`,
        );
      }
    }

    const result: AppletNotificationDescribers = {
      appletId: this.appletId,
      appletName: this.appletName,
      events: eventNotificationsResult,
    };

    return result;
  }
}
