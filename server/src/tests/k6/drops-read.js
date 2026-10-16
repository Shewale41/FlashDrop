
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const response = http.get(`${BASE_URL}/drops/drop_2`);

  check(response, {
    "status is 200": (r) => r.status === 200,
    "response contains drop ID": (r) =>
      r.json("id") === "drop_2",
  });

  sleep(1);
}
