export enum Feature {
  LastMove = 'last_move',
  Check = 'check',
  Msg = 'msg',
  Side = 'side',
  SetState = 'set_state',
  Option = 'option',
}

export enum Variant {
  Standard = "standard",
  Chess960 = "chess_960",
  ThreeCheck = "3_check",
  Atomic = "atomic",
  KingOfTheHill = "king_of_the_hill",
  AntiChess = "anti_chess",
  Horde = "horde",
  RacingKings = "racing_kings",
  CrazyHouse = "crazy_house",
}

export enum Command {
  Ok = 'ok',
  Nok = 'nok',
  Feature = 'feature',
  Variant = 'variant',
  SetVariant = 'set_variant',
  Begin = 'begin',
  State = 'state',
  Sync = 'sync',
  Unsync = 'unsync',
  UnsyncSetible = 'unsync_setible',
  End = 'end',
  Move = 'move',
  Promote = 'promote',
  Err = 'err',
  LastMove = 'last_move',
  Check = 'check',
  Msg = 'msg',
  Side = 'side',
  SetState = 'set_state',
  OptionsBegin = 'options_begin',
  OptionsEnd = 'options_end',
  OptionsReset = 'options_reset',
  Option = 'option',
  SetOption = 'set_option',
}

export enum EndReason {
  Undefined = 'undefined',
  Checkmate = 'checkmate',
  Draw = 'draw',
  Timeout = 'timeout',
  Resign = 'resign',
  Abort = 'abort',
}

export enum Side {
  White = 'w',
  Black = 'b',
  Both = '?'
}

export enum OptionType {
  Bool = 'bool',
  Enum = 'enum',
  Str = 'str',
  Int = 'int',
  Float = 'float',
}

export enum BoolOptionValue {
  True = 'true',
  False = 'false',
}