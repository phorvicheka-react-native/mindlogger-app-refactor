import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { AppletDetailsParamList, appletDetailsScreenOptions } from '../config';
import { AboutScreen, AppletActivityScreen } from '../ui';

const Tab = createBottomTabNavigator<AppletDetailsParamList>();

const AppletBottomTabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={appletDetailsScreenOptions as BottomTabNavigationOptions}>
      <Tab.Screen
        name="Activities"
        options={{
          title: t('applet_footer:activities'),
        }}
        component={AppletActivityScreen}
      />

      <Tab.Screen
        name="Data"
        options={{
          title: t('applet_footer:data'),
        }}
        component={AboutScreen}
      />

      <Tab.Screen
        name="About"
        options={{
          title: t('applet_footer:about'),
        }}
        component={AboutScreen}
      />
    </Tab.Navigator>
  );
};

export default AppletBottomTabNavigator;
