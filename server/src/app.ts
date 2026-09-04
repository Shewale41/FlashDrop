import express from "express";
import dropRoutes from "./routes/drop.routes.ts";

const app = express();

app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/drops", dropRoutes);

export default app;