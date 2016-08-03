Testing
=======

You should be able to use this guide to...

1. Check code styling and linting
2. Run CLI, GUI and Installer tests
3. Learn how to write tests

Running Tests
-------------

### Code linting and standards

Kalabox implements some basic linting and code standards to make sure things remain consistent between developers and to prevent syntax errors. You can easily check whether your code matches these standards using grunt.

```bash
grunt test:code
```

### Unit tests

The unit tests use [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/). They primarily test the CLI.

```bash
grunt test:unit
```

### Installer tests

!!! danger "USE EXTREME CAUTION"
    If you run these tests on a machine that already has Kalabox installed it is most likely going to wipe away your currently installed version of Kalabox. For that reason please **BE CAREFUL USING THIS!!!**

The installer tests use the [BATS framework](https://github.com/sstephenson/bats).

```bash
grunt func
```

### Functional tests

We have end-to-end functional tests written in [Protractor](http://angular.github.io/protractor) for the Kalabox GUI.

```bash
grunt e2e
```

This task should automatically configure your system to run the Protractor tests although you will need to have the Java Runtime Environment installed and `java` available in your system's `PATH`.

If you're testing locally and only want to run one test, you can run Protractor
directly from the root of the kalabox-ui project:

```bash
`protractor --specs='src/modules/yourmodule/e2e/yourmodule.spec.js' --grep="name of your it() statement"`
```

Writing Tests
-------------

Unit and installer tests reside in the "test" folder. For examples of unit tests look for ".spec.js" files in the "test" folder. For examples of functional tests look for ".bats" files in the "test" folder.

End to end test live inside `/src` and are included in the "e2e" folders found in each module. For example, all the tests for the dashboard are found in "src/modules/dashboard/e2e".

Looking at existing tests will give you a good idea of how to write your own, but if you're looking for more tips, we recommend:

* [Mocha documentation](http://mochajs.org/)
* [Chai documentation](http://chaijs.com/)
* [Chai-As-Promised documentation](http://chaijs.com/plugins/chai-as-promised/)
* [BATS wiki](https://github.com/sstephenson/bats)
* [BATS tutorial](https://blog.engineyard.com/2014/bats-test-command-line-tools)
* [Protractor test writing tutorials](http://angular.github.io/protractor/#/tutorial)
* [Protractor API reference](http://angular.github.io/protractor/#/api)
