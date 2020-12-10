import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const readDirMemory = new Map<string, fs.Dirent[]>();

/**
 * List the files and folders in a directory
 */
export async function readDir(directory: string) {
  const remembered = readDirMemory.get(directory);

  if (remembered) {
    return remembered;
  }

  let entries: fs.Dirent[] = [];

  try {
    entries = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });

    readDirMemory.set(directory, entries);
  } catch (err) {
    console.error('unable to read files in directory', directory, err);
  }

  return entries;
}

/**
 * List the files in a directory recursively
 */
export async function readDirRecursive(directory: string) {
  const currentEntries = await readDir(directory);
  const allEntries: string[] = [];

  for (const entry of currentEntries) {
    if (entry.isFile()) {
      allEntries.push(path.join(directory, entry.name));
    } else if (entry.isDirectory()) {
      const subEntries = await readDirRecursive(
        path.join(directory, entry.name)
      );
      allEntries.push(...subEntries);
    }
  }

  return allEntries;
}

/**
 * Ensure the given value is an array
 */
export function array<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/**
 * Resolve the given partial path by expanding special %env% tokens.
 * For example, "%ProgramData%\Microsoft\Windows\Start Menu\Programs"
 * resolves to "C:\ProgramData\Microsoft\Windows\Start Menu\Programs"
 */
export function resolvePath(partial: string) {
  return path.resolve(
    partial.replace(/%([^%]+)%/g, function (_, key) {
      return process.env[key]!;
    })
  );
}

/**
 * Create a temporary file path for use in the given function,
 * automatically deleted after the function returns
 */
async function useTemporaryFile<T>(
  fn: (filePath: string) => Promise<T>
): Promise<T> {
  const random = (Math.random() * 100000).toString().slice(0, 5);
  const filePath = path.join(__dirname, 'start-apps-' + random + '.ps1');

  let value: T;
  let error: any;

  try {
    value = await fn(filePath);
  } catch (err) {
    error = err;
  }

  await fs.promises.unlink(filePath);

  if (error) {
    throw error;
  }

  return value!;
}

/**
 * Run the given PowerShell command and get the output as a string
 */
export async function powershell(command: string): Promise<string> {
  return useTemporaryFile(async (filePath) => {
    await fs.promises.writeFile(filePath, command, 'utf-8');

    return new Promise((resolve, reject) => {
      exec(
        [
          'powershell.exe',
          '-NonInteractive',
          '-NoProfile',
          '-command',
          JSON.stringify(filePath),
        ].join(' '),
        (err, stdout) => {
          if (err) {
            reject(err);
          }
          resolve(stdout.trim());
        }
      );
    });
  });
}

/**
 * Read the given list of paths to .lnk files and create a map of target + argument to .lnk file path
 */
export async function readLinks(links: string[]) {
  interface PowershellLink {
    FullName: string;
    Arguments: string;
    TargetPath: string;
  }

  const map = new Map<string, string>();

  const commands = links.map((link) => {
    return `(New-Object -COM WScript.Shell).CreateShortcut('${link}') | Select-Object -Property FullName,Arguments,TargetPath | ConvertTo-Json`;
  });

  const output = await powershell(commands.join("; Write-Host ','; "));
  const parsedLinks: PowershellLink[] = JSON.parse(`[${output}]`);

  parsedLinks.forEach((parsedLink) => {
    const linkPath = (parsedLink.FullName ?? '').trim();
    const linkTargetPath = (parsedLink.TargetPath ?? '').trim();
    const linkArguments = (parsedLink.Arguments ?? '').trim();

    map.set(linkTargetPath + ' ' + linkArguments, linkPath);
  });

  return map;
}
