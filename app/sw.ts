/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

const routes: (PrecacheEntry)[] = [
  { url: "/", revision: crypto.randomUUID() }, //TODO: find a better revision generation method
  { url: "/missions", revision: crypto.randomUUID() },
  { url: "/profile", revision: crypto.randomUUID() },
]

const serwist = new Serwist({
  precacheEntries: routes,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();