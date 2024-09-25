import { useMemo, PropsWithChildren } from 'react';
import { SectionList, StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { AutocompletionEventOptions } from '@app/abstract/lib/types/autocompletion';
import {
  CheckAvailability,
  CompleteEntityIntoUploadToQueue,
  EntityType,
} from '@app/abstract/lib/types/entity';
import { getDefaultMediaFilesCleaner } from '@app/entities/activity/lib/services/mediaFilesCleanerInstance';
import { ActivityListItem } from '@app/entities/activity/lib/types/activityListItem';
import { getDefaultItemsVisibilityValidator } from '@app/entities/activity/model/services/itemsVisibilityValidatorInstsance';
import { getDefaultMediaLookupService } from '@app/entities/activity/model/services/mediaLookupServiceInstance';
import { ActivityCard } from '@app/entities/activity/ui/ActivityCard';
import { clearStorageRecords } from '@app/entities/applet/lib/storage/helpers';
import { useStartEntity } from '@app/entities/applet/model/hooks/useStartEntity';
import { useUploadObservable } from '@app/shared/lib/hooks/useUploadObservable';
import { Emitter } from '@app/shared/lib/services/Emitter';
import { getDefaultLogger } from '@app/shared/lib/services/loggerInstance';
import { getMutexDefaultInstanceManager } from '@app/shared/lib/utils/mutexDefaultInstanceManagerInstance';
import { Box, YStack } from '@app/shared/ui/base';
import { Text } from '@app/shared/ui/Text';

import { ActivityListGroup } from '../lib/types/activityGroup';
import { useAvailabilityEvaluator } from '../model/hooks/useAvailabilityEvaluator';

type Props = {
  appletId: string;
  groups: Array<ActivityListGroup>;
  completeEntity: CompleteEntityIntoUploadToQueue;
  checkAvailability: CheckAvailability;
};

export function ActivitySectionList({
  appletId,
  groups,
  completeEntity,
  checkAvailability,
}: Props) {
  const { t } = useTranslation();

  const { navigate, isFocused } = useNavigation();

  const { isUploading } = useUploadObservable();

  const sections = useMemo(() => {
    return groups
      .filter(g => g.activities.length)
      .map(group => {
        return {
          data: group.activities,
          key: t(group.name),
        };
      });
  }, [t, groups]);

  const { startFlow, startActivity } = useStartEntity({
    hasMediaReferences: getDefaultMediaLookupService().hasMediaReferences,
    cleanUpMediaFiles: getDefaultMediaFilesCleaner().cleanUp,
    hasActivityWithHiddenAllItems:
      getDefaultItemsVisibilityValidator().hasActivityWithHiddenAllItems,
    evaluateAvailableTo: useAvailabilityEvaluator().evaluateAvailableTo,
    completeEntityIntoUploadToQueue: completeEntity,
    checkAvailability,
  });

  function navigateSurvey(
    entityId: string,
    entityType: EntityType,
    eventId: string,
    targetSubjectId: string | null,
  ) {
    navigate('InProgressActivity', {
      appletId,
      entityId,
      entityType,
      eventId,
      targetSubjectId,
    });
  }

  const startActivityOrFlow = async ({
    activityId,
    eventId,
    flowId,
    targetSubjectId,
    isExpired: isTimerElapsed,
    name,
    activityFlowDetails,
  }: ActivityListItem) => {
    if (getMutexDefaultInstanceManager().getAutoCompletionMutex().isBusy()) {
      getDefaultLogger().log(
        '[ActivitySectionList.startActivityOrFlow] Postponed due to AutoCompletionMutex is busy',
      );
      return;
    }

    const autocomplete = () => {
      Emitter.emit<AutocompletionEventOptions>('autocomplete', {
        logTrigger: 'expired-while-alert-opened',
      });
    };

    const entityName = activityFlowDetails
      ? activityFlowDetails.activityFlowName
      : name;

    if (flowId) {
      const result = await startFlow(
        appletId,
        flowId,
        eventId,
        entityName,
        isTimerElapsed,
        targetSubjectId,
      );

      if (result.failReason === 'expired-while-alert-opened') {
        return autocomplete();
      }

      if (result.failed) {
        return;
      }

      if (result.fromScratch) {
        clearStorageRecords.byEventId(eventId, targetSubjectId);
      }

      navigateSurvey(flowId, 'flow', eventId, targetSubjectId);
    } else {
      const result = await startActivity(
        appletId,
        activityId,
        eventId,
        entityName,
        isTimerElapsed,
        targetSubjectId,
      );

      if (result.failReason === 'expired-while-alert-opened') {
        return autocomplete();
      }

      if (result.failed) {
        return;
      }

      if (result.fromScratch) {
        clearStorageRecords.byEventId(eventId, targetSubjectId);
      }

      navigateSurvey(activityId, 'regular', eventId, targetSubjectId);
    }
  };

  return (
    <SectionList
      sections={sections}
      renderSectionHeader={({ section }) => (
        <SectionHeader>{section.key}</SectionHeader>
      )}
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          disabled={isUploading}
          onPress={() => {
            if (isFocused()) {
              startActivityOrFlow(item).catch(console.error);
            }
          }}
        />
      )}
      ItemSeparatorComponent={ItemSeparator}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.sectionList}
    />
  );
}

const SectionHeader = ({ children }: PropsWithChildren) => (
  <Box mb={10}>
    <Text
      accessibilityLabel="activity-group-name-text"
      mt={16}
      mb={4}
      fontSize={14}
      fontWeight="600"
      color="$darkGrey2"
    >
      {children}
    </Text>

    <Box width="100%" height={1} bc="$darkGrey2" />
  </Box>
);

const ItemSeparator = () => <YStack my={6} />;

const styles = StyleSheet.create({
  sectionList: {
    flexGrow: 1,
    paddingBottom: 42,
  },
});
