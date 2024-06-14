import { Server } from "socket.io";
import { JwtPayload, GameEvent } from "./interfaces/models";
import { sessions, activeSession, players } from "./routes/session";

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>({ cors: { origin: "*" } });

io.on("connection", (socket) => {
  if (!("user" in socket.request)) {
    return;
    // throw new Error("No user in socket request");
  }

  const user = socket.request.user as JwtPayload;
  if (!user.sessionId) {
    return;
    // throw new Error("No session id in user");
  }

  const gameSession = sessions.find((session) => session.id === user.sessionId);
  // shouldn't happen if using a database
  if (!gameSession) {
    return;
    // throw new Error("Session not found");
  }

  if (gameSession.startsAt > Date.now()) {
    socket.emit("joinSession", {
      message: "Joined! session will start soon...",
    });
  } else if (gameSession.endsAt < Date.now()) {
    socket.emit("joinSession", { message: "Session has ended" });
  } else {
    socket.emit("joinSession", { message: "Session in progress" });

    const activeTask = gameSession.tasks.find(
      (task) => task.id === activeSession.activeTask
    );
    socket.emit("gameEvent", {
      type: "TASK_ACTIVE",
      body: activeTask?.body ?? "", // shouldn't be empty
    });
  }

  socket.join(user.sessionId);
  socket.join(`users:${user.wallet}`); // for private messages
  io.to(user.sessionId).emit("joinSession", {
    message: `${user.wallet} joined the session`,
  });

  socket.on("taskAnswer", (event) => {
    console.log("answer by", event);

    if (event.id !== activeSession.activeTask) return;

    const playerAnswers = players.get(user.wallet) ?? {};
    playerAnswers[event.id] = event.answer;
    players.set(user.wallet, playerAnswers);
  });

  socket.on("disconnect", () => {
    // socket.leave(user.sessionId); // do we need this?
    console.log("user disconnected");
    io.of(gameSession.id).emit("joinSession", {
      message: `${user.wallet} left the session`,
    });
  });
});

interface ServerToClientEvents {
  joinSession: (event: { message: string }) => void;
  gameEvent: (event: GameEvent) => void;
}

interface ClientToServerEvents {
  taskAnswer: (event: { id: string; answer: string }) => void;
}

interface InterServerEvents {}

interface SocketData {}

export { io };
