/** Global constants for Kaninfarmen. */
export const TILE = 16;
export const MAP_W = 100;
export const MAP_H = 100;
export const ZOOM = 3;
export const GAME_W = 1280;
export const GAME_H = 720;

export const BORDER = 6; // forest border thickness in tiles (rows 0..5)
export const RING_PATH_W = 2; // ring path just inside the border

// Bunny tuning
export const BUNNY_BASE_SPEED = 96; // px/s
export const BUNNY_MAX_SPEED = 150;
export const BUNNY_RADIUS = 5;
export const TURN_TOLERANCE = 3; // px from tile centre for a clean turn
export const LATE_TURN_MAX = 11; // px past the opening where a late (grazing) turn still happens
export const LANE_SHIFT_INTENT_TIME = 1.6; // s a turn intent survives after a lane shift
export const BOOST_MULT = 1.45;
export const BOOST_TIME = 1.2; // s
export const BOOST_COOLDOWN = 4; // s

// Dizzy
export const DIZZY_TIME = 2.6; // s (real time)
export const DIZZY_TIMESCALE = 0.45;
export const DIZZY_BUNNY_MULT = 0.55;
export const DIZZY_FARMER_CHANCE = 0.45;

// Farmer
export const FARMER_SPEED = 84;
export const FARMER_CHASE_TIMEOUT = 13; // s
export const FARMER_GIVEUP_DIST = 30; // tiles
export const FARMER_CATCH_DIST = 9; // px
export const FIELD_ALARM_TIME = 4; // s in a carrot field before the farmer comes
export const FARMER_REPATH_MS = 300;

// Patrolling farmhands
export const PATROL_COUNT = 3;
export const PATROL_SPEED = 42;
export const PATROL_SIGHT_TILES = 8;
export const PATROL_CHASE_TIMEOUT = 8; // s
export const PATROL_GIVEUP_DIST = 16; // tiles
export const PATROL_MIN_SPAWN_DIST = 25; // tiles from the bunny at start

// Scoring
export const CARROT_PATH_POINTS = 10;
export const CARROT_FIELD_POINTS = 15;
export const COMBO_WINDOW = 2.2; // s
export const MULTIPLIERS = [1, 2, 3, 5];

export const START_LIVES = 3;
export const INVULN_TIME = 1.6; // s after losing a life

export const FOG_RADIUS_TILES = 9; // minimap reveal radius around the bunny

export const HIGHSCORE_KEY = 'kaninfarmen.highscore.v1';
