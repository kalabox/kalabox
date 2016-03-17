## Introduction

Welcome friend to Kalabox!

Kalabox is the fastest way to start developing Drupal and Wordpress sites on your local computer. If you haven't already, go to http://www.kalabox.io to download the appropriate version of Kalabox for your operating system.

## Installing

1. Download the appropriate package from http://www.kalabox.io
1. Uncompress the download.
2. Double click the "Kalabox" application within the uncompressed folder.
3. On Mac, you may have to allow access to the Kalabox program by vising your "Security & Privacy" settings in "System Preferences".
4. Otherwise, you should see a welcome screen. Hit "Box Me" to start installation.
5. Installation usually takes 5-10 minutes, but may take longer depending on your internet connection. Be prepared to enter your system credentials several times through the process.
6. When you see a blank Kalabox dashboard, you're finished!

If you're on Mac or Windows and want Kalabox to show up with your other applications, drag it to the appropriate directory ("Applications" on Mac and "Program Files" on Windows).

## Using Kalabox

Right now Kalabox only integrates with Pantheon. We'll be releasing the ability to have "stock" Drupal sites and integrations with other hosting providers soon, but until then, get a [free Pantheon account](https://pantheon.io/register) and create a new Drupal project if you don't already use Pantheon.

### Pulling a site from Pantheon

1. Click "Add new site" to open the sites sidebar.
2. Click "Pantheon" under "Add Account" to add your Pantheon account.
3. Enter your Pantheon credentials.
4. You should see your Pantheon account in the list of "Existing Accounts". Click on it.
5. Select the site you'd like to download from the list of sites that appears.
6. Enter the name you'd like to assign this site on Kalabox (this will be used as its URL) and which Pantheon environment (usually your "dev" environment) you'd like to pull your database and files from. Click "Start".
7. The site installation process should start. Be warned that, if this is your first site installation, it will take a long time (10-25 minutes). This is because we are downloading the infrastructure (Docker containers) necessary to simulate a Pantheon environment on your machine. Later, Kalabox will use these same downloads instead of new ones, so the installation should be much quicker.

## Uninstalling 

1. Run the uninstall script packaged with Kalabox by opening up your favorite terminal application an running...
- On Mac/Linux: "./uninstall.sh"
- On Windows: "./uninstall.bat"
This will remove the Kalabox infrastructure from your machine. Any existing virtual machines you had before Kalabox will remain untouched.
2. Throw the Kalabox application file into the trash.

Voila, no more Kalabox!

## Support

To get help...

1. Make sure your question isn't answered in the [wiki documentation](https://github.com/kalabox/kalabox/wiki).
2. Thoroughly search the [Github issue queue](https://github.com/kalabox/kalabox/issues) for any existing issues similar to yours.
3. If all else fails, create an issue with the following information:

- A description of the problem.
- What operating system you're using and which Kalabox version (run `kbox version` on the command line).
- Relevant error messages (make sure to not include any private information that may be in the error message).
- Steps to recreate the issue.

Some examples of good issue reporting:

- https://github.com/kalabox/kalabox/issues/565
- https://github.com/kalabox/kalabox/issues/557

Kalabox is an open-source project. As such, support is a community-lead effort. Please help us keep issue noise to a minimum and be patient with the Kalabox community members who donate time to help out.

If you are interested in dedicated support or customizations, contact enterprise@kalabox.io

## Contributing to Kalabox

Great, you want to lend a hand! Checkout our [developer docs](https://github.com/kalabox/kalabox/wiki/Contribution-Guide) for how to get started. Note that there are two main Kalabox projects: the [Kalabox framework](https://github.com/kalabox/kalabox) which performs all the heavy-lifting, and the user-friendly [Kalabox UI](https://github.com/kalabox/kalabox-ui). The developer docs have guides to help you start developing with both.
