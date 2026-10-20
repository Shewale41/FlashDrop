import express from "express";
import dropRoutes from "./routes/drop.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import reservationRoutes from "./routes/reservation.routes.ts"
import { rateLimit } from "./middleware/rateLimit.ts";

const app = express();

app.use(express.json());
app.use("/drops",rateLimit, dropRoutes);
app.use("/auth", authRoutes);
app.use('/reservations',reservationRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});



export default app;