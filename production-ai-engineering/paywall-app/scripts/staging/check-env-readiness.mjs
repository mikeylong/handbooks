import { checkStagingEnvironment } from "./stripe-staging.mjs";

process.stdout.write(`${JSON.stringify(checkStagingEnvironment(), null, 2)}\n`);
