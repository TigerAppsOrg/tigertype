/**
 * TigerType Test Runner with Progress Bar
 * This script runs Vitest tests with a nice progress bar
 */

import { execa } from 'execa';
import chalk from 'chalk';

const BAR_LENGTH = 40;
const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Progress bar state
let spinnerIndex = 0;
let currentTest = '';
let passed = 0;
let failed = 0;
let total = 0;
let startTime = Date.now();

// Start animation
const animate = () => {
  const spinner = SPINNER_CHARS[spinnerIndex];
  spinnerIndex = (spinnerIndex + 1) % SPINNER_CHARS.length;
  
  const percentage = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;
  const barFilled = Math.floor((BAR_LENGTH * percentage) / 100);
  const progressBar = 
    chalk.green('█'.repeat(barFilled)) + 
    chalk.gray('░'.repeat(BAR_LENGTH - barFilled));
  
  // Build status line
  const statusLine = [
    spinner,
    ' ',
    `${progressBar} ${percentage}%`,
    ' | ',
    chalk.green(`${passed} passed`),
    ', ',
    failed > 0 ? chalk.red(`${failed} failed`) : `${failed} failed`,
    ' | ',
    currentTest ? `Running: ${chalk.cyan(currentTest)}` : ''
  ].join('');
  
  process.stdout.write(`\r${statusLine}`);
};

// Set up animation timer
const timer = setInterval(animate, 80);

// Start the tests
console.log(chalk.bold('\n🚀 Running TigerType frontend tests...\n'));

const runTests = async () => {
  try {
    // Run Vitest with JSON reporter output
    const { stdout } = await execa('npx', ['vitest', 'run', '--reporter=json']);
    
    // Parse the JSON output
    const testResults = JSON.parse(stdout);
    
    // Show final results
    clearInterval(timer);
    process.stdout.write('\r');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Count tests
    const passedTests = testResults.testResults.filter(t => t.status === 'passed').length;
    const failedTests = testResults.testResults.filter(t => t.status === 'failed').length;
    const totalTests = testResults.numTotalTests;
    
    // Build pretty output
    const passedStr = chalk.green(`${passedTests} passed`);
    const failedStr = failedTests > 0 ? chalk.red(`${failedTests} failed`) : `${failedTests} failed`;
    const percentage = Math.round((passedTests / totalTests) * 100);
    
    // Create the final progress bar
    const barFilled = Math.floor((BAR_LENGTH * percentage) / 100);
    const progressBar = 
      chalk.green('█'.repeat(barFilled)) + 
      chalk.gray('░'.repeat(BAR_LENGTH - barFilled));
    
    // Print summary
    console.log(`\n${progressBar} ${percentage}% | ${passedStr}, ${failedStr}`);
    
    if (failedTests > 0) {
      console.log(chalk.red.bold('\n❌ Some tests failed:'));
      
      // Display each failing test
      testResults.testResults
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(chalk.red(`  • ${test.name}: ${test.message}`));
        });
    } else {
      console.log(chalk.green.bold('\n✅ All tests passed!'));
    }
    
    console.log(chalk.gray(`\nTime: ${duration}s\n`));
    
    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    clearInterval(timer);
    console.error('\n\n', chalk.red('Error running tests:'), error);
    process.exit(1);
  }
};

runTests(); 