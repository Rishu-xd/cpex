import { runClang, Exit, version } from '@yowasp/clang';
import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
import { performance } from 'node:perf_hooks';

console.log('YoWASP Clang package version:', version);

async function compileCpp(source, { std = 'c++17', extraFiles = {}, extraFlags = [] } = {}) {
  let stdout = '';
  let stderr = '';
  const decOut = new TextDecoder();
  const decErr = new TextDecoder();
  const t0 = performance.now();
  try {
    const filesOut = await runClang(
      ['clang++', `-std=${std}`, '-fno-exceptions', '-O1', '-Wall', '-Wextra', 'main.cpp', '-o', 'program.wasm', ...extraFlags],
      { 'main.cpp': source, ...extraFiles },
      {
        stdout: (bytes) => {
          if (bytes) stdout += decOut.decode(bytes, { stream: true });
        },
        stderr: (bytes) => {
          if (bytes) stderr += decErr.decode(bytes, { stream: true });
        },
        fetchProgress: () => {},
      }
    );
    stdout += decOut.decode();
    stderr += decErr.decode();
    return { ok: true, wasm: filesOut['program.wasm'], stdout, stderr, ms: performance.now() - t0 };
  } catch (err) {
    stdout += decOut.decode();
    stderr += decErr.decode();
    if (err instanceof Exit) {
      return { ok: false, code: err.code, stdout, stderr, ms: performance.now() - t0 };
    }
    throw err;
  }
}

async function runWasm(wasmBytes, stdinText = '') {
  const decOut = new TextDecoder();
  const decErr = new TextDecoder();
  let stdout = '';
  let stderr = '';
  const fds = [
    new OpenFile(new File(new TextEncoder().encode(stdinText))),
    new ConsoleStdout((chunk) => {
      stdout += decOut.decode(chunk, { stream: true });
    }),
    new ConsoleStdout((chunk) => {
      stderr += decErr.decode(chunk, { stream: true });
    }),
    new PreopenDirectory('.', new Map()),
  ];
  const wasi = new WASI(['program.wasm'], [], fds);
  const mod = await WebAssembly.compile(wasmBytes);
  const inst = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  const t0 = performance.now();
  let exitCode = 0;
  let trapError = null;
  try {
    exitCode = wasi.start(inst);
  } catch (err) {
    trapError = err;
  }
  stdout += decOut.decode();
  stderr += decErr.decode();
  return { exitCode, trapError, stdout, stderr, ms: performance.now() - t0 };
}

// Test A: Starter program (no trailing newline)
{
  const src = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3, 4, 5};

    for (int x : nums) {
        cout << x << " ";
    }

    return 0;
}`;
  const comp = await compileCpp(src);
  console.log('\n[Test A Compile]', comp.ok, 'ms:', comp.ms.toFixed(1), 'wasmBytes:', comp.wasm?.length, 'stderr:', JSON.stringify(comp.stderr));
  const exec = await runWasm(comp.wasm);
  console.log('[Test A Run]', exec);
  if (exec.stdout !== '1 2 3 4 5 ' || exec.exitCode !== 0) {
    throw new Error(`Test A failed: got ${JSON.stringify(exec.stdout)}, exit=${exec.exitCode}`);
  }
}

// Test B: Full C++17 STL + std::cin + structured bindings
{
  const src = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <unordered_map>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 1;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    sort(a.begin(), a.end());

    map<int, int> freq;
    unordered_map<int, int> ufreq;
    set<int> uniq;
    priority_queue<int> pq;
    stack<int> st;
    for (int x : a) {
        freq[x]++;
        ufreq[x]++;
        uniq.insert(x);
        pq.push(x);
        st.push(x);
    }
    string summary = "count=" + to_string(uniq.size()) + " max=" + to_string(pq.top()) + " top=" + to_string(st.top());
    cout << summary << "\\n";
    for (const auto& [k, v] : freq) {
        cout << k << ":" << v << " ";
    }
    cout << "\\n";
    return 0;
}`;
  const comp = await compileCpp(src);
  console.log('\n[Test B Compile]', comp.ok, 'ms:', comp.ms.toFixed(1), 'wasmBytes:', comp.wasm?.length, 'stderr:', JSON.stringify(comp.stderr));
  const exec = await runWasm(comp.wasm, '5\n4 2 4 1 2\n');
  console.log('[Test B Run]', exec);
  if (!exec.stdout.includes('count=3 max=4 top=4') || !exec.stdout.includes('1:1 2:2 4:2')) {
    throw new Error('Test B output mismatch');
  }
}

// Test C: Compilation Error
{
  const src = `#include <iostream>
int main() {
    int x = "hello";
    std::cout << unknown_var << std::endl;
    return 0;
}`;
  const comp = await compileCpp(src);
  console.log('\n[Test C Compile Error]', comp.ok, 'code:', comp.code, 'stderr:\n' + comp.stderr);
  if (comp.ok || !comp.stderr.includes('main.cpp:3:')) {
    throw new Error('Test C expected compile error at line 3');
  }
}

// Test D: Runtime Trap / non-zero exit
{
  const src1 = `#include <cstdlib>
int main() { std::abort(); }`;
  const comp1 = await compileCpp(src1);
  const exec1 = await runWasm(comp1.wasm);
  console.log('\n[Test D1 abort]', exec1.exitCode, exec1.trapError?.message);

  const src2 = `int main() { return 42; }`;
  const comp2 = await compileCpp(src2);
  const exec2 = await runWasm(comp2.wasm);
  console.log('[Test D2 exit 42]', exec2.exitCode, exec2.trapError?.message);
}

// Test E: Memory limit linker flag
{
  const src = `#include <iostream>\nint main(){ std::cout << "ok"; return 0; }`;
  const comp = await compileCpp(src, { extraFlags: ['-Wl,--max-memory=67108864'] });
  console.log('\n[Test E --max-memory]', comp.ok, 'stderr:', JSON.stringify(comp.stderr));
  if (comp.ok) {
    const exec = await runWasm(comp.wasm);
    console.log('[Test E Run]', exec);
  }
}

console.log('\nALL TOOLCHAIN CHECKS PASSED');
