/**
 * Custom Test Progress Reporter for Vitest
 * Displays a nice progress bar during test execution
 */

import chalk from 'chalk';

class TestProgressReporter {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.startTime = 0;
    this.testFiles = new Set();
  }

  onInit(context) {
    this.startTime = Date.now();
    console.log(chalk.cyan.bold('\n🚀 Starting TigerType Tests\n'));
  }

  onTestStart(test) {
    process.stdout.write(chalk.yellow('▶️  Running: ') + chalk.gray(test.name) + '\r');
  }

  onTestPass(test) {
    this.passedTests++;
    this.updateProgress();
  }

  onTestFail(test) {
    this.failedTests++;
    process.stdout.write(chalk.red(`✖ Failed: ${test.name}\n`));
    this.updateProgress();
  }

  onCollected(files) {
    this.totalTests = files.reduce((acc, file) => acc + file.tasks.length, 0);
    this.testFiles = new Set(files.map(file => file.filepath));
    
    console.log(chalk.cyan(`Found ${this.totalTests} tests in ${this.testFiles.size} files\n`));
    this.drawProgressBar(0);
  }

  onFinished(files, errors) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log('\n');
    if (this.failedTests === 0) {
      console.log(chalk.green.bold(`✅ All tests passed! (${this.passedTests}/${this.totalTests})`));
    } else {
      console.log(
        chalk.red.bold(`❌ ${this.failedTests} tests failed`) + 
        chalk.white(`, ${this.passedTests} passed (${this.totalTests} total)`)
      );
    }
    
    console.log(chalk.gray(`\nTime: ${duration}s\n`));
  }

  updateProgress() {
    const completed = this.passedTests + this.failedTests;
    const percentage = Math.round((completed / this.totalTests) * 100);
    this.drawProgressBar(percentage);
  }

  drawProgressBar(percentage) {
    const width = 40;
    const completed = Math.floor(width * (percentage / 100));
    const remaining = width - completed;
    
    const bar = 
      chalk.green('█'.repeat(completed)) + 
      chalk.gray('░'.repeat(remaining));
    
    const status = `${this.passedTests} passed, ${this.failedTests} failed`;
    
    process.stdout.write(`${bar} ${percentage}% | ${status}\r`);
  }
}

export default TestProgressReporter; 