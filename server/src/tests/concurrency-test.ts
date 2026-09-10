import "dotenv/config";

const token = "removed the jwt haaha (you can add yours here)";

const makeReservation = async (requestName: string) => {
  console.log(`${requestName}: sending request`);

  const response = await fetch("http://localhost:3000/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dropId: "drop_1",
    }),
  });

  const data = await response.json();

  console.log(`${requestName}:`, response.status, data);

  return {
    status: response.status,
    data,
  };
};

const results = await Promise.all([
  makeReservation("Request A"),
  makeReservation("Request B"),
]);

console.log("\nFinal results:");
console.log(results);