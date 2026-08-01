import app from "./index";
import { readServiceConfig } from "./config";

const config = readServiceConfig();

app.listen(config.port, () => {
  console.log(
    `DraftPay x402 service listening on http://localhost:${config.port} (${config.app.mode} mode)`,
  );
});
