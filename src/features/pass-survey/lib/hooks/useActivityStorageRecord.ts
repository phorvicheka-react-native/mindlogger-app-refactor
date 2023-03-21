import { useCallback } from 'react';

import { useMMKV, useMMKVObject } from 'react-native-mmkv';

import { PipelineItem } from '../types';

type UseActivityStorageArgs = {
  appletId: string;
  activityId: string;
  eventId: string;
};

export type ActivityState = {
  step: number;
  items: PipelineItem[];
  answers: Record<string, any>;
  appletVersion: string;
};

export function useActivityStorageRecord({
  appletId,
  activityId,
  eventId,
}: UseActivityStorageArgs) {
  const storage = useMMKV({ id: 'activity_progress-storage' });

  const key = `${appletId}-${activityId}-${eventId}`;

  const [activityStorageRecord, upsertActivityStorageRecord] =
    useMMKVObject<ActivityState>(key, storage);

  const clearActivityStorageRecord = useCallback(() => {
    storage.delete(key);
  }, [key, storage]);

  return {
    activityStorageRecord,
    upsertActivityStorageRecord,
    clearActivityStorageRecord,
  };
}