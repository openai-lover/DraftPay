import { createApp } from "./app";
import { readServiceConfig } from "./config";

const config = readServiceConfig();
const app = createApp(config.app);

app.listen(config.port, () => {
  console.log(
    `DraftPay x402 service listening on http://localhost:${config.port} (${config.app.mode} mode)`,
  );
});
