import http from "k6/http";
import { check } from "k6";

export const options = {
    vus: 100,
    iterations: 500,
};

const BASE_URL = __ENV.BASE_URL;
const TOKEN = __ENV.TOKEN;
const TO_ACCOUNT = __ENV.TO_ACCOUNT;

export default function () {

    const body = {
        toAccountId: TO_ACCOUNT,
        amount: "100",
        transactionType: "TRANSFER",
        lockingStrategy: "PESSIMISTIC",
        idempotencyKey: `seq-${Date.now()}-${Math.random()}`,
    };

    if (Math.random() < 0.5) {
        body.platformFee = "10";
        body.tax = "18";
    }

    const res = http.post(
        `${BASE_URL}/payments`,
        JSON.stringify(body),
        {
            headers: {
                "Content-Type": "application/json",
                token: TOKEN,
            },
        }
    );

    check(res, {
        "HTTP 200": (r) => r.status === 201,
    });

    if (res.status !== 201) {
        console.log(res.body);
    }
}