import fs from 'fs';

const readDirMemory = new Map<string, fs.Dirent[]>();

export async function readDir(directory: string) {
  const remembered = readDirMemory.get(directory);

  if (remembered) {
    return remembered;
  }

  let files: fs.Dirent[] = [];

  try {
    files = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });

    readDirMemory.set(directory, files);
  } catch (err) {
    console.error('unable to read files in directory', directory, err);
  }

  return files;
}

export function array<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
