#!/usr/bin/env node
/* Simple guard to catch case issues across OSes */
const { execSync } = require('node:child_process')
const { existsSync } = require('node:fs')

function fail(msg) {
  console.error(`\n[case-check] ${msg}\n`)
  process.exit(1)
}

// Ensure repo is case-sensitive in Git
try {
  const v = execSync('git config --get core.ignorecase', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  if (v !== 'false') {
    fail('git core.ignorecase must be false. Run: git config core.ignorecase false')
  }
} catch {}

// Disallow uppercase filenames under components/ui for shadcn primitives
const fs = require('node:fs')
const path = require('node:path')
const uiDir = path.join('components','ui')
const uppercaseFiles = new Set(['Button.tsx','Input.tsx','Select.tsx'])
if (fs.existsSync(uiDir)) {
  const entries = fs.readdirSync(uiDir)
  for (const name of entries) {
    if (uppercaseFiles.has(name)) {
      fail(`Uppercase file detected: ${path.join(uiDir, name)}. Please rename to lowercase.`)
    }
  }
}

// Disallow uppercase import specifiers for those primitives
try {
  const grep = execSync(
    'git --no-pager grep -n "@/components/ui/\\(Button\\|Input\\|Select\\)" || exit 0',
    { stdio: ['ignore', 'pipe', 'ignore'] }
  ).toString()
  if (grep.trim()) {
    console.error(grep)
    fail('Uppercase import paths found. Use lowercase: button/input/select')
  }
} catch {}

console.log('[case-check] OK')
