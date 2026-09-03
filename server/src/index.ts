import express from "express";

const app = express();

type Drop = {
  id: string;
  name: string;
  availableInventory: number;
};

const drops:Drop[] = [
  {
    "id": "drop_1",
    "name": "Limited Sneakers",
    "availableInventory": 500
  },
  {
    "id": "drop_2",
    "name": "Gaming Console",
    "availableInventory": 100
  },
  {
    "id": "drop_3",
    "name": "Collector Edition",
    "availableInventory": 50
  }
];

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/drops",(_req,res)=>{
    res.json(drops);
})

app.listen(3000, () => {
  console.log("FlashDrop API successfully running on http://localhost:3000");
});