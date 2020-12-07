# start-apps

Get a list of apps in the Start Menu, with icons. Supports UWP and Store apps.

## Building the binary from source

Start Apps uses a binary built using a .NET Core project to list the apps and their details. The source of this project is at [StartAppsProject](./StartAppsProject). You can build the project to get a binary as follows:

- Install [Visual Studio Community](https://visualstudio.microsoft.com/vs/community/) (the project was created using the 2019 version)
- Clone this repo and double-click the **StartApps.csproj** file in the project directory to open it in Visual Studio
- In the Visual Studio application menu, click "**Build**" → "**Publish StartApps**"
- Choose "**For NPM - Win x64, Framework-dependant**" in the dropdown menu on the publish page and click "**Publish**" to build the binary
- Find the built binary in `bin\Release\netcoreapp3.1\publish`

## Licence

[MIT](LICENCE)
