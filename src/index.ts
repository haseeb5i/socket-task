import { createServer } from "node:http";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import express, { NextFunction, Response } from "express";
import "dotenv/config";

import * as middlewares from "./middlewares";
import { io } from "./socket";
import { v1Router } from "./routes";
import { JwtPayload } from "./interfaces/models";

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/v1", v1Router);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

const server = createServer(app);
io.attach(server);

io.engine.use((req: any, res: Response, next: NextFunction) => {
  console.log("reveived request");
  const isHandshake = req._query.sid === undefined;
  if (!isHandshake) {
    return next();
  }

  middlewares.authenticate(req, res, next);
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log("Listening on http://localhost:8080");
});

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
