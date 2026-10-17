
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const allowedRequests = new Counter("allowed_requests");
const rejectedRequests = new Counter("rejected_requests");

export const options = {
  vus: 1,
  duration: "10s",
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const response = http.get(`${BASE_URL}/drops/drop_2`);

  if (response.status === 200) {
    allowedRequests.add(1);
  } else if (response.status === 429) {
    rejectedRequests.add(1);
  }

  check(response, {
    "request was allowed or rate limited": (r) =>
      r.status === 200 || r.status === 429,
  });

  sleep(0.1);
}
