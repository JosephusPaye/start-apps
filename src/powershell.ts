import { exec } from 'child_process';

interface PowershellOptions {
  convertToJson?: boolean;
  jsonAsArray?: boolean;
}

/**
 * Run the given PowerShell command, and optionally convert the results to JSON.
 */
export async function powershell<T = any>(
  command: string,
  options: PowershellOptions = {}
): Promise<T | undefined> {
  const { convertToJson, jsonAsArray } = Object.assign(
    {},
    { convertToJson: false, jsonAsArray: false },
    options
  );

  if (convertToJson) {
    command += ' | ConvertTo-Json';
  }

  console.log({ command });

  return new Promise((resolve, reject) => {
    exec(
      [
        'powershell.exe',
        '-NonInteractive',
        '-NoProfile',
        '-command',
        JSON.stringify(command),
      ].join(' '),
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
        }

        let result = stdout.trim();

        if (result.length === 0) {
          resolve(jsonAsArray ? (([] as unknown) as T) : undefined);
          return;
        }

        if (convertToJson) {
          const json = JSON.parse(stdout);
          resolve(jsonAsArray && !Array.isArray(json) ? [json] : json);
        } else {
          resolve((result as unknown) as T);
        }
      }
    );
  });
}
