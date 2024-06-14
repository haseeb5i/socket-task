export type User = {
  wallet: string;
  role: "admin" | "user";
};

export type JwtPayload = {
  sessionId?: string;
  role: "admin" | "user";
  wallet: string;
};

export type GameEvent = {
  type: string;
  body: string;
  id?: string;
  duration?: number;
};

export type SessionTask = {
  id: string;
  body: string;
  timeInSec: number;
};

export type Session = {
  id: string;
  startsAt: number;
  endsAt: number;
  title: string;
  description?: string;
  tasks: SessionTask[];
};
