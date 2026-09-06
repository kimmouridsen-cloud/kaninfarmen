import Phaser from 'phaser';

/** Shared emitter between GameScene and HudScene. */
export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  SCORE: 'score:changed', // (score, multiplier)
  LIVES: 'lives:changed', // (lives)
  DIZZY: 'dizzy', // (active: boolean)
  MESSAGE: 'message', // (text, style)
  FARMER: 'farmer', // (state)
  FIELD_ALARM: 'field:alarm', // (fraction 0..1, or -1 when leaving)
  SEEN: 'seen', // (x, y, r) tiles revealed
  BOOST: 'boost', // (ready: boolean)
  CARROTS: 'carrots', // (count)
  GAME_OVER: 'gameover',
  POSITIONS: 'positions', // (bunnyTile, farmerTile|null)
} as const;
