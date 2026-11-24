'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CpexLogo } from '@/components/brand/CpexLogo';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Code2,
  Cpu,
  Download,
  FlaskConical,
  GitBranch,
  GitCompare,
  Layers,
  Lock,
  Play,
  Puzzle,
  ShieldCheck,
  Terminal,
  Upload,
  Workflow,
} from 'lucide-react';

const ARCHITECTURE_PILLARS = [
  {
    icon: <Cpu className="w-4 h-4 text-sky-400" />,
    title: 'Clang / LLVM 22 in WebAssembly',
    detail:
      'Runs real C++17 compilation directly in your browser using @yowasp/clang targeting wasm32-wasip1 with bundled libc++ and wasi-libc — zero backend compilers or external APIs.',
    meta: 'wasm32-wasip1 · libc++ · STL',
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    title: 'Two-Worker Isolated Runtime',
    detail:
      'A lazy-loaded Compiler Worker stays warm after first run, while a separate @bjorn3/browser_wasi_shim Runner Worker executes your binary with timeout termination and memory caps.',
    meta: 'Web Workers · Stop anytime · No UI freeze',
  },
  {
    icon: <GitCompare className="w-4 h-4 text-sky-400" />,
    title: 'Monaco IDE & Version Experiments',
    detail:
      'Edit multi-file C++ workspaces with inline compiler markers, run multiple test cases with line-by-line output diffs, save immutable snapshots, and compare versions side-by-side.',
    meta: 'DiffEditor · Test Cases · Snapshots',
  },
  {
    icon: <Boxes className="w-4 h-4 text-amber-400" />,
    title: 'Interactive DSA Visual Lab',
    detail:
      'Experiment with 10 data structures and 11 step-by-step algorithm visualizers docked beside the editor — with zero AI hints or auto-generated solutions.',
    meta: '10 Structures · 11 Algorithms',
  },
];

const USE_CASES = [
  {
    icon: <Terminal className="w-4 h-4 text-sky-400" />,
    title: 'Zero-Install C++17 Anywhere',
    body: 'Open any modern desktop browser and compile full int main() programs using <vector>, <map>, <unordered_map>, <algorithm>, <queue>, and <stack> without installing g++ or clang locally.',
  },
  {
    icon: <FlaskConical className="w-4 h-4 text-emerald-400" />,
    title: 'Iterate Without Polluting Git',
    body: 'Keep temporary scratch experiments, test edge cases against custom stdin, and compare O(n^2) vs O(n log n) snapshots locally before making a single commit.',
  },
  {
    icon: <Workflow className="w-4 h-4 text-amber-400" />,
    title: 'Verify Mental Models Visually',
    body: 'Step through Binary Search bounds, Quick Sort partitions, BST rotations/deletions, Min/Max Heaps, and BFS/DFS frontiers right beside your C++ implementation.',
  },
  {
    icon: <Upload className="w-4 h-4 text-sky-400" />,
    title: 'Explicit GitHub Commits',
    body: 'Browse repositories, create feature branches, inspect commit history, and push verified C++ files directly from the workspace only when you explicitly confirm a commit message.',
  },
];

