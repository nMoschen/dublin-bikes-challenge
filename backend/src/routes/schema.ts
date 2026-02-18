import { Router } from "express";

import { getSchema } from "../services/schema.service.js";

export const schemaRouter = Router();

schemaRouter.get("/schema", async (_req, res, next) => {
  try {
    const schema = await getSchema();
    res.json(schema);
  } catch (error) {
    next(error);
  }
});
