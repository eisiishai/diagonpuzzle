// Whether the browser tests run on GitHub's machines (GitHub Actions sets
// CI), which draw in software on 4 cores: much slower than a local run.

// Node's process, without depending on @types/node.
declare const process: { env: Record<string, string | undefined> };

export const CI = Boolean(process.env.CI);
