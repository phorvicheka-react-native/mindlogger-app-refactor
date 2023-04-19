import { useMemo } from 'react';

import { CacheManager } from '@georstat/react-native-image-cache';
import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { ActivityDto, ActivityService } from '@app/shared/api';
import {
  EventsService,
  AppletsService,
  ActivityRecordDto,
  AppletDto,
} from '@app/shared/api';
import {
  ImageUrl,
  getActivityDetailsKey,
  getAppletDetailsKey,
  getAppletsKey,
  getEventsKey,
} from '@app/shared/lib';
import {
  collectActivityDetailsImageUrls,
  collectAppletDetailsImageUrls,
  collectAppletRecordImageUrls,
} from '@app/shared/lib/services/collectImageUrls';

type AppletActivity = {
  appletId: string;
  activityId: string;
};

class RefreshService {
  private queryClient: QueryClient;
  private showWrongUrlLogs: boolean;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.showWrongUrlLogs = false;
  }

  private async resetAllQueries() {
    await this.queryClient.removeQueries(['applets']);
    await this.queryClient.removeQueries(['events']);
    await this.queryClient.removeQueries(['activities']);
  }

  private isUrlValid = (url: string): boolean => {
    return url.includes('www') || url.includes('http');
  };

  private cacheImages(urls: ImageUrl[]) {
    for (let url of urls) {
      try {
        if (!this.isUrlValid(url)) {
          this.showWrongUrlLogs &&
            console.warn(
              '[RefreshService.cacheImages] Ignored: wrong image url: ' + url,
            );
          continue;
        }
        CacheManager.prefetch(url);
      } catch (err) {
        this.showWrongUrlLogs &&
          console.warn(
            '[RefreshService.cacheImages] Ignored due to error: url: ' + url,
          );
      }
    }
  }

  private async refreshActivityDetails(activityId: string) {
    try {
      const activityResponse = await ActivityService.getById(activityId);

      const activityKey = getActivityDetailsKey(activityId);

      this.queryClient.setQueryData(activityKey, activityResponse);

      const activityDto: ActivityDto = activityResponse.data.result;

      const imageUrls: string[] = collectActivityDetailsImageUrls(activityDto);

      this.cacheImages(imageUrls);
    } catch {
      return Promise.resolve(null);
    }
  }

  private async refreshAppletDetails(
    appletDto: AppletDto,
  ): Promise<AppletActivity[]> {
    const appletId = appletDto.id;

    const appletDetailsKey = getAppletDetailsKey(appletId);

    const appletDetailsResponse = await AppletsService.getAppletDetails({
      appletId,
    });

    await this.queryClient.setQueryData(
      appletDetailsKey,
      appletDetailsResponse,
    );

    const appletDetailsDto = appletDetailsResponse.data.result;

    const imageUrls: string[] = collectAppletDetailsImageUrls(appletDetailsDto);

    this.cacheImages(imageUrls);

    const eventsResponse = await EventsService.getEvents({ appletId });

    const eventsKey = getEventsKey(appletId);

    this.queryClient.setQueryData(eventsKey, eventsResponse);

    const activityDtos: ActivityRecordDto[] = appletDetailsDto.activities;

    return activityDtos.map<AppletActivity>(x => ({
      appletId,
      activityId: x.id,
    }));
  }

  private async refreshApplet(appletDto: AppletDto) {
    const imageUrls: string[] = collectAppletRecordImageUrls(appletDto);

    this.cacheImages(imageUrls);

    const appletActivities = await this.refreshAppletDetails(appletDto);

    const promises: Promise<any>[] = [];

    for (let appletActivity of appletActivities) {
      const promise = this.refreshActivityDetails(appletActivity.activityId);
      promises.push(promise);
    }

    await Promise.all(promises);
  }

  private async refreshAllApplets() {
    await this.resetAllQueries();

    const appletsResponse = await AppletsService.getApplets();

    this.queryClient.setQueryData(getAppletsKey(), appletsResponse);

    const appletDtos: AppletDto[] = appletsResponse.data.result;

    for (let appletDto of appletDtos) {
      try {
        await this.refreshApplet(appletDto);
        console.info(
          `[RefreshService.refreshAllApplets]: Applet "${appletDto.displayName}" refreshed successfully`,
        );
      } catch {
        console.error(
          `[RefreshService.refreshAllApplets]: Got an error during refreshing Applet "${appletDto.displayName}"`,
        );
      }
    }
  }

  // PUBLIC

  public async refresh() {
    try {
      const networkState = await NetInfo.fetch();

      const isOnline =
        networkState.isConnected != null &&
        networkState.isConnected &&
        Boolean(networkState.isInternetReachable);

      if (!isOnline) {
        console.warn(
          '[RefreshService.refresh]: Device is not connected to Internet',
        );
        return;
      }

      await this.refreshAllApplets();

      console.info('[RefreshService.refresh]: Applets refresh completed');
    } catch (err) {
      console.error(err);
      throw new Error('Applets refreshed with errors');
    }
  }
}

const useRefreshMutation = (onSuccess: () => void) => {
  const queryClient = useQueryClient();

  const refreshService = useMemo(
    () => new RefreshService(queryClient),
    [queryClient],
  );

  const refresh = useMemo(
    () => refreshService.refresh.bind(refreshService),
    [refreshService],
  );

  return useMutation(['refresh'], refresh, {
    networkMode: 'always',
    onSuccess,
  });
};

export default useRefreshMutation;