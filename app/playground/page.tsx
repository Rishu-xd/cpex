import type { Metadata } from "next";
import { PlaygroundWorkspace } from "@/components/workspace/PlaygroundWorkspace";

const PLAYGROUND_TITLE = "C++17 DSA Playground";
const PLAYGROUND_DESCRIPTION =
  "Interactive Monaco C++17/C++20 editor with in-browser Clang/LLVM WebAssembly compilation, step-by-step DSA visualizers, code comparison, and direct GitHub commits.";

export const metadata: Metadata = {
  title: PLAYGROUND_TITLE,
  description: PLAYGROUND_DESCRIPTION,
  alternates: {
    canonical: "/playground",
  },
  openGraph: {
    title: `${PLAYGROUND_TITLE} | CPex`,
    description: PLAYGROUND_DESCRIPTION,
    url: "/playground",
  },
  twitter: {
    title: `${PLAYGROUND_TITLE} | CPex`,
    description: PLAYGROUND_DESCRIPTION,
  },
};

export default function PlaygroundPage() {
  return <PlaygroundWorkspace />;
}
