import { Router } from "express";

import { getData } from "../services/data.service.js";
import { DataQueryValidationError } from "../types/data.js";

export const dataRouter = Router();

dataRouter.post("/data", async (req, res, next) => {
  try {
    const data = await getData(req.body as unknown);
    res.json(data);
  } catch (error) {
    if (error instanceof DataQueryValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});
