using Microsoft.WindowsAPICodePack.Shell;
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace StartAppsCore
{
  public class AppDetails
  {
    public string Name { get; set; }
    public string AppUserModelID { get; set; }
    public string TargetParsingPath { get; set; }
    public string TargetArguments { get; set; }
    public string PackageInstallPath { get; set; }
  }

  class Program
  {
    static void Main(string[] args)
    {

      Guid AppsFolderId = new Guid("{1e87508d-89c2-42f0-8a7e-645a0f50ca58}");
      ShellObject appsFolder = (ShellObject)KnownFolderHelper.FromKnownFolderId(AppsFolderId);

      List<AppDetails> apps = new List<AppDetails>();

      foreach (ShellObject appObject in (IKnownFolder)appsFolder)
      {
        AppDetails app = new AppDetails();

        app.Name = appObject.Name;
        app.AppUserModelID = appObject.Properties.System.AppUserModel.ID.Value;
        app.TargetParsingPath = appObject.Properties.System.Link.TargetParsingPath.Value;
        app.TargetArguments = appObject.Properties.System.Link.Arguments.Value;
        app.PackageInstallPath = (string)appObject.Properties.GetProperty("System.AppUserModel.PackageInstallPath")
                    .ValueAsObject;

        apps.Add(app);
      }

      apps.Sort((x, y) => x.Name.CompareTo(y.Name));

      var options = new JsonSerializerOptions
      {
        WriteIndented = Array.IndexOf(args, "--pretty") > -1,
      };

      string jsonString = JsonSerializer.Serialize(apps, options);

      Console.WriteLine(jsonString);
    }
  }
}
