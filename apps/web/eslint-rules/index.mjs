// Project lint rules, registered in eslint.config.mjs as the `tts` plugin. Tests: tests/unit/eslint-rules.test.ts.
import apiRouteWrapper from "./api-route-wrapper.mjs";
import noServerOnlyInClient from "./no-server-only-in-client.mjs";

const plugin = {
  meta: { name: "tts" },
  rules: {
    "api-route-wrapper": apiRouteWrapper,
    "no-server-only-in-client": noServerOnlyInClient,
  },
};

export default plugin;
