import express from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { verifyMessage } from "viem";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../interfaces/models";

const router = express.Router();

const registerSchema = z.object({
  walletAddress: z.string().startsWith("0x"),
  signature: z.string().startsWith("0x"),
  // combing login and session register in one step
  sessionId: z.string().uuid().optional(),
});

const adminWallets = ["0x23646afb2c56069651206cf5bc4066431e32f2a5"];

router.post("/register", async (req, res, next) => {
  const parsedData = registerSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400);
    return next(fromError(parsedData.error));
  }

  const body = parsedData.data;
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address: body.walletAddress as `0x${string}`,
      message: "hello world",
      signature: body.signature as `0x${string}`,
    });
  } catch (error) {
    console.error(error);
  }

  if (!isValid) {
    res.status(401);
    return next(new Error("Invalid signature"));
  }

  body.walletAddress = body.walletAddress.toLowerCase();
  const userPayload: JwtPayload = {
    sessionId: body.sessionId,
    role: adminWallets.includes(body.walletAddress) ? "admin" : "user",
    wallet: body.walletAddress,
  };

  res.send({
    message: "You are registered successfully",
    authToken: jwt.sign(userPayload, process.env.JWT_SECRET!),
  });
});

export default router;
