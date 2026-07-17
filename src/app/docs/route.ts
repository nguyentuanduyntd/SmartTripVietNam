import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  theme: "purple",
  layout: "modern",
  defaultHttpClient: {
    targetKey: "js",
    clientKey: "fetch",
  },
  url: "/openapi.json",
});
