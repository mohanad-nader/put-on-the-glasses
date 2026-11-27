export interface FrameConfig {
  noKeyboard: boolean;
  tremor: { on: boolean; amp: number };
  screenReader: boolean;
  tabOrder: boolean;
}

export interface SrItem {
  id: number;
  role: string;
  name: string;
  level?: number;
  states: string[];
  flags: string[];
  tag: string;
}

export interface TabInfo {
  count: number;
  warnings: { n: number; reason: string; label: string }[];
}

export interface ProxyError {
  code: string;
  message: string;
}