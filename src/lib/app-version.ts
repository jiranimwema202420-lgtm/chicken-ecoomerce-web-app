export type AppVersion = {
  version: string;
  commitSha: string;
  deploymentId: string;
  environment: string;
  builtAt: string;
};

export function getAppVersion(): AppVersion {
  return {
    version: process.env.npm_package_version ?? "0.0.0",
    commitSha:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GITHUB_SHA ??
      "local",
    deploymentId:
      process.env.VERCEL_DEPLOYMENT_ID ??
      process.env.VERCEL_URL ??
      "local",
    environment:
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    builtAt:
      process.env.NEXT_PUBLIC_BUILD_TIME ??
      new Date().toISOString(),
  };
}

export function shortCommit(sha: string): string {
  return sha === "local" ? sha : sha.slice(0, 7);
}