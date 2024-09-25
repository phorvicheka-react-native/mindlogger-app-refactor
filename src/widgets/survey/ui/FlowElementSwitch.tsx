import { useMemo } from 'react';

import { useNavigation } from '@react-navigation/native';

import { ScheduleEvent } from '@app/entities/event/lib/types/event';
import { ActivityIdentityContext } from '@app/features/pass-survey/lib/contexts/ActivityIdentityContext';
import { ActivityStepper } from '@app/features/pass-survey/ui/ActivityStepper';
import {
  AnalyticsService,
  MixEvents,
  MixProperties,
} from '@app/shared/lib/analytics/AnalyticsService';
import { colors } from '@app/shared/lib/constants/colors';
import { BackButton } from '@app/shared/ui/BackButton';
import { Box } from '@app/shared/ui/base';
import { CrossIcon } from '@app/shared/ui/icons';

import { FinishItem } from './Finish';
import { Intermediate } from './Intermediate';
import { Summary } from './Summary';
import { FlowPipelineItem } from '../model/pipelineBuilder';

type Props = {
  onClose: () => void;
  onBack: () => void;
  onComplete: (reason: 'regular' | 'idle') => void;
  event: ScheduleEvent;
  isTimerElapsed: boolean;
  interruptionStep: number | null;
  entityStartedAt: number;
  flowId?: string;
} & FlowPipelineItem;

export function FlowElementSwitch({
  type,
  payload,
  event,
  onBack,
  onClose,
  onComplete,
  isTimerElapsed,
  interruptionStep,
  entityStartedAt,
  flowId,
}: Props) {
  const context = useMemo(
    () => ({
      ...payload,
    }),
    [payload],
  );

  const navigator = useNavigation();

  const closeAssessment = (reason: 'regular' | 'click-on-return') => {
    if (reason === 'click-on-return') {
      AnalyticsService.track(MixEvents.ReturnToActivitiesPressed, {
        [MixProperties.AppletId]: context.appletId,
      });
    }
    navigator.goBack();
  };

  switch (type) {
    case 'Stepper': {
      return (
        <ActivityIdentityContext.Provider value={context}>
          <Box flex={1}>
            <ActivityStepper
              {...payload}
              idleTimer={event.timers.idleTimer}
              timer={event.timers.timer}
              entityStartedAt={entityStartedAt}
              onClose={closeAssessment}
              onFinish={onComplete}
              flowId={flowId}
            />
          </Box>
        </ActivityIdentityContext.Provider>
      );
    }

    case 'Intermediate': {
      return (
        <Intermediate
          {...payload}
          onClose={onBack}
          onFinish={() => onComplete('regular')}
        />
      );
    }

    case 'Summary': {
      return (
        <Box flex={1}>
          <BackButton alignSelf="flex-end" mr={16} mt={10} mb={4}>
            <CrossIcon color={colors.tertiary} size={30} />
          </BackButton>

          <Summary {...payload} onFinish={() => onComplete('regular')} />
        </Box>
      );
    }

    case 'Finish': {
      return (
        <FinishItem
          {...payload}
          isTimerElapsed={isTimerElapsed}
          interruptionStep={interruptionStep}
          onClose={onClose}
        />
      );
    }
  }
}
