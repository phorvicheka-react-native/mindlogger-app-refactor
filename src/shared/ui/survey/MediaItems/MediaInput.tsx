import { ReactNode, FC } from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import { styled } from '@tamagui/core';
import { useTranslation } from 'react-i18next';

import { Center } from '@shared/ui';

type Props = {
  children: ReactNode;
  mode: 'photo' | 'video';
  onShowMediaLibrary: () => void;
  onOpenCamera: () => void;
};

const UploadButton = styled(Center, {
  width: '100%',
  height: 360,
  borderColor: '$red',
  borderWidth: 4,
  backgroundColor: '$lightRed',
  borderRadius: 15,
});

const MediaInput: FC<Props> = ({
  children,
  mode,
  onOpenCamera,
  onShowMediaLibrary,
}) => {
  const { t } = useTranslation();

  const onUploadPress = () => {
    Alert.alert(t(`camera:choose_${mode}`), t(`camera:take_a_${mode}`), [
      {
        text: t('camera:camera'),
        onPress: onOpenCamera,
      },
      {
        text: t('camera:library'),
        onPress: onShowMediaLibrary,
      },
    ]);
  };

  return (
    <TouchableOpacity onPress={onUploadPress}>
      <UploadButton>{children}</UploadButton>
    </TouchableOpacity>
  );
};

export default MediaInput;