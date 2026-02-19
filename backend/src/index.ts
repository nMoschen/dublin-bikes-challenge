import cors from "cors";
import express, { ErrorRequestHandler } from "express";

import { dataRouter } from "./routes/data.routes.js";
import { schemaRouter } from "./routes/schema.routes.js";

const app = express();
const port = process.env.PORT ?? "9001";

app.use(cors());
app.use(express.json());
app.use(dataRouter);
app.use(schemaRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({ error: message });
};
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
