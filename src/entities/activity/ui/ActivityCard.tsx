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

import ActivityFlowStep from './ActivityFlowStep';
import TimeStatusRecord from './TimeStatusRecord';
import { ActivityListItem, ActivityStatus, ActivityType } from '../lib';

type Props = {
  activity: ActivityListItem;
  disabled: boolean;
};

const ActivityCard: FC<Props> = ({ activity, disabled }) => {
  const { t } = useTranslation();

  const hasOpacity =
    activity.status === ActivityStatus.Scheduled && !activity.isTimeoutAccess;

  return (
    <TouchableOpacity onPress={() => {}} disabled={disabled}>
      <XStack
        mx={3}
        p={14}
        borderWidth={3}
        borderColor="$lighterGrey"
        borderRadius={9}
        opacity={disabled ? 0.5 : 1}
        backgroundColor="$white">
        {!!activity.image && (
          <Box mr={14} alignSelf="center">
            <RoundLogo imageUri={activity.image} />
          </Box>
        )}

        <YStack flexGrow={1} flexShrink={1}>
          {activity.isInActivityFlow && (
            <ActivityFlowStep
              hasOpacity={hasOpacity}
              activity={activity}
              mb={7}
            />
          )}

          <Text
            mb={8}
            flex={1}
            fontWeight={IS_IOS ? '600' : '700'}
            fontSize={16}
            lineHeight={20}
            opacity={hasOpacity ? 0.5 : 1}>
            {activity.name}
          </Text>

          <Text
            fontSize={14}
            fontWeight="300"
            lineHeight={20}
            opacity={hasOpacity ? 0.5 : 1}>
            {activity.description}
          </Text>

          <TimeStatusRecord activity={activity} />

          {IS_ANDROID && activity.type === ActivityType.Flanker && (
            <Text mt={12} color="$alert">
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