import { createContext } from 'react';

type ActivityIdentifiers = {
  appletId: string;
  activityId: string;
  eventId: string;
  order: number;
  activityName: string;
  flowId?: string;
};

const ActivityIdentityContext = createContext({} as ActivityIdentifiers);

export default ActivityIdentityContext;
