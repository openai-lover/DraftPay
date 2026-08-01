import { createApp } from "./app";
import { readServiceConfig } from "./config";

const config = readServiceConfig();

export default createApp(config.app);
