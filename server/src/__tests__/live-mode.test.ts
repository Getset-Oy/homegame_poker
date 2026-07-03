import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent } from '../game/HandEngine.js';
import { GameManager } from '../game/GameManager.js';
import { TableManager } from '../game/TableManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_PLAYER, S2C_TABLE, LIVE_VIRTUAL_STACK, stakeLevelToGameConfig, LIVE_STAKE_LEVEL } from '@poker/shared';

// ============================================================================
// Helpers
// ============================================================================

function makeLiveConfig(): GameConfig {
  return {
    gameType: 'NLHE',
    smallBlind: 1,
    bigBlind: 2,
    maxBuyIn: LIVE_VIRTUAL_STACK,
    actionTimeSeconds: 30,
    minPlayers: 2,
    maxPlayers: 10,
    liveMode: true,
  };
}

function makePlayers(count: number, stack = LIVE_VIRTUAL_STACK) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `player-${i}`,
    seatIndex: i,
    name: `Player${i}`,
    stack,
  }));
}

class LiveHandHarness {
  engine!: HandEngine;
  events: HandEngineEvent[] = [];
  turnEvents: Extract<HandEngineEvent, { type: 'player_turn' }>[] = [];

  start(playerCount: number, dealerSeat = 0) {
    this.events = [];
    this.turnEvents = [];
    this.engine = new HandEngine(makeLiveConfig(), (e) => {
      this.events.push(e);
      if (e.type === 'player_turn') this.turnEvents.push(e);
      if (e.type === 'rit_eligible') this.engine.setRunItTwice(false);
    });
    this.engine.startHand(1, makePlayers(playerCount), dealerSeat);
  }

  currentTurn() {
    return this.turnEvents[this.turnEvents.length - 1] ?? null;
  }

  eventsOfType<T extends HandEngineEvent['type']>(type: T) {
    return this.events.filter(e => e.type === type) as Extract<HandEngineEvent, { type: T }>[];
  }
}

function createMockSocket(id: string) {
  return { id, emit: vi.fn(), on: vi.fn(), join: vi.fn(), leave: vi.fn() } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const roomObj = { emit: emitFn };
  const namespaceObj = { emit: emitFn, to: vi.fn().mockReturnValue(roomObj) };
  return { of: vi.fn().mockReturnValue(namespaceObj), _emitFn: emitFn } as any;
}

function tableRoomEvents(io: any, eventName: string) {
  return io._emitFn.mock.calls.filter((c: any[]) => c[0] === eventName);
}

// ============================================================================
// Config / TableManager
// ============================================================================

describe('Live mode config', () => {
  it('stakeLevelToGameConfig sets liveMode for the live stake level', () => {
    const config = stakeLevelToGameConfig(LIVE_STAKE_LEVEL);
    expect(config.liveMode).toBe(true);
    expect(config.gameType).toBe('NLHE');
  });

  it('TableManager creates a live table from stake level id "live"', () => {
    const tm = new TableManager(createMockIo());
    const result = tm.createTable('live');
    expect(result.error).toBeUndefined();
    const gm = tm.getTable(result.tableId!);
    expect(gm!.getConfig().liveMode).toBe(true);
    const info = tm.getTableList().find(t => t.tableId === result.tableId);
    expect(info!.stakeLevel.label).toBe('LIVE');
  });
});

// ============================================================================
// HandEngine: declared all-ins
// ============================================================================

describe('Live mode HandEngine — declared all-in', () => {
  const h = new LiveHandHarness();

  it('bet with declareAllIn marks the player all-in without emptying virtual stack', () => {
    h.start(2); // heads-up: dealer (player-0) is SB, acts first preflop
    const first = h.currentTurn()!;
    h.engine.handleAction(first.playerId, 'raise', undefined, true);

    const acted = h.eventsOfType('player_acted').find(e => e.playerId === first.playerId)!;
    expect(acted.isAllIn).toBe(true);
    const enginePlayer = h.engine.getPlayers().find(p => p.playerId === first.playerId)!;
    expect(enginePlayer.isAllIn).toBe(true);
    expect(enginePlayer.currentStack).toBeGreaterThan(0);
  });

  it('two declared all-ins run out the board with cards revealed', () => {
    h.start(2);
    const first = h.currentTurn()!;
    h.engine.handleAction(first.playerId, 'raise', undefined, true);
    const second = h.currentTurn()!;
    expect(second.playerId).not.toBe(first.playerId);
    h.engine.handleAction(second.playerId, 'call', undefined, true);

    const showdownReveals = h.eventsOfType('allin_showdown');
    expect(showdownReveals.length).toBe(1);
    expect(showdownReveals[0].entries.length).toBe(2);

    const streets = h.eventsOfType('street_dealt').map(e => e.street);
    expect(streets).toEqual(['flop', 'turn', 'river']);
    expect(h.eventsOfType('showdown').length).toBe(1);
    expect(h.eventsOfType('hand_complete').length).toBe(1);
  });

  it('call all-in vs a normal bet triggers the runout (only one live player left)', () => {
    h.start(2);
    const first = h.currentTurn()!;
    h.engine.handleAction(first.playerId, 'raise'); // normal raise, chips behind
    const second = h.currentTurn()!;
    h.engine.handleAction(second.playerId, 'call', undefined, true); // "call all-in"

    expect(h.eventsOfType('allin_showdown').length).toBe(1);
    expect(h.eventsOfType('hand_complete').length).toBe(1);
  });

  it('normal callers of a declared all-in keep playing later streets', () => {
    h.start(3); // dealer 0, SB 1, BB 2 → UTG = player-0
    const utg = h.currentTurn()!;
    expect(utg.playerId).toBe('player-0');
    h.engine.handleAction(utg.playerId, 'raise', undefined, true); // declared all-in
    h.engine.handleAction('player-1', 'call'); // physical chips behind
    h.engine.handleAction('player-2', 'call');

    // No runout: two live players remain, flop is dealt and betting continues
    expect(h.eventsOfType('allin_showdown').length).toBe(0);
    const streets = h.eventsOfType('street_dealt').map(e => e.street);
    expect(streets).toEqual(['flop']);
    const flopTurn = h.currentTurn()!;
    expect(flopTurn.playerId).toBe('player-1'); // first live player after dealer
    expect(flopTurn.availableActions).toContain('check');
  });

  it('raise all-in reopens the action for players who already acted', () => {
    h.start(3);
    h.engine.handleAction('player-0', 'call'); // UTG limps
    h.engine.handleAction('player-1', 'raise', undefined, true); // SB raise all-in
    h.engine.handleAction('player-2', 'fold'); // BB folds

    // UTG must act again facing the all-in
    const turn = h.currentTurn()!;
    expect(turn.playerId).toBe('player-0');
    expect(turn.availableActions).toContain('call');
    expect(turn.availableActions).toContain('fold');
  });

  it('declared all-in is ignored outside live mode', () => {
    const events: HandEngineEvent[] = [];
    const engine = new HandEngine({ ...makeLiveConfig(), liveMode: false }, (e) => events.push(e));
    engine.startHand(1, makePlayers(2, 200), 0);
    const turn = events.filter(e => e.type === 'player_turn').pop() as any;
    engine.handleAction(turn.playerId, 'raise', 10, true);
    const player = engine.getPlayers().find(p => p.playerId === turn.playerId)!;
    expect(player.isAllIn).toBe(false);
  });
});

