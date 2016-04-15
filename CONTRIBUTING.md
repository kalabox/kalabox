Contributing to Kalabox
=======================

Creating Issues
---------------

Setting Up for Development
--------------------------

You will want to start by using the [latest installer]()

Submitting Fixes
----------------

Testing
-------

#### GUI Testing

If you have the GUI source installed correctly, navigate to that folder and run:

grunt e2e

This task should automatically install Protractor and run all the GUI tests

Tests are included in the "e2e" folders found in each module. For example, all the tests for the dashboard are found in "src/modules/dashboard/e2e". See the kalabox-ui [CONTRIBUTING.md guidelines](https://github.com/kalabox/kalabox-ui/blob/HEAD/CONTRIBUTING.md) for more details.
