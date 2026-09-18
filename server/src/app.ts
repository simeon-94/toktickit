import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import categoriesRouter from "./routes/categories";
import relatedSystemsRouter from "./routes/relatedSystems";
import ticketsRouter from "./routes/tickets";
import attachmentsRouter from "./routes/attachments";
import authRouter from "./routes/auth";

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api", healthRouter);
app.use("/api", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/auth", authRouter);

export default app;