const EXTENSION_STEPS = [
  'Download and extract cpex-github-bridge.zip anywhere on your machine.',
  'Open chrome://extensions (or edge://extensions), enable Developer mode, and click Load unpacked on the extracted folder.',
  'Click the CPex GitHub Bridge icon, paste your .env lines or GITHUB_TOKEN, and launch the playground.',
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 h-14 bg-[#09090b]/90 backdrop-blur border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <CpexLogo size={30} priority />
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              CPex
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
              C++17 Lab
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#purpose" className="hover:text-zinc-100 transition-colors">
              Purpose
            </a>
            <a href="#architecture" className="hover:text-zinc-100 transition-colors">
              How It&apos;s Made
            </a>
            <a href="#extension" className="hover:text-zinc-100 transition-colors">
              Extension
            </a>
            <a href="#useful" className="hover:text-zinc-100 transition-colors">
              Use Cases
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/downloads/cpex-github-bridge.zip"
              download="cpex-github-bridge.zip"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] text-xs font-medium text-zinc-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-300" />
              <span>Extension (.zip)</span>
            </a>
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold transition-colors"
            >
              <span>Start App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/[0.07]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.09] text-[11px] font-mono text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                100% Browser-Native C++17 Compiler · No AI Hints
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-zinc-50 leading-[1.15]">
                A personal C++ laboratory for Data Structures &amp; Algorithms.
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                CPex brings a VS Code–style Monaco editor, a real Clang/LLVM WebAssembly C++17 compiler, interactive DSA visualizations, multi-version code comparisons, and direct GitHub commits into one focused workspace — with zero server compilation and zero automatic solutions.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Playground</span>
                </Link>

                <a
                  href="/downloads/cpex-github-bridge.zip"
                  download="cpex-github-bridge.zip"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#14141a] hover:bg-[#1a1a22] border border-white/[0.12] text-zinc-100 text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Download Extension (.zip)</span>
                </a>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs text-zinc-500 font-mono">
                <span>C++17 / C++20</span>
                <span>·</span>
                <span>Clang 22 WASM</span>
                <span>·</span>
                <span>10 Data Structures</span>
                <span>·</span>
                <span>11 Algorithms</span>
                <span>·</span>
                <span>MV3 GitHub Bridge</span>
              </div>
            </motion.div>

            {/* Authentic Code + Output Preview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="lg:col-span-6 rounded-lg bg-[#0e0e13] border border-white/[0.1] overflow-hidden shadow-2xl"
            >
              <div className="h-9 px-3 bg-[#131319] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Code2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>main.cpp</span>
                  <span className="text-[10px] px-1.5 py-0 rounded bg-white/[0.07] text-zinc-400">
                    C++17
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400">
                  wasm32-wasip1 · ready
                </span>
              </div>

              <pre className="p-4 font-mono text-xs leading-relaxed text-zinc-200 overflow-x-auto bg-[#0b0b0f]">
{`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3, 4, 5};

    for (int x : nums) {
        cout << x << " ";
    }

    return 0;
}`}
              </pre>

              <div className="border-t border-white/[0.08] bg-[#101015] p-3 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>$ clang++ -std=c++17 -O1 -fno-exceptions main.cpp -o program.wasm</span>
                  <span className="text-emerald-400">exit 0</span>
                </div>
                <div className="text-zinc-100">1 2 3 4 5</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Purpose & Philosophy */}
        <section id="purpose" className="border-b border-white/[0.07] bg-[#0b0b0f]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-8">
            <div className="max-w-2xl space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                Purpose &amp; Philosophy
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Stop context-switching. Keep your thinking independent.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Practicing DSA usually means juggling LeetCode tabs, local VS Code setups, third-party visualizers, and terminal git commands. CPex unifies them into one fast browser laboratory without giving away hints or solutions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <Lock className="w-4 h-4 text-sky-400" />
                  <span>No AI Spoon-Feeding</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No AI hints, no auto-complete solutions, and no hidden test harnesses. You write complete C++ programs, test edge cases yourself, and learn from real compiler diagnostics.
                </p>
              </div>

              <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <span>Experiment Freely First</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Create temporary scratchpads, capture labeled snapshots as your approach evolves, diff code side-by-side, and keep local saves completely separate from GitHub commits.
                </p>
              </div>

              <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Full C++17 STL Support</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Real compilation against bundled libc++ headers including &lt;iostream&gt;, &lt;vector&gt;, &lt;algorithm&gt;, &lt;map&gt;, &lt;unordered_map&gt;, &lt;set&gt;, &lt;queue&gt;, and &lt;stack&gt;.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It's Made */}
        <section id="architecture" className="border-b border-white/[0.07]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-8">
            <div className="max-w-2xl space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                How It&apos;s Made
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Built on WebAssembly, Web Workers, and Monaco.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every compilation and execution happens locally on your machine inside browser Web Workers — never on a backend server.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ARCHITECTURE_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-lg bg-[#111116] border border-white/[0.08] p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                      {pillar.icon}
                      <span>{pillar.title}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {pillar.detail}
                  </p>
                  <div className="pt-1 font-mono text-[11px] text-zinc-500">
                    {pillar.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browser Extension Section */}
        <section id="extension" className="border-b border-white/[0.07] bg-[#0b0b0f]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-400">
                <Puzzle className="w-3.5 h-3.5" />
                <span>CPex GitHub Bridge Extension (Manifest V3)</span>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Store your GitHub .env secrets inside the browser extension — not on a server.
              </h2>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Instead of setting up server environment variables or trusting a third-party backend with your GitHub token, the <strong className="text-zinc-200">CPex GitHub Bridge</strong> extension keeps your <code className="font-mono text-sky-300">.env</code> credentials inside <code className="font-mono text-zinc-300">chrome.storage.local</code> and executes GitHub API requests on your behalf.
              </p>

              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Supports pasting your existing <code className="font-mono text-sky-300">.env</code> lines, a direct <code className="font-mono text-sky-300">GITHUB_TOKEN</code>, or OAuth inside the popup.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Raw tokens never enter page <code className="font-mono text-zinc-200">window</code>, <code className="font-mono text-zinc-200">localStorage</code>, or DOM state — an origin whitelist restricts access strictly to approved CPex URLs.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Enables repo selection, branch creation, pulling remote C++ files, browsing commits, and explicit push confirmations straight from the CPex sidebar.
                  </span>
                </li>
              </ul>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href="/downloads/cpex-github-bridge.zip"
                  download="cpex-github-bridge.zip"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CPex GitHub Bridge (.zip)</span>
                </a>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] text-zinc-200 text-xs font-medium transition-colors"
                >
                  <span>Open Playground</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-lg bg-[#111116] border border-white/[0.09] p-5 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                3-Step Extension Setup (Chrome / Edge / Brave)
              </div>
              <ol className="space-y-3">
                {EXTENSION_STEPS.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-500/35 text-sky-300 font-mono text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-300 leading-relaxed pt-0.5">
                      {text}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="rounded bg-[#09090c] border border-white/[0.07] p-3 font-mono text-[11px] text-zinc-300 space-y-1">
                <div className="text-zinc-500"># Example .env paste inside extension popup</div>
                <div>GITHUB_TOKEN=ghp_your_personal_access_token</div>
                <div>NEXT_PUBLIC_APP_URL=http://localhost:3000</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It's Useful */}
        <section id="useful" className="border-b border-white/[0.07]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-8">
            <div className="max-w-2xl space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                In What Ways It&apos;s Useful
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Built for daily C++ problem-solving, lab prep, and interview drills.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {USE_CASES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg bg-[#111116] border border-white/[0.08] p-5 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer CTA */}
      <footer className="bg-[#09090b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CpexLogo size={28} />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-100">
                Ready to compile C++17 in your browser?
              </div>
              <div className="text-xs text-zinc-500">
                CPex — Browser-Native C++ DSA Playground &amp; GitHub Bridge Extension
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/downloads/cpex-github-bridge.zip"
              download="cpex-github-bridge.zip"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] text-xs font-medium text-zinc-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-300" />
              <span>Download Extension (.zip)</span>
            </a>
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold transition-colors"
            >
              <span>Launch Playground</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
