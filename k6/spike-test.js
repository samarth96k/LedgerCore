import http from "k6/http";
import { check } from "k6";

/*
|--------------------------------------------------------------------------
| TEST CONFIGURATION
|--------------------------------------------------------------------------
|
| Start small:
|   5 concurrent VUs
|   100 total payment transactions
|
| setup() logs all users in ONCE before the actual load test starts.
|
*/

export const options = {
  scenarios: {
    spike_test: {
      executor: "ramping-vus",

      startVUs: 1,

      stages: [
        // Normal traffic
        { duration: "5s", target: 10 },

        // SUDDEN SPIKE
        { duration: "2s", target: 100 },

        // Keep spike active
        { duration: "15s", target: 100 },

        // Sudden traffic drop
        { duration: "5s", target: 10 },
        { duration: "7s", target: 100 },
        { duration: "5s", target: 10 },

        // Check recovery
        { duration: "20s", target: 10 },
      ],

      gracefulRampDown: "10s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

const BASE_URL = "http://localhost:3000";
const LOGIN_URL = "http://localhost:3000/api/user/login";

const PASSWORD = "root@QWERTY1";

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
|
| accountId = USER_WALLET account
| email     = login email
|
| IMPORTANT:
| These emails are based on the generation logic we used earlier.
|
*/

const USERS = [
  {
    email: "samarth@gmail.com",
    name: "Samarth Bansal",
    id: "8f553796-3a08-4fc7-a8e2-8f653f3221db",
  },
  {
    email: "priyanshu.goel@gmail.com",
    name: "Priyanshu Goel",
    id: "712f474e-5049-4593-9b96-f9afe1c4f51b",
  },
  {
    email: "tusharsaxena@gmail.com",
    name: "Tushar Saxena",
    id: "ad07f1a2-c0ba-42b7-a91d-508fcfc69222",
  },
  {
    email: "anurag@gmail.com",
    name: "Anurag Arora",
    id: "40516354-054e-41c1-a36e-0df93e8eb353",
  },
  {
    email: "john.sharma@gmail.com",
    name: "John Sharma",
    id: "335aa66c-2de2-4b16-a885-679ef22ad38a",
  },
  {
    email: "janeverma@gmail.com",
    name: "Jane Verma",
    id: "abd21201-42a5-421c-b75e-8ea7a223bdf9",
  },
  {
    email: "yash@gmail.com",
    name: "Yash Gupta",
    id: "85403ff5-db37-4d57-8e71-7e79c28445fb",
  },
  {
    email: "abhineeti.agarwal@gmail.com",
    name: "Abhineeti Agarwal",
    id: "14d06be6-8ea8-4f49-b6a4-a436e4d8b62f",
  },
  {
    email: "navyasingh@gmail.com",
    name: "Navya Singh",
    id: "139c9fa0-bee3-4e23-a480-eb3cabf8f6b2",
  },
  {
    email: "yosha@gmail.com",
    name: "Yosha Yadav",
    id: "ae847306-dc82-44cf-97fe-aa26ac552b66",
  },
  {
    email: "aditya.sharma@gmail.com",
    name: "Aditya Sharma",
    id: "a412c563-ce39-411b-b2f5-f77e7edcf138",
  },
  {
    email: "jinanshverma@gmail.com",
    name: "Jinansh Verma",
    id: "1e528295-ae78-4f56-9464-385567c5490e",
  },
  {
    email: "pratyaksh@gmail.com",
    name: "Pratyaksh Gupta",
    id: "77d3cf69-bd54-4082-9586-537f0df6214b",
  },
  {
    email: "ishaan.agarwal@gmail.com",
    name: "Ishaan Agarwal",
    id: "2301e07f-feeb-4d5c-a646-5ca122b100c5",
  },
  {
    email: "snehsingh@gmail.com",
    name: "Sneh Singh",
    id: "65058ec3-0ac0-41e5-82a3-c9328ea47cbe",
  },
  {
    email: "yadav@gmail.com",
    name: "Yadav Yadav",
    id: "40321a9c-b558-42b6-9daa-02ba1a7582bb",
  },
  {
    email: "sharma.patel@gmail.com",
    name: "Sharma Patel",
    id: "744d33fa-48b8-46d5-a72f-4d8b032403c2",
  },
  {
    email: "aakashjain@gmail.com",
    name: "Aakash Jain",
    id: "a7bb74c3-a4c0-4f22-8231-fd68fda06e61",
  },
  {
    email: "priyavrat@gmail.com",
    name: "Priyavrat Khanna",
    id: "a82eef0e-2750-4396-90be-7b766d63e866",
  },
  {
    email: "ayush.kapoor@gmail.com",
    name: "Ayush Kapoor",
    id: "4f5e520b-794d-4c21-90e1-7b5aca2bd5ea",
  },
  {
    email: "pranavmalhotra@gmail.com",
    name: "Pranav Malhotra",
    id: "17862f54-4844-4f2e-950d-02ba1bab8d45",
  },
  {
    email: "jenny.patel@gmail.com",
    name: "Jenny Patel",
    id: "4b85db5a-3083-46d0-bd5e-b75e1c8e9889",
  },
  {
    email: "jiajain@gmail.com",
    name: "Jia Jain",
    id: "79edbf7d-dc8a-4e96-a915-0f533f2dd510",
  },
  {
    email: "vanshika@gmail.com",
    name: "Vanshika Khanna",
    id: "9a4951e8-6d9e-47e7-a4f5-4bf9782faa62",
  },
  {
    email: "aarushi.kapoor@gmail.com",
    name: "Aarushi Kapoor",
    id: "9a25308a-be65-471b-9a74-85d9e9f9a341",
  },
];

/*
|--------------------------------------------------------------------------
| SETUP
|--------------------------------------------------------------------------
|
| Runs ONCE before VUs start.
|
| Login all 25 users and collect their JWTs.
|
*/

export function setup() {
  console.log("==========================================");
  console.log("Logging in load-test users...");
  console.log("==========================================");

  const authenticatedUsers = [];

  for (const user of USERS) {
    const payload = JSON.stringify({
      email: user.email,
      password: PASSWORD,
    });

    const response = http.post(LOGIN_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      console.error(`LOGIN FAILED: ${user.email} | HTTP ${response.status}`);

      console.error(response.body);

      continue;
    }

    let json;

    try {
      json = response.json();
    } catch (error) {
      console.error(`Invalid JSON returned while logging in ${user.email}`);

      continue;
    }

    /*
     * Supports common response structures:
     *
     * { token: "..." }
     *
     * { accessToken: "..." }
     *
     * { data: { token: "..." } }
     */

    const token =
      json.token || json.accessToken || (json.data && json.data.token);

    if (!token) {
      console.error(`TOKEN NOT FOUND: ${user.email}`);

      console.error(response.body);

      continue;
    }

    authenticatedUsers.push({
      name: user.name,
      email: user.email,
      accountId: user.id,
      token: token,
    });

    console.log(`Logged in: ${user.email}`);
  }

  console.log("==========================================");
  console.log(
    `Successfully authenticated ${authenticatedUsers.length}/${USERS.length} users`,
  );
  console.log("==========================================");

  if (authenticatedUsers.length === 0) {
    throw new Error("No users could be authenticated. Stopping load test.");
  }

  return {
    users: authenticatedUsers,
  };
}

/*
|--------------------------------------------------------------------------
| RANDOM USER
|--------------------------------------------------------------------------
*/

function randomUser(users) {
  return users[Math.floor(Math.random() * users.length)];
}

/*
|--------------------------------------------------------------------------
| RANDOM AMOUNT
|--------------------------------------------------------------------------
|
| ₹1 - ₹100
|
| Starting small prevents wallets from immediately running out of money.
|
*/

function randomAmount() {
  return Math.floor(Math.random() * 100) + 1;
}

/*
|--------------------------------------------------------------------------
| UNIQUE IDEMPOTENCY KEY
|--------------------------------------------------------------------------
*/

function createIdempotencyKey() {
  return (
    `k6-${__VU}-${__ITER}-` +
    `${Date.now()}-` +
    `${Math.floor(Math.random() * 1000000000)}`
  );
}

/*
|--------------------------------------------------------------------------
| MAIN LOAD TEST
|--------------------------------------------------------------------------
*/

export default function (data) {
  const users = data.users;

  /*
   * Sender and receiver are selected independently.
   *
   * Therefore:
   *
   * sender === receiver
   *
   * IS intentionally possible.
   */

  const sender = randomUser(users);
  const receiver = randomUser(users);

  const body = {
    toAccountId: receiver.accountId,

    amount: String(randomAmount()),

    transactionType: "TRANSFER",

    lockingStrategy: "PESSIMISTIC",

    idempotencyKey: createIdempotencyKey(),
  };

  /*
   * Roughly 50% of transactions also contain
   * platform fee + tax.
   */

  if (Math.random() < 0.5) {
    body.platformFee = "10";
    body.tax = "18";
  }

  const response = http.post(`${BASE_URL}/payments`, JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",

      /*
       * Sender's JWT.
       */
      token: sender.token,
    },

    tags: {
      endpoint: "transfer",
    },
  });

  /*
    |--------------------------------------------------------------------------
    | VALIDATE RESPONSE
    |--------------------------------------------------------------------------
    */

  const success = check(response, {
    "payment HTTP 201": (r) => r.status === 201,
  });

  /*
   * Print ONLY failed transactions.
   *
   * Otherwise k6 console output becomes enormous.
   */

  if (!success) {
    console.error("==========================================");

    console.error("PAYMENT FAILED");

    console.error(`Sender   : ${sender.name}`);

    console.error(`Receiver : ${receiver.name}`);

    console.error(`Same wallet: ${sender.accountId === receiver.accountId}`);

    console.error(`Amount   : ${body.amount}`);

    console.error(`HTTP     : ${response.status}`);

    console.error(`Response : ${response.body}`);

    console.error("==========================================");

    return;
  }

  /*
    |--------------------------------------------------------------------------
    | CHECK RESPONSE BODY
    |--------------------------------------------------------------------------
    */

  try {
    const json = response.json();

    check(json, {
      "transactionId exists": (j) => j.transactionId !== undefined,

      "transaction SUCCESS": (j) => j.status === "SUCCESS",
    });
  } catch (error) {
    console.error(`Invalid JSON response: ${response.body}`);
  }
}
