import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run: node .github/workflows/auto-merge-to-main.test.mjs [target-revision]
// State mutation: use 954cb55 to remove the subsequent conflict resolution.
// Pin the source so deleting/moving its remote branch cannot change this proof.
const source = 'c7399b81aaa640dd03b00ba4c0c7a2318640836c';
const unresolved = '954cb55979a629d5b6964b9684ea8a8e4213e58e';
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}).trim();

function conflicts(target) {
  const base = git('merge-base', target, source);
  // This is the verifier's read-only three-tree comparison. Its exit status
  // is zero even on conflicts: inspect the generated conflict hunks instead.
  const output = git('merge-tree', base, target, source);
  return output.split(/^(?=changed in both|added in both|removed in |merged)/m)
    .filter(section => /^\+<<<<<<< \.our$/m.test(section))
    .map(section => {
      const path = section.match(/^  our\s+\d+ [0-9a-f]+ (.+)$/m);
      assert.ok(path, 'Conflict must have an identifiable path');
      return path[1];
    }).sort();
}

// Keep the historical counterexample as a control; do not mistake Git's zero
// exit status for a clean merge or silently skip missing historical objects.
assert.deepEqual(conflicts(unresolved), ['WORKLIST.md', 'public/sw.js']);
console.log('PASS historical control: WORKLIST.md and public/sw.js conflict');

const target = process.argv[2] || 'HEAD';
const paths = conflicts(target);
assert.deepEqual(paths, [], `cs/969 does not merge cleanly into ${target}: ${paths.join(', ')}`);
console.log(`PASS cs/969 merges cleanly into ${target}`);
