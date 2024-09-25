import { useBaseQuery } from '@app/shared/api/hooks/useBaseQuery';
import { getDefaultAppletsService } from '@app/shared/api/services/appletsServiceInstance';
import { QueryOptions, ReturnAwaited } from '@app/shared/api/types';

type FetchFn = ReturnType<typeof getDefaultAppletsService>['getAppletDetails'];
type Options<TData> = QueryOptions<FetchFn, TData>;

export const useAppletDetailsQuery = <TData = ReturnAwaited<FetchFn>>(
  appletId: string,
  options?: Options<TData>,
) => {
  return useBaseQuery(
    ['applets', { appletId }],
    () => getDefaultAppletsService().getAppletDetails({ appletId }),
    {
      ...options,
      enabled: false,
    },
  );
};
