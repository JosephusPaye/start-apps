const fs = require('fs');
const path = require('path');
const { getApps } = require('..');
const shellImage = require('C:/code/JosephusPaye/snappy/backend/dist/shared/native/shell-image.js');
const { getDefaultBrowser } = require('@josephuspaye/default-browser-win');

function posixPath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

// TODO: get the system accent color
const systemAccentColor = '#0078D7';

function resolveStoreAppIcon(app) {
  const icon = {
    path: '',
    backgroundColor: '',
  }

  icon.backgroundColor = app?.packageImages?.backgroundColor ?? systemAccentColor;

  if (icon.backgroundColor === 'transparent') {
    icon.backgroundColor = systemAccentColor;
  }

  icon.path = app?.packageImages?.icon?.default ?? app?.packageImages?.icon?.onBlack ?? app?.packageImages?.icon?.onWhite
    ?? app?.packageImages?.tile?.default ?? app?.packageImages?.tile?.onBlack ?? app?.packageImages?.tile?.onWhite;

  if (icon.path) {
    icon.path = posixPath(icon.path);
  }

  // console.log(app.name, icon.path);

  return icon;
}

function hashCode(string) {
  let hash = 0;

  if (string.length === 0) {
    return hash;
  }

  for (let i = 0; i < string.length; i++) {
    let char = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}

const classicIconCache = new Map();
async function cacheClassicAppIcon(targetPath) {
  // TODO: Cache the mapping between targetPath and icon file, to avoid loading and writing it again

  try {
    // Special handling of File Explorer's icon. The Explorer GUID doesn't produce an icon.
    if (targetPath === '::{52205FD8-5DFB-447D-801A-D0B52F2E83E1}') {
      targetPath = 'C:\\Windows\\explorer.exe'; // TODO: See if this is robust (e.g. doesn't change on different versions of Windows)
    }
    // Special handling of Run's icon. The Run GUID doesn't produce an icon.
    else if (targetPath === '::{2559A1F3-21D7-11D4-BDAF-00C04F60B9F0}') {
      targetPath = path.join(__dirname, 'Run.lnk'); // TODO: See if this is robust (e.g. doesn't change when Windows is installed on a different drive, etc)
    }

    const existingIconFilePath = classicIconCache.get(targetPath);
    if (existingIconFilePath) {
      return existingIconFilePath;
    }

    const imageBuffer = await shellImage.getImageForPath(targetPath, {
      width: 64,
      height: 64,
      flags: shellImage.flags.IconOnly,
    });

    // TODO: think of a better way to convert the target path to a file name
    const iconFileName = hashCode(targetPath) + '.png'; // String(Math.random() * 1000000).slice(0, 6) + '.png';

    const iconFilePath = path.join(__dirname, 'cached-icons', iconFileName);

    await fs.promises.writeFile(iconFilePath, imageBuffer);

    classicIconCache.set(targetPath, iconFilePath);

    return iconFilePath;
  } catch (err) {
    console.error('\n\n\n\nn: failed to get icon: ', targetPath, err);
    return '';
  }
}

let defaultBrowser;
let urlRegex = /(^https?:\/\/)|(\.url$)/i;

async function resolveClassicAppIcon(app, options = { useDefaultBrowserIconForUrls: false }) {
  let targetPath = app.startMenuLink ?? app.targetPath;

  const isUrl = app.targetPath.match(urlRegex) !== null;

  if (isUrl && options.useDefaultBrowserIconForUrls) {
    if (defaultBrowser) {
      targetPath = defaultBrowser.shellCommand.exeFullPath;
    } else {
      try {
        defaultBrowser = await getDefaultBrowser();
        // console.log('got default browser', defaultBrowser);
        targetPath = defaultBrowser.shellCommand.exeFullPath;
      } catch (err) {
        console.log('\n\n');
        console.log('unable to get default browser', err);
        console.log('\n\n');
      }
    }
  }

  const icon = {
    isUrl,
    path: await cacheClassicAppIcon(targetPath),
  }

  if (icon.path) {
    icon.path = posixPath(icon.path);
  }

  // console.log(app.name, icon.path);

  return icon;
}

async function getAppList() {
  const apps = await getApps();
  const list = [];

  for (const app of apps) {
    if (app.type === 'store') {
      list.push({
        ...app,
        resolvedIcon: resolveStoreAppIcon(app),
      })
    } else if (app.type === 'classic') {
      list.push({
        ...app,
        resolvedIcon: await resolveClassicAppIcon(app, { useDefaultBrowserIconForUrls: false  }),
      })
    }
  }

  return list;
}

async function main() {
  const apps = await getAppList();
  // const appsHtml = [];

  // for (const app of apps) {
  //   if (app.type === 'store') {
  //     appsHtml.push(`
  //       <div class="app">
  //         <div class="icon" style="background-color: ${app.resolvedIcon.backgroundColor}; background-image: url('file:///${app.resolvedIcon.path}')"></div>
  //         <div>${app.name}</div>
  //       </div>
  //     `)
  //   } else if (app.type === 'classic') {
  //     appsHtml.push(`
  //       <div class="app">
  //         <div class="icon" style="background-color: transparent; background-image: url('file:///${app.resolvedIcon.path}')"></div>
  //         <div>${app.name}</div>
  //       </div>
  //     `)
  //   }
  // }

/*  const htmlFile = `
    <html>
    <head>
      <title>Apps</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; }
        body { padding: 24px; background-color: #eee; }
        .apps { display: grid; grid-template-columns: repeat(5, 220px); gap: 16px; row-gap: 32px; max-width: 1200px; margin: 0 auto; }
        .app {}
        .icon { width: 48px; height: 48px; background-size: contain; background-position: 50% 50%; background-repeat: no-repeat; }
      </style>
    </head>
    <body>
      <div class="apps">
        ${appsHtml.join('\n')}
      </div>
      <script>window.apps = ${JSON.stringify(apps)}</script>
    </body>
    </html>
  `.trim();*/

  // await fs.promises.writeFile('apps.html', htmlFile);
  // await fs.promises.writeFile('apps.json', JSON.stringify(apps, null, '  '));
}

main();
