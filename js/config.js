// Game constants
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const TILE_SIZE = 32;
const GRAVITY = 800;

// Player constants
const PLAYER_WALK_SPEED = 150;
const PLAYER_RUN_SPEED = 280;
const PLAYER_JUMP_VELOCITY = -420;
const PLAYER_DOUBLE_JUMP_VELOCITY = -350;
const PLAYER_MAX_HP = 100;
const PLAYER_MAX_TUNING = 100;
const PLAYER_LIVES = 3;
const PLAYER_INVINCIBILITY_TIME = 2000;

// Combat constants
const PUNCH_DAMAGE = 10;
const KICK_DAMAGE = 15;
const SWORD_DAMAGE = 25;
const TUNING_PUSH_DAMAGE = 20;
const KNOCKBACK_FORCE = 250;

// Enemy constants
const GRUNT_HP = 30;
const GRUNT_SPEED = 100;
const GRUNT_DETECT_RANGE = 200;
const GRUNT_ATTACK_RANGE = 40;
const GRUNT_DAMAGE = 8;

const MRSLEEP_HP = 80;
const MRSLEEP_SPEED = 180;

const MRWALL_HP = 150;
const MRWALL_SPEED = 80;
const MRWALL_CHARGE_SPEED = 300;

const MRHAND_HP = 120;
const MRHAND_SPEED = 150;

const MRBOOK_HP = 300;
const MRBOOK_SPEED = 120;

// Tuning constants
const TUNING_DRAIN_RATE = 25; // per second
const TUNING_RECHARGE_RATE = 15; // per second
const TUNING_PUSH_COST = 15;
const TUNING_PULL_COST = 15;
const TUNING_DEFLECT_COST = 20;
const TUNING_PLATFORM_COST = 30;
const TUNING_PLATFORM_DURATION = 4000;

// Water damage multiplier for Strangers
const WATER_DAMAGE_MULTIPLIER = 3;

// Combo system constants
const COMBO_WINDOW = 800; // ms to chain next hit
const COMBO_MAX_MULTIPLIER = 1.6; // max damage multiplier at 5 hits
const DODGE_SPEED = 350;
const DODGE_DURATION = 350;
const DODGE_INVULN_TIME = 250;
const DODGE_COOLDOWN = 600;
const COYOTE_TIME = 100; // ms grace period after leaving ground
const JUMP_BUFFER_TIME = 100; // ms input buffer before landing

// Colors (for placeholder graphics)
const COLORS = {
    MURDOCH_COAT: 0x2a2a3a,
    MURDOCH_SKIN: 0xf4c897,
    STRANGER_SKIN: 0xc8c8d0,
    STRANGER_COAT: 0x1a1a1a,
    TUNING_GLOW: 0x4488ff,
    HEALTH_BAR: 0x44cc44,
    TUNING_BAR: 0x4488ff,
    HEALTH_PICKUP: 0x44cc44,
    TUNING_PICKUP: 0x4488ff,
    MEMORY_FRAGMENT: 0xffcc44,
    PLATFORM: 0x555566,
    HAZARD: 0xff4444,
    BACKGROUND_DARK: 0x0a0a14,
    LAMP_LIGHT: 0xffaa44,
};
