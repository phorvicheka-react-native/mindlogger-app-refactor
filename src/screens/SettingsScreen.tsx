import { FC } from 'react';
import { StatusBar } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { LogoutRowButton } from '@features/logout';
import { colors } from '@shared/lib';
import { YStack, Box, RowButton, UserIcon, Text } from '@shared/ui';

const SettingsScreen: FC = () => {
  const { navigate } = useNavigation();
  const { t } = useTranslation();

  const navigateToAppLanguage = () => {
    navigate('ChangeLanguage');
  };

  return (
    <Box flex={1} bg="$secondary">
      <StatusBar />

      <Box flex={1} px="$2" jc="flex-start">
        <YStack>
          <YStack space="$2" my="$4" ai="center">
            <UserIcon color={colors.darkGrey} size={45} />
            <Text>Username</Text>
          </YStack>

          <RowButton
            onPress={navigateToAppLanguage}
            title={t('settings:change_pass')}
          />

          <RowButton
            onPress={navigateToAppLanguage}
            title={t('language_screen:change_app_language')}
          />

          <LogoutRowButton />
        </YStack>
      </Box>
    </Box>
  );
};

export default SettingsScreen;