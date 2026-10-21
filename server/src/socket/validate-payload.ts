import type { Socket } from 'socket.io';
import { C2S, C2S_LOBBY, C2S_TABLE } from '@poker/shared';

// Socket.IO's TypeScript types do not validate packets received from the network.
const fields: Record<string, Record<string, string>> = {
  [C2S_LOBBY.CHECK_NAME]: { name: 'string' },
  [C2S_LOBBY.REGISTER]: { name: 'string', password: 'string', avatarId: 'string?' },
  [C2S_LOBBY.LOGIN]: { name: 'string', password: 'string' },
  [C2S_LOBBY.SESSION_AUTH]: { sessionToken: 'string' },
  [C2S_LOBBY.DEPOSIT]: { amount: 'number' },
  [C2S_LOBBY.UPDATE_AVATAR]: { avatarId: 'string' },
  [C2S_LOBBY.CREATE_TABLE]: { stakeLevelId: 'string', name: 'string?' },
  [C2S_LOBBY.JOIN_TABLE]: { tableId: 'string', name: 'string', buyIn: 'number', avatarId: 'string?', seatIndex: 'number?' },
  [C2S.RECONNECT]: { playerId: 'string', tableId: 'string', playerToken: 'string' },
  [C2S.ACTION]: { action: 'string', amount: 'number?', declareAllIn: 'boolean?' },
  [C2S.RIT_RESPONSE]: { accept: 'boolean', alwaysNo: 'boolean?', alwaysYes: 'boolean?' },
  [C2S.SHOW_CARDS]: { show: 'boolean' },
  [C2S.GET_HAND]: { handId: 'string' },
  [C2S.REBUY]: { amount: 'number' },
  [C2S.UPDATE_AVATAR]: { avatarId: 'string' },
  [C2S.CHAT]: { message: 'string' },
  [C2S.CHANGE_SEAT]: { seatIndex: 'number' },
  [C2S.REPORT_BUG]: { description: 'string' },
  [C2S_TABLE.WATCH]: { tableId: 'string' },
  [C2S_TABLE.GET_HAND]: { handId: 'string' },
};

export function validatePayload(socket: Socket) {
  socket.use(([event, data], next) => {
    const shape = fields[event];
    if (shape && (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.entries(shape).some(([key, expected]) => {
        const value = data[key];
        if (expected.endsWith('?') && value === undefined) return false;
        const type = expected.replace('?', '');
        return typeof value !== type
          || (type === 'number' && !Number.isFinite(value))
          || (type === 'string' && value.length > 2000);
      }))) {
      next(new Error('Invalid event payload'));
      return;
    }
    next();
  });
}
