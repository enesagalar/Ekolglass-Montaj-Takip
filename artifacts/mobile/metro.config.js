const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Resolve xlsx to the standalone mini build (no Node.js dependencies)
// This prevents bundling errors in Expo Go / React Native
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "xlsx") {
    return {
      filePath: require.resolve("xlsx/dist/xlsx.mini.min.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
