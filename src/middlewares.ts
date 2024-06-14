import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { ErrorResponse } from "./interfaces/response";

export function notFound(req: Request, res: Response, next: NextFunction) {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    // res.status(401);
    return next(new Error("no token"));
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    // res.status(401);
    return next(new Error("invalid token"));
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      console.log("err", err);
      // res.status(401);
      return next(new Error("invalid token"));
    }
    // TODO: validate the decoded token schema
    Object.assign(req, { user: decoded });
    next();
  });
}
