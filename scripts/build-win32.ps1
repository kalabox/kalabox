#!/
#
# MCFLY YOU BOJO! YOU KNOW HOVERBOARDS DON'T FLOAT ON WATER!
# UNLESS YOU'VE GOT POWER!!!!.... shell
#
# A script to build Kalabox on win32
#

$ErrorActionPreference = "Stop"

# Get some ENV things
$temp_dir = $env:TMP
$base_dir = "$pwd\build\installer"
$bundle_dir = "$base_dir\bundle"
$gui_dir = "$bundle_dir\gui"
$docs_dir = "$bundle_dir\docs"
$bin_dir = "$bundle_dir\bin"
$services_dir = "$bundle_dir\services"
$plugins_dir = "$bundle_dir\plugins"

# Build dependencies
$inno_url = "http://files.jrsoftware.org/is/5/isetup-5.5.9.exe"
$inno_dest = "$temp_dir\inno-installer.exe"
$inno_bin = "C:\Program Files (x86)\Inno Setup 5\ISCC.exe"

# Kalabox version information
$kalabox_pkg = Get-Content "package.json" | Out-String | ConvertFrom-Json
$kalabox_version = $kalabox_pkg.version

# Kalabox plugins
$plugin_pantheon_version = "0.13.0-beta.4"
$plugin_php_version = "0.13.0-beta.2"

# Docker version information
$docker_machine_version = "0.8.1"
$docker_compose_version = "1.8.0"
$boot2docker_iso_version = "1.12.1"

# Virtualbox version information
$virtualbox_version = "5.1.4"
$virtualbox_revision = "110228"

# Git version information
$git_version ="2.7.0"

# Unzip helper
function Unzip($file, $destination)
{
  Write-Output "Unzipping $file to $destination..."
  $shell = new-object -com shell.application
  if (!(Test-Path "$file"))
  {
      throw "$file does not exist"
  }
  New-Item -ItemType Directory -Force -Path $destination -WarningAction SilentlyContinue
  $shell.namespace($destination).copyhere($shell.namespace("$file").items())
  Write-Output "Unzip complete."
}

# Install helper
function InstallExe($file)
{
  Write-Output "Installing $file..."
  #Start-Process -Wait $file $arguments
  $arguments = '/SP /SILENT /VERYSILENT /SUPRESSMSGBOXES /NOCANCEL /NOREBOOT /NORESTART /CLOSEAPPLICATIONS'
  Start-Process -Wait $file $arguments
  Write-Output "Installed with $file"
}

# Download helper
function Download($url, $destination)
{
  $webclient = New-Object System.Net.WebClient
  Write-Output "Downloading $url to $destination..."
  $webclient.DownloadFile($url, $destination)
  Write-Output "Downloaded."
}

# Make sure our dependencies are metadatas
If (!(Test-Path $inno_bin)) {
  Write-Output "Grabbing and installing some needed dependencies..."
  Download -Url $inno_url -Destination $inno_dest
  InstallExe -File $inno_dest
}

# Get the things we need
New-Item -type directory -force -path $bundle_dir, $docs_dir, $bin_dir, $services_dir, $plugins_dir, $gui_dir
Write-Output "Grabbing the files we need..."

# Kalabox things
Copy-Item "dist\gui\kalabox-ui\*" "$gui_dir" -force -recurse
Copy-Item "dist\cli\kbox-win32-x64-v$kalabox_version.exe" "$bin_dir\kbox.exe" -force
Copy-Item "plugins\kalabox-services-kalabox\kalabox-compose.yml" "$services_dir\services.yml" -force

# App plugin things
Download -Url "https://github.com/kalabox/kalabox-app-pantheon/releases/download/v$plugin_pantheon_version/kalabox-app-pantheon-v$plugin_pantheon_version.zip" -Destination "$temp_dir\kalabox-app-pantheon.zip"
Download -Url "https://github.com/kalabox/kalabox-app-php/releases/download/v$plugin_php_version/kalabox-app-php-v$plugin_php_version.zip" -Destination "$temp_dir\kalabox-app-php.zip"

# Docker things
Download -Url "https://github.com/docker/machine/releases/download/v$docker_machine_version/docker-machine-Windows-x86_64.exe" -Destination "$bin_dir\docker-machine.exe"
Download -Url "https://github.com/docker/compose/releases/download/$docker_compose_version/docker-compose-Windows-x86_64.exe" -Destination "$bin_dir\docker-compose.exe"
Download -Url "https://github.com/boot2docker/boot2docker/releases/download/v$boot2docker_iso_version/boot2docker.iso" -Destination "$base_dir\boot2docker.iso"

# Virtualbox
Download -Url "http://download.virtualbox.org/virtualbox/$virtualbox_version/VirtualBox-$virtualbox_version-$virtualbox_revision-Win.exe" -Destination "$temp_dir\virtualbox.exe"

# Git
Download -Url "https://github.com/git-for-windows/git/releases/download/v$git_version.windows.1/Git-$git_version-64-bit.exe" -Destination "$base_dir\Git.exe"

# Do some needed unpacking
Write-Output "Unpacking..."
Start-Process -Wait "$temp_dir\virtualbox.exe" -ArgumentList "-extract -silent -path $temp_dir"
Copy-Item "$temp_dir\VirtualBox-$virtualbox_version-r$virtualbox_revision-MultiArch_amd64.msi" "$base_dir\virtualbox.msi" -force
Copy-Item "$temp_dir\common.cab" "$base_dir\common.cab" -force

New-Item -type directory -force -path $plugins_dir\kalabox-app-pantheon, $plugins_dir\kalabox-app-php
Unzip -File "$temp_dir\kalabox-app-pantheon.zip" -Destination "$plugins_dir\kalabox-app-pantheon"
Unzip -File "$temp_dir\kalabox-app-php.zip" -Destination "$plugins_dir\kalabox-app-php"

# Copy over some other assets
Write-Output "Copying over static assets..."
New-Item $docs_dir -type directory -force
Copy-Item "$pwd\README.md" "$docs_dir\README.md" -force
Copy-Item "$pwd\TERMS.md" "$docs_dir\TERMS.md" -force
Copy-Item "$pwd\LICENSE.md" "$docs_dir\LICENSE.md" -force
Copy-Item "$pwd\ORACLE_VIRTUALBOX_LICENSE" "$docs_dir\ORACLE_VIRTUALBOX_LICENSE" -force
Copy-Item "$pwd\installer\kalabox.yml" "$bundle_dir\kalabox.yml" -force

# Create our inno-installer
Write-Output "Creating our package..."
Start-Process -Wait "$inno_bin" -ArgumentList "$base_dir\Kalabox.iss /DMyAppVersion=$kalabox_version"
