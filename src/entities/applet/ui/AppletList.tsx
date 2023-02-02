import { FC } from 'react';

import { XStack, YStack } from '@tamagui/stacks';

import { Box, BoxProps, NoListItemsYet } from '@app/shared/ui';
import { LoadListError } from '@app/shared/ui';

import AppletCard from './AppletCard';
import { useAppletsQuery } from '../api';
import { Applet } from '../lib';

const AppletList: FC<BoxProps> = props => {
  const {
    error,
    data: applets,
    isFetching,
    isSuccess,
  } = useAppletsQuery({
    select: response =>
      response.data.results.map<Applet>(dto => ({
        ...dto,
        description: dto.description.en,
      })),
  });

  const hasError = !!error;

  if (hasError) {
    return (
      <XStack flex={1} jc="center" ai="center">
        <LoadListError error="widget_error:error_text" />
      </XStack>
    );
  }

  if (isSuccess && !applets?.length) {
    return (
      <XStack flex={1} jc="center" ai="center">
        <NoListItemsYet translationKey="applet_list_component:no_applets_yet" />
      </XStack>
    );
  }

  return (
    <Box {...props}>
      <YStack space={18}>
        {applets?.map(x => (
          <AppletCard applet={x} key={x.id} disabled={isFetching} />
        ))}
      </YStack>
    </Box>
  );
};

export default AppletList;