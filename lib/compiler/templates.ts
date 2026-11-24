export interface CppTemplate {
  id: string;
  name: string;
  description: string;
  category: 'starter' | 'stl' | 'dsa' | 'diagnostics';
  files: Record<string, string>;
  entryFile: string;
  sampleInput: string;
}

export const CPP_TEMPLATES: CppTemplate[] = [
  {
    id: 'starter-vector',
    name: 'Starter — Vector Iteration',
    description: 'Minimal C++17 program iterating over a std::vector.',
    category: 'starter',
    entryFile: 'main.cpp',
    sampleInput: '',
    files: {
      'main.cpp': `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3, 4, 5};

    for (int x : nums) {
        cout << x << " ";
    }

    return 0;
}
`,
    },
  },
  {
    id: 'stl-stdin-showcase',
    name: 'STL & Custom Input Showcase',
    description: 'Reads stdin and exercises vector, map, unordered_map, set, queue, stack, and sort.',
    category: 'stl',
    entryFile: 'main.cpp',
    sampleInput: `6
10 4 10 2 8 4
`,
    files: {
      'main.cpp': `#include <algorithm>
#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) {
        cerr << "Expected array length n on stdin\\n";
        return 1;
    }

    vector<int> nums(n);
    for (int i = 0; i < n; ++i) {
        cin >> nums[i];
    }

    sort(nums.begin(), nums.end());

    map<int, int> orderedFreq;
    unordered_map<int, int> fastFreq;
    set<int> uniqueVals;
    priority_queue<int> maxHeap;
    stack<int> stk;

    for (int x : nums) {
        orderedFreq[x]++;
        fastFreq[x]++;
        uniqueVals.insert(x);
        maxHeap.push(x);
        stk.push(x);
    }

    cout << "Sorted: ";
    for (int x : nums) cout << x << ' ';
    cout << "\\n";

    cout << "Unique count: " << uniqueVals.size()
         << " | Heap top: " << maxHeap.top()
         << " | Stack top: " << stk.top() << "\\n";

    cout << "Frequencies:\\n";
    for (const auto& [val, count] : orderedFreq) {
        cout << "  " << val << " -> " << count << "\\n";
    }

    return 0;
}
`,
    },
  },
  {
    id: 'binary-search-bounds',
    name: 'Binary Search — Lower & Upper Bound',
    description: 'Classic binary search experimentation with custom sorted arrays and targets.',
    category: 'dsa',
    entryFile: 'main.cpp',
    sampleInput: `7 8
1 3 5 8 8 10 14
`,
    files: {
      'main.cpp': `#include <iostream>
#include <vector>
using namespace std;

int lowerBoundIdx(const vector<int>& a, int target) {
    int lo = 0, hi = static_cast<int>(a.size());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

int upperBoundIdx(const vector<int>& a, int target) {
    int lo = 0, hi = static_cast<int>(a.size());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;

    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];

    int lb = lowerBoundIdx(a, target);
    int ub = upperBoundIdx(a, target);

    cout << "Target: " << target << "\\n";
    cout << "Lower bound index: " << lb << "\\n";
    cout << "Upper bound index: " << ub << "\\n";
    cout << "Occurrences: " << (ub - lb) << "\\n";
    return 0;
}
`,
    },
  },
  {
    id: 'multi-file-header',
    name: 'Multi-File Virtual FS (#include)',
    description: 'Demonstrates splitting helper functions into a header compiled in the browser virtual filesystem.',
    category: 'dsa',
    entryFile: 'main.cpp',
    sampleInput: `5 12
`,
    files: {
      'main.cpp': `#include <iostream>
#include "dsa_helpers.hpp"
using namespace std;

int main() {
    long long a = 0, b = 0;
    if (!(cin >> a >> b)) return 0;

    cout << "gcd(" << a << ", " << b << ") = " << gcd_ll(a, b) << "\\n";
    cout << "lcm(" << a << ", " << b << ") = " << lcm_ll(a, b) << "\\n";
    return 0;
}
`,
      'dsa_helpers.hpp': `#pragma once

inline long long gcd_ll(long long a, long long b) {
    while (b != 0) {
        long long t = a % b;
        a = b;
        b = t;
    }
    return a < 0 ? -a : a;
}

inline long long lcm_ll(long long a, long long b) {
    if (a == 0 || b == 0) return 0;
    return (a / gcd_ll(a, b)) * b;
}
`,
    },
  },
  {
    id: 'diagnostics-demo',
    name: 'Compiler Diagnostics Demo',
    description: 'Intentional compilation errors to verify line-accurate error navigation.',
    category: 'diagnostics',
    entryFile: 'main.cpp',
    sampleInput: '',
    files: {
      'main.cpp': `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {10, 20, 30};
    int badAssign = "not-an-integer";
    std::cout << missingVariable << "\\n";
    return 0;
}
`,
    },
  },
];
