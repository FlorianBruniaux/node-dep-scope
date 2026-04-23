// @ts-nocheck — fixture file
export default {
  experimental: {
    turbo: {
      rules: {
        "*.svg": { loaders: ["@svgr/webpack"], as: "*.js" },
      },
    },
  },
};
