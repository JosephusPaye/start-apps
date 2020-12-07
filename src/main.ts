console.log('oh hai');

import { powershell } from './powershell';

async function main() {
  const ls = await powershell<any>('Get-StartApps', { convertToJson: true });
  console.log(ls);
}

main();
