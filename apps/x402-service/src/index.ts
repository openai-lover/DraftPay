import { createApp } from "./app.js";
import { readServiceConfig } from "./config.js";

const config = readServiceConfig();

export default createApp(config.app);
