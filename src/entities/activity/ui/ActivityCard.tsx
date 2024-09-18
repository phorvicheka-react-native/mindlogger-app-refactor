import { FC } from 'react';
import { TouchableOpacity } from 'react-native';

import { useTranslation } from 'react-i18next';

import { colors, IS_ANDROID, IS_IOS } from '@app/shared/lib';
import {
  RoundLogo,
  Box,
  Text,
  XStack,
  YStack,
  ChevronRightIcon,
} from '@app/shared/ui';

import ActivityAssignmentBadge from './ActivityAssignmentBadge';
import ActivityFlowStep from './ActivityFlowStep';
import TimeStatusRecord from './TimeStatusRecord';
import { ActivityListItem, ActivityStatus, ActivityType } from '../lib';
import { useActivityAssignment } from '../lib/hooks/useActivityAssignment';

type Props = {
  activity: ActivityListItem;
  disabled: boolean;
  onPress?: (...args: unknown[]) => void;
};

const ActivityCard: FC<Props> = ({ activity, disabled, onPress }) => {
  const { t } = useTranslation();
  const { assignment } = useActivityAssignment({
    appletId: activity.appletId,
    activityId: activity.activityId,
    activityFlowId: activity.flowId,
  });

  const isDisabled = disabled || activity.status === ActivityStatus.Scheduled;
  const hasDescription = `${activity.description || ''}`.trim().length > 0;

  const accessibilityLabel = activity.isInActivityFlow
    ? `activity-flow-${activity.activityFlowDetails?.activityFlowName || ''}`
    : `activity-${activity.name}`;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={isDisabled}
    >
      <XStack
        mx={3}
        p={14}
        borderWidth={3}
        borderColor={colors.lighterGrey}
        borderRadius={9}
        opacity={disabled ? 0.5 : 1}
        backgroundColor={colors.white}
      >
        {!!activity.image && (
          <Box
            mr={14}
            alignSelf="center"
            accessibilityLabel="activity_card-image"
          >
            <RoundLogo imageUri={activity.image} />
          </Box>
        )}

        <YStack flexGrow={1} flexShrink={1}>
          {activity.isInActivityFlow &&
            activity.activityFlowDetails?.showActivityFlowBadge && (
              <ActivityFlowStep
                hasOpacity={isDisabled}
                activity={activity}
                mb={7}
              />
            )}

          <Text
            mb={8}
            fontWeight={IS_IOS ? '600' : '700'}
            fontSize={16}
            accessibilityLabel="activity_card_name-text"
            lineHeight={20}
            opacity={isDisabled ? 0.5 : 1}
          >
            {activity.name}
          </Text>

          {assignment && assignment.respondent.id !== assignment.target.id && (
            <XStack mb={8}>
              <ActivityAssignmentBadge
                assignment={assignment}
                accessibilityLabel="activity_card_assignment-text"
                isDisabled={isDisabled}
              />
              <Box flexGrow={1} flexShrink={1} />
            </XStack>
          )}

          {hasDescription && (
            <Text
              fontSize={14}
              fontWeight="300"
              lineHeight={20}
              opacity={isDisabled ? 0.5 : 1}
              accessibilityLabel="activity_card_desc-text"
            >
              {activity.description}
            </Text>
          )}

          <TimeStatusRecord activity={activity} />

          {IS_ANDROID && activity.type === ActivityType.Flanker && (
            <Text mt={12} color={colors.alert}>
              {t('activity:flanker_accuracy_warn')}
            </Text>
          )}
        </YStack>

        <Box alignSelf="center" ml={6}>
          <ChevronRightIcon color={colors.grey2} size={16} />
        </Box>
      </XStack>
    </TouchableOpacity>
  );
};

export default ActivityCard;
