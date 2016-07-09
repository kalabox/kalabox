'use strict';

module.exports = function(grunt) {

  // loads all grunt-* tasks based on package.json definitions
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  // Load in common information we can use across tasks
  var common = require('./tasks/common.js');

  // Load in delegated responsibilities because cleanliness => godliness
  var delta = require('./tasks/delta.js')(common);
  var frontend = require('./tasks/frontend.js')(common);
  var fs = require('./tasks/fs.js')(common);
  var nwjs = require('./tasks/nw.js')(common);
  var shell = require('./tasks/shell.js')(common);
  var style = require('./tasks/style.js')(common);
  var unit = require('./tasks/unit.js')(common);
  var util = require('./tasks/util.js')(common);

  /**
   * A utility function to get all app JavaScript sources.
   */
  function filterForJS(files) {
    return files.filter(function(file) {
      return file.match(/\.js$/);
    });
  }

  /**
   * A utility function to get all app CSS sources.
   */
  function filterForCSS(files) {
    return files.filter(function(file) {
      return file.match(/\.css$/);
    });
  }

  // Our Grut config object
  var config = {

    // Linting, standards and styles tasks
    jshint: style.jshint,
    jscs: style.jscs,
    htmlangular: style.htmlangular,
    mdlint: style.mdlint,

    // Concat our things
    concat: {
      buildCss: frontend.concat.buildCss
    },

    // Copying tasks
    copy: {
      cliBuild: fs.copy.cli.build,
      cliDist: fs.copy.cli.dist,
      guiBuild: fs.copy.gui.build,
      installerBuild: fs.copy.installer.build,
      installerDist: fs.copy.installer.dist
    },

    // Copying tasks
    clean: {
      cliBuild: fs.clean.cli.build,
      cliDist: fs.clean.cli.dist,
      guiBuild: fs.clean.gui.build,
      guiDist: fs.clean.gui.dist,
      installerBuild: fs.clean.installer.build,
      installerDist: fs.clean.installer.dist
    },

    // Unit test tasks
    mochacli: unit.mochacli,

    // Installs bower deps
    'bower-install-simple': frontend.bower,

    // Nwjs
    nwjs: {
      pkg: nwjs.pkg,
      run: nwjs.run
    },

    // The `index` task compiles the `index.html` file as a Grunt template.r.
    index: {
      build: frontend.index.build
    },

    // Converts HTML to JS
    html2js: {
      app: frontend.html2js.app,
      common: frontend.html2js.common
    },

    // And now our watch has started
    watch: delta,

    // Sassify
    sass: {
      compile: frontend.sass.compile
    },

    // Shell tasks
    shell: {
      cliPkg: shell.cliPkgTask(),
      guiInstall: shell.guiInstallTask(),
      installerPkgosx: shell.scriptTask('./scripts/build-osx.sh'),
      installerPkglinux: shell.scriptTask('./scripts/build-linux.sh'),
      installerPkgwin32: shell.psTask('./scripts/build-win32.ps1'),
      installerosxBats: shell.batsTask(common.files.installerOsxBats),
      installerlinuxBats: shell.batsTask(common.files.installerLinuxBats)
    },

    // Utility tasks
    bump: util.bump

  };

  // Load in all our task config
  grunt.initConfig(config);

  /**
   * The index.html template includes the stylesheet and javascript sources
   * based on dynamic names calculated in this Gruntfile. This task assembles
   * the list into variables for the template to use and then runs the
   * compilation.
   */
  grunt.registerMultiTask('index', 'Process index.html template', function() {
    var buildDir = 'build/gui';
    var compileDir = 'generated';
    var dirRE = new RegExp('^(' + buildDir + '|' + compileDir + ')\/', 'g');
    var jsFiles = filterForJS(this.filesSrc).map(function(file) {
      return file.replace(dirRE, '');
    });
    var cssFiles = filterForCSS(this.filesSrc).map(function(file) {
      return file.replace(dirRE, '');
    });

    grunt.file.copy('src/index.html', this.data.dir + '/index.html', {
      process: function(contents) {
        return grunt.template.process(contents, {
          data: {
            scripts: jsFiles,
            styles: cssFiles,
            version: common.kalabox.version
          }
        });
      }
    });
  });

  // Build the gui
  // NOTE: doesnt really do anything, just a common task
  grunt.registerTask('gui:build', [
    'test:code',
    'clean:guiBuild',
    'bower-install-simple:install',
    'html2js',
    'sass:compile',
    'concat:buildCss',
    'copy:guiBuild',
    'index:build'
  ]);

  // Run the gui from source
  grunt.registerTask('gui', [
    'gui:build',
    'nwjs:run'
  ]);

  // Pkg the NWJS app
  grunt.registerTask('pkg:gui', [
    'clean:guiDist',
    'gui:build',
    'shell:guiInstall',
    'nwjs:pkg'
  ]);

  // Pkg the CLI binary
  grunt.registerTask('pkg:cli', [
    'clean:cliBuild',
    'clean:cliDist',
    'copy:cliBuild',
    'shell:cliPkg',
    'copy:cliDist'
  ]);

  // Build the installer
  //
  // @NOTE: for reasons that make me want to stab my eyes out with a fucking
  // spoon, you need to grun pkg:gui BEFORE pkg:cli or sass:compile will
  // hang on Windows. THOU HATH BEEN WARNED.
  //
  grunt.registerTask('pkg', [
    'clean:installerBuild',
    'clean:installerDist',
    'copy:installerBuild',
    'pkg:gui',
    'pkg:cli',
    'shell:installerPkg' + common.system.platform,
    'copy:installerDist'
  ]);

  // Check Linting, standards and styles
  grunt.registerTask('test:code', [
    'jshint',
    'jscs',
    'htmlangular',
    'mdlint'
  ]);

  // Run unit tests
  grunt.registerTask('test:unit', [
    'mochacli:unit'
  ]);

  // Run Installer tests
  grunt.registerTask('func', [
    'shell:installer' + common.system.platform + 'Bats'
  ]);

  // Bump our minor version
  grunt.registerTask('bigrelease', [
    'bump:minor'
  ]);

  // Bump our patch version
  grunt.registerTask('release', [
    'bump:patch'
  ]);

  // Do a prerelease version
  grunt.registerTask('prerelease', [
    'bump:prerelease'
  ]);

};