// ============================================================================
// GameManager: live table behavior
// ============================================================================

describe('Live mode GameManager', () => {
  let gm: GameManager;
  let io: any;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(makeLiveConfig(), io, 'live-table');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function drainEventQueue() {
    for (let i = 0; i < 8; i++) vi.advanceTimersByTime(3100);
  }

  function startTwoPlayerGame() {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 50); // buy-in amount should be ignored in live mode
    gm.addPlayer(sock2, 'Bob', 75);
    gm.handleSitIn('sock-1');
    gm.handleSitIn('sock-2');
    gm.checkStartGame();
    return { sock1, sock2 };
  }

  it('players always sit with the virtual stack regardless of requested buy-in', () => {
    const { sock1 } = startTwoPlayerGame();
    const state = sock1.emit.mock.calls.find((c: any[]) => c[0] === S2C_PLAYER.PRIVATE_STATE)![1];
    expect(state.stack).toBe(LIVE_VIRTUAL_STACK);
  });

  it('does not run an action timer — nobody is auto-folded', () => {
    startTwoPlayerGame();
    drainEventQueue();
    const engine = (gm as any).handEngine;
    const actorBefore = engine.getCurrentActorId();
    expect(actorBefore).not.toBeNull();

    vi.advanceTimersByTime(120_000); // way past actionTimeSeconds

    expect(engine.getCurrentActorId()).toBe(actorBefore);
    expect(tableRoomEvents(io, S2C_TABLE.PLAYER_TIMER).length).toBe(0);
  });

  it('never offers Run It Twice', () => {
    const { sock1, sock2 } = startTwoPlayerGame();
    drainEventQueue();
    const engine = (gm as any).handEngine;

    // Both players declare all-in
    for (let i = 0; i < 2; i++) {
      const actorId = engine.getCurrentActorId();
      if (!actorId) break;
      const socketId = (gm as any).playerIdToSocketId.get(actorId);
      const actions = engine.getCurrentTurnInfo()?.availableActions ?? [];
      gm.handlePlayerAction(socketId, actions.includes('call') ? 'call' : 'raise', undefined, true);
      drainEventQueue();
    }

    const ritOffers = [...sock1.emit.mock.calls, ...sock2.emit.mock.calls]
      .filter((c: any[]) => c[0] === S2C_PLAYER.RIT_OFFER);
    expect(ritOffers.length).toBe(0);
    expect(tableRoomEvents(io, S2C_TABLE.SECOND_BOARD_DEALT).length).toBe(0);
    expect(tableRoomEvents(io, S2C_TABLE.HAND_RESULT).length).toBe(1);
  });

  it('resets stacks to the virtual stack at the start of every hand', () => {
    startTwoPlayerGame();
    drainEventQueue();
    const firstEngine = (gm as any).handEngine;
    expect(firstEngine.getPlayers().every((p: any) => p.startingStack === LIVE_VIRTUAL_STACK)).toBe(true);

    // Finish the hand: first actor folds
    const actorId = firstEngine.getCurrentActorId();
    const socketId = (gm as any).playerIdToSocketId.get(actorId);
    gm.handlePlayerAction(socketId, 'fold');
    drainEventQueue();

    // Next hand starts automatically; stacks are reset (winner is not richer)
    const secondEngine = (gm as any).handEngine;
    expect(secondEngine).not.toBeNull();
    expect((gm as any).handNumber).toBe(2);
    expect(secondEngine.getPlayers().every((p: any) => p.startingStack === LIVE_VIRTUAL_STACK)).toBe(true);
  });
});
