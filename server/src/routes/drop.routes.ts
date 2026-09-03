import { Router } from "express";
import type { Drop } from "../types/drop.ts";

const router = Router();

const drops: Drop[] = [
  {
    id: "drop_1",
    name: "Limited Sneakers",
    availableInventory: 500,
  },
  {
    id: "drop_2",
    name: "Gaming Console",
    availableInventory: 100,
  },
  {
    id: "drop_3",
    name: "Collector Edition",
    availableInventory: 50,
  },
];

router.get("/", (_req, res) => {
  res.json(drops);
});

router.get("/:id", (req, res) => {
  const id = req.params.id;

  const result = drops.find((drop) => drop.id === id);

  if (result) {
    res.json(result);
    return;
  }

  console.log("Drop doesn't exist");
  res.status(404).json({
    message: "Resource doesn't exist",
  });
});

export default router;