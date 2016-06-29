Kalabox
=======

Kalabox is a free and open source local development environment and workflow tool based on (docker) container technology. Kalabox allows users to spin up hyper-customized, super-fast development environments and to integrate those environments with their hosting or continuous
integration workflows.

With Kalabox you can

  * Easily mimic your production environment on local
  * Setup, develop, pull and deploy your sites super fast.
  * Standardize your teams dev environments and tools on OSX, Windows and Linux.
  * Easily customize or extend tooling, deployment options and basically any other functionality.
  * Free yourself from the tyranny of inferior local development products.

For more info on how you can do some of the above, and for general Kalabox information check out [our docs](http://docs.kalabox.io).

Getting Started
---------------

Kalabox ships as native installer packages for Windows, OSX, Debian and Fedora. Officially supported versions are available on our [releases page](https://github.com/kalabox/kalabox/releases). To get informed of new Kalabox releases and project updates we encourage you
to [sign up for our newsletter](http://www.kalabox.io/).

Once you've [installed Kalabox](http://docs.kalabox.io/users/install/#installation) you should have

  * The Kalabox GUI in your applications folder, linux menu or Windows start menu.
  * The Kalabox CLI available in your terminal. Type `kbox` on a terminal to see.
  * The Kalabox engine running a docker daemon.

Kalabox also packages two kinds of apps for you to get started right away on your Drupal, Wordpress, Backdrop or Pantheon based projects.

  **Pantheon** - Allows users to create the Pantheon environment locally, and to pull a site down from their Pantheon account. Users will
  also be able to push changes back up to their Pantheon site. To read more about the Pantheon app check out both the [Pantheon docs](http://pantheon.kalabox.io/) and its [code](https://github.com/kalabox/kalabox-app-pantheon).

  **PHP** - Allows the users to create basic Drupal, Wordpress and Backdrop sites. To read more about the PHP app check out both the [PHP docs](http://php.kalabox.io/) and its [code](https://github.com/kalabox/kalabox-app-php).

You can also easily create your own kinds of apps to develop in Node, Django, Ruby, Python, Frontpage 97, etc. To learn about creating
your own apps check out [our docs](http://docs.kalabox.io). **SPOILER ALERT:** Kalabox uses Docker Compose and another small `kalabox.yml`
to spin up apps.

Support
-------

To get help...

  1. Make sure your question isn't answered in either the core [docs](http://support.kalabox.io/solution/categories) or in the [Pantheon](http://pantheon.kalabox.io/) or [PHP](http://php.kalabox.io/) docs.
  2. Thoroughly search the [Github issue queue](https://github.com/kalabox/kalabox/issues) for any existing issues similar to yours.
  3. If all else fails, create an issue and follow the pre-populated guidelines and the [CONTRIB.MD](https://raw.githubusercontent.com/kalabox/kalabox/v0.13/CONTRIBUTING.md) as best as possible.

Some examples of good issue reporting:

  - [https://github.com/kalabox/kalabox/issues/565](https://github.com/kalabox/kalabox/issues/565)
  - [https://github.com/kalabox/kalabox/issues/557](https://github.com/kalabox/kalabox/issues/557)

Kalabox is an open-source project. As such, support is a community-lead effort. Please help us keep issue noise to a minimum and be patient with the Kalabox community members who donate time to help out.

**If you are interested in dedicated support or customizations, check out [our support offerings.](http://kalabox.io/support)**

Development Releases
--------------------

We also produce development releases for every commit merged into our `v0.13` branch. **These releases are not officially supported** but we have made them available to intrepid users who want to try the bleeding edge or are interested in trying out a recent bug fix before
an official release is rolled.

  * **Windows** - [http://installer.kalabox.io/kalabox-latest-dev.exe](http://installer.kalabox.io/kalabox-latest-dev.exe)
  * **Debian** - [http://installer.kalabox.io/kalabox-latest-dev.deb](http://installer.kalabox.io/kalabox-latest-dev.deb)
  * **Fedora** - [http://installer.kalabox.io/kalabox-latest-dev.rpm](http://installer.kalabox.io/kalabox-latest-dev.rpm)
  * **MacOSX** - [http://installer.kalabox.io/kalabox-latest-dev.dmg](http://installer.kalabox.io/kalabox-latest-dev.dmg)

Other Resources
---------------

* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
