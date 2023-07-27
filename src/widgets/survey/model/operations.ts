import { v4 as uuidv4 } from 'uuid';

import {
  ActivityPipelineType,
  AvailabilityType,
  StoreProgressPayload,
} from '@app/abstract/lib';
import { EventModel, ScheduleEvent } from '@app/entities/event';
import { Answers, PipelineItem } from '@app/features/pass-survey';

export const getScheduledDate = (event: ScheduleEvent) => {
  if (
    event.availability.availabilityType !== AvailabilityType.AlwaysAvailable
  ) {
    return EventModel.ScheduledDateCalculator.calculate(event!)!.valueOf();
  }
};

export const getActivityStartAt = (progressRecord: StoreProgressPayload) => {
  return progressRecord.type === ActivityPipelineType.Regular
    ? progressRecord.startAt
    : progressRecord.currentActivityStartAt;
};

export const getExecutionGroupKey = (progressRecord: StoreProgressPayload) => {
  return progressRecord.type === ActivityPipelineType.Flow
    ? progressRecord.executionGroupKey
    : uuidv4();
};

export const getUserIdentifier = (
  pipeline: PipelineItem[],
  answers: Answers,
) => {
  const itemWithIdentifierStep = pipeline.findIndex(item => {
    return item.type === 'TextInput' && item.payload.shouldIdentifyResponse;
  });

  if (itemWithIdentifierStep > -1) {
    return answers[itemWithIdentifierStep]?.answer as string;
  }
};

export const getItemIds = (pipeline: PipelineItem[]): string[] => {
  return pipeline.reduce(
    (accumulator: string[], current: PipelineItem, step: number) => {
      if (canItemHaveAnswer(current)) {
        accumulator.push(pipeline[Number(step)].id!);
      }
      return accumulator;
    },
    [],
  );
};

export const canItemHaveAnswer = (pipelineItem: PipelineItem): boolean => {
  return pipelineItem.type !== 'Tutorial' && pipelineItem.type !== 'Splash';
};
