
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    drops_read_baseline: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    checks: ["rate>0.99"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const response = http.get(`${BASE_URL}/drops/drop_2`, {
    tags: { endpoint: "get_drop_by_id" },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "response contains drop ID": (r) =>
      r.status === 200 && r.json("id") === "drop_2",
  });

  sleep(1);
}
