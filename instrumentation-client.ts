import posthog from "posthog-js";

import "posthog-js/dist/exception-autocapture";
import "posthog-js/dist/recorder";
import "posthog-js/dist/surveys";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const configuredHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const uiHost = configuredHost.includes("eu.i.posthog.com")
  ? "https://eu.posthog.com"
  : "https://us.posthog.com";

const apiHost = configuredHost;

const client = posthog as typeof posthog & {
  __dukaInitialized?: boolean;
};

if (projectToken && !client.__dukaInitialized) {
  client.__dukaInitialized = true;

  posthog.init(projectToken, {
    api_host: apiHost,
    ui_host: uiHost,
    defaults: "2026-05-30",
    disable_external_dependency_loading: true,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,

    loaded: (loadedPostHog) => {
      if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true") {
        loadedPostHog.debug();
      }
    },
  });
}