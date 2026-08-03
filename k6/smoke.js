//smoke test passed

import http from "k6/http";
import { check } from "k6";

export const options = {
    vus: 1,
    iterations: 1,
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
        idempotencyKey: `smoke-${Date.now()}`,
        platformFee: "10",
        tax: "18",
    };

    console.log("Sending Request:");
    console.log(JSON.stringify(body));

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

    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);

    check(res, {
        "Status is 200": (r) => r.status === 201,
    });

    if (res.status === 200) {
        const json = res.json();

        check(json, {
            "Has transactionId": (j) => j.transactionId !== undefined,
            "Payment successful": (j) => j.status === "SUCCESS",
        });
    }
}