// // import {
// //   runOrphanDetector,
// // } from "./handlers/orphan-detector.job.js";


// // async function main() {

// //   const result =
// //     await runOrphanDetector();

// //   console.dir(
// //     result,
// //     {
// //       depth: null,
// //     },
// //   );
// // }


// // main()
// //   .catch(console.error)
// //   .finally(() => process.exit(0));

// import {
//   runIdempotencyCleanup,
// } from "./handlers/idempotency-cleanup.job.js";


// async function main() {

//   const result =
//     await runIdempotencyCleanup();

//   console.dir(
//     result,
//     {
//       depth: null,
//     },
//   );
// }


// main()
//   .catch(console.error)
//   .finally(() => process.exit(0));

import {
  runAccountSanity,
} from "./handlers/account-sanity.job.js";


async function main() {

  const result =
    await runAccountSanity();

  console.dir(
    result,
    {
      depth: null,
    },
  );

}


main()
  .catch(console.error)
  .finally(() => process.exit(0));