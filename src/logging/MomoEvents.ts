import { MomoErrorType } from './error/MomoErrorType';

export interface MomoEventData {
  [key: string]: boolean | number | string;
}

export interface MomoEvent {
  message: string;
  data?: MomoEventData;
}

export interface MomoErrorEvent {
  message: string;
  type: MomoErrorType;
  data?: MomoEventData;
  error?: Error;
}

export interface MomoEvents {
  debug: (info: MomoEvent) => void;
  error: (error: MomoErrorEvent) => void;
}
