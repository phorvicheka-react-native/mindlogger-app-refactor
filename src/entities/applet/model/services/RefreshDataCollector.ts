import { AxiosResponse } from 'axios';

import {
  ActivityDto,
  AllEventsResponse,
  AppletDetailsDto,
  AppletEventsResponse,
  AppletRespondentMetaDto,
  AppletAssignmentsResponse,
  toAxiosResponse,
  EventsService,
  AppletsService,
  AppletDto,
} from '@app/shared/api';
import {
  ILogger,
  collectActivityDetailsImageUrls,
  collectAppletDetailsImageUrls,
  collectAppletRecordImageUrls,
} from '@app/shared/lib';

type AppletId = string;

export type CollectAppletInternalsResult = {
  appletId: AppletId;
  appletDetails: AppletDetailsDto;
  activities: Array<ActivityDto>;
  imageUrls: string[];
  respondentMeta: AppletRespondentMetaDto;
};

export type CollectAllAppletEventsResult = {
  appletEvents: Record<AppletId, AxiosResponse<AppletEventsResponse> | null>;
};

type CollectAppletDetailsResult = {
  appletDetailsDto: AppletDetailsDto;
  activityDetailsDtos: Array<ActivityDto>;
  imageUrls: string[];
  respondentMeta: AppletRespondentMetaDto;
};

export type CollectAllAppletAssignmentsResult = {
  appletAssignments: Record<
    AppletId,
    AxiosResponse<AppletAssignmentsResponse> | null
  >;
};

export interface IRefreshDataCollector {
  collectAppletInternals(
    appletDto: AppletDto,
  ): Promise<CollectAppletInternalsResult>;
  collectAllAppletEvents(
    appletIds: string[],
  ): Promise<CollectAllAppletEventsResult>;
  collectAllAppletAssignments(
    appletIds: string[],
  ): Promise<CollectAllAppletAssignmentsResult>;
}

class RefreshDataCollector implements IRefreshDataCollector {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  private async collectAppletDetails(
    appletId: string,
  ): Promise<CollectAppletDetailsResult> {
    const appletDetailsResponse =
      await AppletsService.getAppletAndActivitiesDetails({
        appletId,
      });

    const { appletDetail, activitiesDetails, respondentMeta } =
      appletDetailsResponse.data.result;

    const imageUrls: string[] = collectAppletDetailsImageUrls(appletDetail);

    return {
      appletDetailsDto: appletDetail,
      activityDetailsDtos: activitiesDetails,
      respondentMeta,
      imageUrls,
    };
  }

  private collectActivitiesImages(activityDtos: Array<ActivityDto>): string[] {
    return activityDtos.flatMap(activityDto => {
      return collectActivityDetailsImageUrls(activityDto);
    });
  }

  public async collectAppletInternals(appletDto: AppletDto) {
    const imageUrls: string[] = collectAppletRecordImageUrls(appletDto);

    let collectDetailsResult: CollectAppletDetailsResult;

    try {
      collectDetailsResult = await this.collectAppletDetails(appletDto.id);
    } catch (error) {
      throw new Error(
        `[RefreshDataCollector.collectAppletInternals]: Error occurred during getting applet's details\n\n${error as never}`,
      );
    }

    const activitiesImages = this.collectActivitiesImages(
      collectDetailsResult.activityDetailsDtos,
    );

    const allImageUrls = collectDetailsResult.imageUrls.concat(
      imageUrls,
      activitiesImages,
    );

    const collectResult: CollectAppletInternalsResult = {
      appletId: appletDto.id,
      appletDetails: collectDetailsResult.appletDetailsDto,
      activities: collectDetailsResult.activityDetailsDtos,
      imageUrls: allImageUrls,
      respondentMeta: collectDetailsResult.respondentMeta,
    };

    return collectResult;
  }

  private async collectEvents(): Promise<AxiosResponse<AllEventsResponse> | null> {
    try {
      return await EventsService.getAllEvents();
    } catch (error) {
      this.logger.warn(
        `[RefreshDataCollector.collectEvents]: Error occurred while fetching events":\n\n${error as never}`,
      );

      return null;
    }
  }

  public async collectAllAppletEvents(appletIds: string[]) {
    const result: CollectAllAppletEventsResult = {
      appletEvents: {},
    };

    const eventsResponse = await this.collectEvents();

    if (eventsResponse) {
      const appletEvents = appletIds.map(appletId => ({
        appletId,
        events:
          eventsResponse.data.result.find(
            appletEventsDto => appletEventsDto.appletId === appletId,
          )?.events ?? [],
      }));

      appletEvents.forEach(({ appletId, events }) => {
        result.appletEvents[appletId] = toAxiosResponse({
          result: {
            events,
          },
        });
      });
    }

    return result;
  }

  public async collectAllAppletAssignments(appletIds: string[]) {
    const result: CollectAllAppletAssignmentsResult = {
      appletAssignments: {},
    };

    for (const appletId of appletIds) {
      const assignmentResponse = await AppletsService.getAppletAssignments({
        appletId,
      });
      result.appletAssignments[appletId] = assignmentResponse;
    }

    return result;
  }
}

export default RefreshDataCollector;
