Contributing to Kalabox
=======================

Creating Issues
---------------

**ALL ISSUES** for the Kalabox should be created on the main Kalabox
project page: https://github.com/kalabox/kalabox/issues

Once you create an issue please follow the guidelines that are posted as the
first comment on your.

Issue tags
----------

Here is a list of the tags we use on our issues and what each means.

#### Issue tags

* **bug fix** - The issue indicates a buggy feature that needs to be fixed.
* **documentation** - The issue wishes to improve documentation.
* **feature** - The issue contains new proposed functionality.

#### App specific tags

* **pantheon** - The issue only applies to pantheon apps.
* **php** - The issue only applies to php apps.

#### Additional tags

* **sprint ready** - The issue is in a good state for action.
* **blocker** - The issue is currently blocking the completion of other issues.
* **Epic** - The issue acts as a container for other issues.

Epic Guidelines
---------------

An issue should be expressed as an epic if it satisfies the following two
critera

1. A feature which is best expressed as more than one issue.
2. Each sub-issue is shippable by itself.

Contributing
--------------------------

See: http://docs.kalabox.io/developers/contrib/

Submitting Fixes
----------------

Perform all of your work in a forked branch of kalabox, preferably named in the
convention `[issue number]-some-short-desc`. Please also prefix your commits
with a relevant issue number if applicable ie

`#314: Adding pi to list of known trancendental numbers`

When you feel like your code is ready for review open a pull request against
the kalabox repository. The pull request will auto-generate a checklist
of things you need to do before your code will be considered merge-worthy.

Please always reference the main Kalabox issue in your commit messages and pull
requests using the kalabox/kalabox#[issue number] syntax.
