const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Keep Metro from crawling backend-only / generated folders. That speeds up
// cold starts and QR-scan loads on physical devices over LAN.
const ignorePatterns = [
  /[\\/]src[\\/]api[\\/]uploads[\\/].*/,
  /[\\/]src[\\/]api[\\/]seeds[\\/].*/,
  /[\\/]src[\\/]api[\\/]data[\\/].*/,
  /[\\/]tests[\\/].*/,
  /[\\/]\.git[\\/].*/,
  /[\\/]server\.log$/,
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...existingBlockList, ...ignorePatterns]
  : existingBlockList
    ? [existingBlockList, ...ignorePatterns]
    : ignorePatterns;

config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
