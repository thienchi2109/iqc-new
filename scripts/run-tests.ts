/**
 * Test runner script for Westgard Rule Profiles
 * Utility script to run specific test suites with proper environment setup
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  pattern?: string;
  suite?: 'unit' | 'integration' | 'api' | 'all';
}

const TEST_SUITES = {
  unit: [
    'lib/qc/resolveProfile.test.ts',
    'lib/qc/westgardEngine.test.ts'
  ],
  integration: [
    'app/api/rule-profiles/tests/api.integration.test.ts'
  ],
  api: [
    'app/api/**/*.test.ts'
  ],
  all: ['**/*.test.ts', '**/*.spec.ts']
};

function runTests(options: TestOptions = {}) {
  const {
    watch = false,
    coverage = false,
    verbose = false,
    pattern,
    suite = 'all'
  } = options;

  console.log(`🧪 Running ${suite} tests...`);
  
  // Build Jest command
  let command = 'npx jest';
  
  // Add test patterns
  if (pattern) {
    command += ` --testPathPattern="${pattern}"`;
  } else if (suite !== 'all') {
    const patterns = TEST_SUITES[suite];
    if (patterns.length > 0) {
      command += ` --testPathPattern="${patterns.join('|')}"`;
    }
  }
  
  // Add options
  if (watch) command += ' --watch';
  if (coverage) command += ' --coverage';
  if (verbose) command += ' --verbose';
  
  // Environment setup
  const env = {
    ...process.env,
    NODE_ENV: 'test' as const,
    USE_WESTGARD_RULE_PROFILES: 'true', // Enable feature for testing
  } as NodeJS.ProcessEnv;

  console.log(`📋 Command: ${command}`);
  
  try {
    execSync(command, {
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    });
    console.log('✅ Tests completed successfully!');
  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

function checkTestFiles() {
  console.log('🔍 Checking test files...');
  
  const testFiles = [
    'lib/qc/resolveProfile.test.ts',
    'lib/qc/westgardEngine.test.ts',
    'app/api/rule-profiles/tests/api.integration.test.ts',
    'jest.config.js',
    'jest.setup.js'
  ];
  
  let allExist = true;
  
  testFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (missing)`);
      allExist = false;
    }
  });
  
  if (allExist) {
    console.log('🎉 All test files are present!');
  } else {
    console.log('⚠️  Some test files are missing. Please create them first.');
    process.exit(1);
  }
  
  return allExist;
}

function showHelp() {
  console.log(`
🧪 Westgard Rule Profiles Test Runner

Usage: tsx scripts/run-tests.ts [options]

Options:
  --suite <type>    Run specific test suite (unit, integration, api, all)
  --pattern <glob>  Run tests matching pattern
  --watch          Run tests in watch mode
  --coverage       Generate coverage report
  --verbose        Verbose output
  --check          Check if test files exist
  --help           Show this help

Examples:
  tsx scripts/run-tests.ts --suite unit
  tsx scripts/run-tests.ts --suite integration --coverage
  tsx scripts/run-tests.ts --pattern "resolveProfile"
  tsx scripts/run-tests.ts --watch --verbose
  tsx scripts/run-tests.ts --check
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: TestOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--help':
      showHelp();
      process.exit(0);
      break;
      
    case '--check':
      checkTestFiles();
      process.exit(0);
      break;
      
    case '--suite':
      options.suite = args[++i] as any;
      break;
      
    case '--pattern':
      options.pattern = args[++i];
      break;
      
    case '--watch':
      options.watch = true;
      break;
      
    case '--coverage':
      options.coverage = true;
      break;
      
    case '--verbose':
      options.verbose = true;
      break;
      
    default:
      console.warn(`Unknown argument: ${arg}`);
      break;
  }
}

// Validate suite option
if (options.suite && !TEST_SUITES[options.suite]) {
  console.error(`Invalid suite: ${options.suite}. Valid options: ${Object.keys(TEST_SUITES).join(', ')}`);
  process.exit(1);
}

// Run tests
if (!args.includes('--help') && !args.includes('--check')) {
  checkTestFiles();
  runTests(options);
}
