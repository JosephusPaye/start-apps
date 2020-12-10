import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { parse } from 'fast-xml-parser';

import {
  array,
  readDir,
  readDirRecursive,
  readLinks,
  resolvePath,
} from './support';

interface StartApp {
  Name: string;
  AppUserModelID: string;
  TargetParsingPath: string | null;
  TargetArguments: string | null;
  PackageInstallPath: string | null;
}

export interface ClassicApp {
  type: 'classic';
  name: string;
  appUserModelId: string;
  targetPath: string;
  targetArguments: string;
  startMenuLink?: string;
}

export interface Image {
  default?: string;
  onBlack?: string;
  onWhite?: string;
}

export interface Images {
  backgroundColor: string;
  icon: Image;
  tile: Image;
}

export interface StoreApp {
  type: 'store';
  name: string;
  appUserModelId: string;
  packagePath: string;
  packageImages?: Images;
}

type App = ClassicApp | StoreApp;

const StartAppsExe = path.resolve(__dirname, '..', 'bin', 'StartApps.exe');

/**
 * Run the StartApps binary to get the list of apps in the start menu
 */
function getStartApps(): Promise<StartApp[]> {
  return new Promise((resolve, reject) => {
    execFile(StartAppsExe, [], (error, stdout) => {
      if (error) {
        reject(error);
      }

      const json = stdout.trim();

      if (json.length > 0) {
        resolve(JSON.parse(json));
      } else {
        resolve([]);
      }
    });
  });
}

/**
 * Find the main images (icon and tile) for the store app with the given details
 */
async function findImages(
  appUserModelId: string,
  packagePath: string
): Promise<Images | undefined> {
  const manifestPath = path.join(packagePath, 'AppxManifest.xml');
  let manifest = '';

  try {
    manifest = await fs.promises.readFile(manifestPath, 'utf-8');
  } catch (err) {
    console.error('unable to read manifest for', appUserModelId, err);
    return;
  }

  if (manifest.trim().length === 0) {
    console.error('manifest empty for', appUserModelId);
    return;
  }

  let manifestJson;

  try {
    manifestJson = parse(manifest, {
      attributeNamePrefix: '@',
      ignoreAttributes: false,
      allowBooleanAttributes: true,
      trimValues: true,
    });
  } catch (err) {
    console.error('unable to parse manifest for', appUserModelId, err);
    return;
  }

  // A package may have more than one apps, so we find the ID of the specific one
  // by splitting the app user model id, which is of the form `packageId!appId`
  const [, specificAppId] = appUserModelId.split('!');
  const specificApp = array(manifestJson.Package.Applications.Application).find(
    (app) => app['@Id'] === specificAppId
  );

  if (specificApp) {
    const visuals = specificApp['uap:VisualElements'];
    return {
      backgroundColor: visuals['@BackgroundColor'],
      icon: await findImageVariants(visuals['@Square44x44Logo'], packagePath),
      tile: await findImageVariants(visuals['@Square150x150Logo'], packagePath),
    };
  } else {
    return undefined;
  }
}

const imageScaleRegex = /scale-(\d+)/i;
const imageContrastRegex = /contrast(\-white)?(-black)?/i;

/**
 * Find the main variant images (default, contrast on black, contrast on white)
 * for the given image base image in the given package.
 */
async function findImageVariants(baseImagePath: string, packagePath: string) {
  const { dir: baseImageDir, name: baseImageName } = path.parse(baseImagePath);
  const assetsDirectory = path.join(packagePath, baseImageDir);

  const files = await readDir(assetsDirectory);

  const matchingImages = files
    // Remove files that don't match the base image
    .filter((file) => {
      return file.isFile && file.name.startsWith(baseImageName);
    })
    // Add full path, scale, and contrast information
    .map((file) => {
      const scaleMatch = imageScaleRegex.exec(file.name);
      const scale = scaleMatch ? Number(scaleMatch[1]) : 100;

      let contrast: 'default' | 'onBlack' | 'onWhite' = 'default';
      const contrastMatch = imageContrastRegex.exec(file.name);

      if (contrastMatch) {
        if (contrastMatch[1]) {
          contrast = 'onWhite';
        } else if (contrastMatch[2]) {
          contrast = 'onBlack';
        }
      }

      return {
        path: path.join(assetsDirectory, file.name),
        scale,
        contrast,
      };
    })
    // Sort in descending order of scale
    .sort((a, z) => {
      return z.scale - a.scale;
    });

  const images: { default?: string; onBlack?: string; onWhite?: string } = {};

  // Find the three main images
  for (const image of matchingImages) {
    if (images[image.contrast] === undefined) {
      images[image.contrast] = image.path;
    }

    // End the loop if we've found all three images
    if (images.default && images.onBlack && images.onWhite) {
      break;
    }
  }

  return images;
}

const GLOBAL_START = resolvePath(
  '%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs'
);
const USER_START = resolvePath(
  '%AppData%\\Microsoft\\Windows\\Start Menu\\Programs'
);

async function attachStartMenuLinks(apps: App[]) {
  const globalStartMenuFiles = await readDirRecursive(GLOBAL_START);
  const userStartMenuFiles = await readDirRecursive(USER_START);

  const links: string[] = [
    ...globalStartMenuFiles,
    ...userStartMenuFiles,
  ].filter((shortcut) => {
    return shortcut.endsWith('.lnk');
  });

  let parsedLinks;

  try {
    parsedLinks = await readLinks(links);
  } catch (err) {
    console.error('unable to read links for classic apps', err);
    return;
  }

  for (const app of apps) {
    if (app.type === 'classic') {
      const link = parsedLinks.get(app.targetPath + ' ' + app.targetArguments);
      if (link) {
        app.startMenuLink = link;
      }
    }
  }
}

/**
 * Get all apps in the Start Menu
 */
export async function getApps() {
  let startApps: StartApp[] = [];

  try {
    startApps = await getStartApps();
  } catch (err) {
    console.error('unable to get start apps', err);
    return;
  }

  const apps: App[] = startApps.map((startApp) => {
    if (startApp.PackageInstallPath) {
      return {
        type: 'store',
        name: startApp.Name,
        appUserModelId: startApp.AppUserModelID,
        packagePath: startApp.PackageInstallPath,
      };
    } else {
      return {
        type: 'classic',
        name: startApp.Name,
        appUserModelId: startApp.AppUserModelID,
        targetPath: startApp.TargetParsingPath ?? '',
        targetArguments: startApp.TargetArguments ?? '',
      };
    }
  });

  const addImages = apps.map(async (app) => {
    if (app.type === 'store') {
      app.packageImages = await findImages(app.appUserModelId, app.packagePath);
    }
  });

  await Promise.all(addImages);

  await attachStartMenuLinks(apps);

  return apps;
}

if (require.main === module) {
  async function main() {
    const apps = await getApps();
    console.log(JSON.stringify(apps, null, '  '));
  }

  main();
}
