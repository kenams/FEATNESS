const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "apps/mobile/.env") });
dotenv.config({
  path: path.resolve(__dirname, "apps/mobile/.env.local"),
  override: true,
});

const mobileConfig = require("./apps/mobile/app.json");

module.exports = () => mobileConfig.expo;
