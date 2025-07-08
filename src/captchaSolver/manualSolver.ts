import readline from 'readline';

export async function waitForManualCaptcha(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('CAPTCHA detected. Solve it manually and type "yes": ', (answer) => {
      rl.close();
      if (answer.trim().toLowerCase() === 'yes') {
        resolve();
      } else {
        console.log('❌ Wrong input. Try again.');
        resolve(waitForManualCaptcha());
      }
    });
  });
}
