# start-apps

Get a list of apps in the Start Menu, with details. Supports classic (desktop) and store (UWP) apps. Store apps have their icons included.

## Installation

```sh
npm install -g @josephuspaye/start-apps
```

## Usage

The following program gets all the apps in the Start Menu and dumps the list in JSON format:

```js
import { getApps } from '@josephuspaye/start-apps';

async function main() {
  const apps = await getApps();
  console.log(JSON.stringify(apps, null, '  '));
}

main();
```

<details>
<summary>View output (partial)</summary>

```json
[
  {
    "type": "store",
    "name": "Mail",
    "appUserModelId": "microsoft.windowscommunicationsapps_8wekyb3d8bbwe!microsoft.windowslive.mail",
    "packagePath": "C:\\Program Files\\WindowsApps\\microsoft.windowscommunicationsapps_16005.13228.41011.0_x64__8wekyb3d8bbwe",
    "packageImages": {
      "backgroundColor": "#0078D7",
      "icon": {
        "default": "C:\\Program Files\\WindowsApps\\microsoft.windowscommunicationsapps_16005.13228.41011.0_x64__8wekyb3d8bbwe\\images\\HxMailAppList.scale-400.png"
      },
      "tile": {
        "default": "C:\\Program Files\\WindowsApps\\microsoft.windowscommunicationsapps_16005.13228.41011.0_x64__8wekyb3d8bbwe\\images\\HxMailMediumTile.scale-400.png"
      }
    }
  },
  {
    "type": "classic",
    "name": "Word",
    "appUserModelId": "Microsoft.Office.WINWORD.EXE.15",
    "targetPath": "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE"
  }
  // more apps...
]
```

</details>

## API

```ts
interface ClassicApp {
  type: 'classic';
  name: string;
  appUserModelId: string;
  targetPath: string;
}

interface Image {
  default?: string;
  onBlack?: string;
  onWhite?: string;
}

interface Images {
  backgroundColor: string;
  icon: Image;
  tile: Image;
}

interface StoreApp {
  type: 'store';
  name: string;
  appUserModelId: string;
  packagePath: string;
  packageImages?: Images;
}

type App = ClassicApp | StoreApp;

/**
 * Get all apps in the Start Menu
 */
function getApps(): Promise<App[] | undefined>;
```

## Building the StartApps binary from source

The Node.js library uses a binary built from a .NET Core project to list the apps and their details. The source of this project is at [StartAppsProject](./StartAppsProject). You can build the project to get a binary as follows:

- Install [Visual Studio Community](https://visualstudio.microsoft.com/vs/community/) (the project was created using the 2019 version)
- Clone this repo and double-click the **StartApps.csproj** file in the project directory to open it in Visual Studio
- In the Visual Studio application menu, click "**Build**" → "**Publish StartApps**"
- Choose "**For NPM - Win x64, Framework-dependant**" in the dropdown menu on the publish page and click "**Publish**" to build the binary
- Find the built binary in `bin\Release\netcoreapp3.1\publish`

## Licence

[MIT](LICENCE)
