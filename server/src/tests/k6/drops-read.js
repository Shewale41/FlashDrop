
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "30s",

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    checks: ["rate>0.99"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const response = http.get(
    `${BASE_URL}/drops?limit=20&offset=0`
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
    "returns at most 20 drops": (r) =>
      r.status === 200 && r.json("data").length <= 20,
    "pagination metadata is present": (r) =>
      r.status === 200 &&
      r.json("pagination").limit === 20 &&
      r.json("pagination").offset === 0,
  });

  sleep(2);
}
