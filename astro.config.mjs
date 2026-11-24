import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog.xwxsparkle.com",
  redirects: {
    "/zh": "/",
    "/zh/interests": "/interests/",
    "/zh/explorations": "/explorations/",
    "/zh/thoughts": "/thoughts/",
    "/zh/etc": "/etc/",
    "/zh/explorations/network": "/explorations/network/",
    "/interests/network": "/explorations/network/",
    "/zh/interests/network": "/explorations/network/",
  },
});
