import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import categoriesRouter from "./routes/categories";
import devRequestersRouter from "./routes/devRequesters";
import relatedSystemsRouter from "./routes/relatedSystems";
import ticketsRouter from "./routes/tickets";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", healthRouter);
app.use("/api", categoriesRouter);
app.use("/api/dev-requesters", devRequestersRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/tickets", ticketsRouter);

export default app;