import { Emitter } from '@app/shared/lib';

import storage from './storage';
import { Session } from './types';

export function storeSession(session: Session) {
  storage.setSession(session);
}

export function storeAccessToken(accessToken: string) {
  storage.setSession({ accessToken });
}

export function storeRefreshToken(refreshToken: string) {
  storage.setSession({ refreshToken });
}

export function refreshTokenFailed() {
  Emitter.emit('refresh-token-fail');
}

export const getSession = storage.getSession;
