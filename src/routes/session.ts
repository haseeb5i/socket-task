import express from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { v4 as uuidv4 } from "uuid";

import { authenticate } from "../middlewares";
import { io } from "../socket";
import { GameEvent, Session } from "../interfaces/models";
import { walletClient } from "../wallet";
import { parseEther } from "viem";

export const sessions: Session[] = [];
export const activeSession = {
  id: "",
  description: "",
  endsAt: 0,
  activeTask: "",
  taskEndsAt: 0,
};
export const players = new Map<string, Record<string, string>>();
const timerMap = new Map<string, NodeJS.Timeout[]>();

const router = express.Router();

// make sure only admin can access this route
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    throw new Error("Unauthorized");
  }

  next();
});

const createScheduleSchema = z.object({
  startsAt: z.number(),
  title: z.string(),
  description: z.string().optional(),
  tasks: z.array(
    z.object({
      body: z.string(),
      timeInSec: z.number(),
    })
  ),
});

router.post("/", (req, res, next) => {
  const parsedData = createScheduleSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400);
    return next(fromError(parsedData.error));
  }

  const body = parsedData.data;
  if (body.startsAt < Date.now()) {
    res.status(400);
    return next(new Error("Start time should be in the future"));
  }

  const duration = body.tasks.reduce((acc, task) => acc + task.timeInSec, 0);
  const endTime = duration * 1000 + body.startsAt;

  const session: Session = {
    id: uuidv4(),
    startsAt: body.startsAt,
    endsAt: endTime,
    title: body.title,
    description: body.description,
    tasks: body.tasks.map((task, index) => ({
      id: (index + 1).toString(),
      body: task.body,
      timeInSec: task.timeInSec,
    })),
  };

  sessions.push(session);
  const timerIds = scheduleGameSession(session);
  // TODO: clear the timers on session update
  timerMap.set(session.id, timerIds);

  res.send({
    sessionId: session.id,
    message: "Session scheduled successfully",
  });
});

const updateScheduleSchema = z.object({
  id: z.string().uuid(),
  startsAt: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

router.put<{}, { message: string }>("/", (req, res, next) => {
  const parsedData = updateScheduleSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400);
    return next(fromError(parsedData.error));
  }

  const session = sessions.find((session) => session.id === body.id);
  if (!session) {
    res.status(404);
    return next(new Error("Session not found"));
  }

  // TODO: update the session
  const body = parsedData.data;

  res.send({
    message: "Session updated successfully",
  });
});

router.get("/", (req, res) => {
  res.send(sessions);
});

function broadcastMessage(room: string, data: GameEvent) {
  io.to(room).emit("gameEvent", data);
}

function scheduleGameSession(session: Session) {
  // start game 1 second before the start time
  const startInterval = session.startsAt - Date.now() - 1000;
  const endInterval = session.endsAt - Date.now();

  const startTimerId = setTimeout(() => {
    console.log("Game session started");

    activeSession.id = session.id;
    activeSession.description = session.title;
    activeSession.endsAt = session.endsAt;

    broadcastMessage(session.id, {
      type: "SESSION_STARTED",
      body: "Game session has started",
      duration: endInterval,
    });

    scheduleGameTasks(session);
  }, startInterval);

  const endTiemrId = setTimeout(() => {
    console.log("Game session ended");

    activeSession.id = "";
    activeSession.description = "";
    activeSession.activeTask = "";
    activeSession.taskEndsAt = 0;
    activeSession.endsAt = 0;

    console.log(players);
    // TODO: check answers and reward players
    if (players.size > 0) {
      // rewarding the first player
      rewardPlayer(players.keys().next().value);
    }
    players.clear();

    broadcastMessage(session.id, {
      type: "SESSION_ENDED",
      body: "Game session has ended",
    });
  }, endInterval);

  return [startTimerId, endTiemrId];
}

function scheduleGameTasks(session: Session) {
  let taskStartTime = session.startsAt;

  session.tasks.forEach((task) => {
    const taskStartInterval = taskStartTime - Date.now();
    // ending task 1 second before the next task starts
    const taskEndInterval = taskStartInterval + (task.timeInSec - 1) * 1000;

    setTimeout(() => {
      console.log(`Task ${task.id} started`);

      activeSession.activeTask = task.id;
      activeSession.taskEndsAt = Date.now() + taskEndInterval;

      broadcastMessage(session.id, {
        id: task.id,
        type: "TASK_STARTED",
        body: task.body,
        duration: task.timeInSec,
      });
    }, taskStartInterval);

    setTimeout(() => {
      console.log(`Task ${task.id} ended`);
      broadcastMessage(session.id, {
        type: "TASK_ENDED",
        body: task.body,
      });
    }, taskEndInterval);

    taskStartTime += task.timeInSec * 1000;
  });
}

async function rewardPlayer(wallet: `0x${string}`) {
  const hash = await walletClient.sendTransaction({
    to: wallet,
    value: parseEther("0.01"),
  });
  console.log("rewarded", hash);
  io.to(`users:${wallet}`).emit("gameEvent", {
    type: "REWARD",
    body: `You won 0.01 ETH! Transaction hash: ${hash}`,
  });
}

export default router;
