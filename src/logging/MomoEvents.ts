import type { MomoErrorType } from './error/MomoErrorType';

export interface MomoEventData {
  [key: string]: boolean | number | string | undefined;
}

export interface MomoEvent {
  message: string;
  data?: MomoEventData;
}

export interface MomoErrorEvent {
  message: string;
  type: MomoErrorType;
  data?: MomoEventData;
  error?: unknown;
}

export type MomoEvents = {
  debug: (info: MomoEvent) => void;
  error: (error: MomoErrorEvent) => void;
};
