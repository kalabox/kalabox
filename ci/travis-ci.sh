#!/bin/bash

COMMAND=$1
EXIT_VALUE=0

##
# SCRIPT COMMANDS
##

# before-install
#
# Do some stuff before npm install
#
before-install() {

  # Gather intel
  echo "TRAVIS_TAG: ${TRAVIS_TAG}"
  echo "TRAVIS_BRANCH: ${TRAVIS_BRANCH}"
  echo "TRAVIS_PULL_REQUEST: ${TRAVIS_PULL_REQUEST}"
  echo "TRAVIS_REPO_SLUG: ${TRAVIS_REPO_SLUG}"
  echo "TRAVIS_BUILD_DIR: ${TRAVIS_BUILD_DIR}"
  echo "TRAVIS_OS_NAME: ${TRAVIS_OS_NAME}"
  echo "PATH: ${PATH}"

  # Set this to dev mode by default
  export BUILD_MODE="development"

  # Add our key
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ] &&
    [ $TRAVIS_OS_NAME == "linux" ]; then
      openssl aes-256-cbc -K $encrypted_fbe4451c16b2_key -iv $encrypted_fbe4451c16b2_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi

  # Set OSX specific ENV stuff
  if [ $TRAVIS_OS_NAME == "linux" ]; then
    JX_PLATFORM="jx_deb64v8"
  else
    JX_PLATFORM="jx_osx64v8"
  fi

  # We should have a default node in both OSX and LINUX
  # The code is old sir but it checks out
  npm install -g grunt-cli

  # Create the home bin dir since this already exists in the path by default
  mkdir -p "${HOME}/bin"
  ln -s "$(which grunt)" "${HOME}/bin/grunt"

  # Install JX core
  # Manually get and install JXCORE for each OS until
  # https://github.com/jxcore/jxcore-release/issues/1 gets resolved
  JX_VERSION="0311"
  curl -fsSL -o /tmp/jxcore.zip "https://raw.githubusercontent.com/jxcore/jxcore-release/master/${JX_VERSION}/${JX_PLATFORM}.zip"
  unzip /tmp/jxcore.zip -d /tmp/jx
  mv "/tmp/jx/${JX_PLATFORM}/jx" "${HOME}/bin/jx"
  chmod +x "${HOME}/bin/jx"

}

# install
#
# Install our project
#
install() {

  # Sanity checks
  node --version
  npm --version
  grunt --version
  jx --version
  jx --jxversion

  # Normal NPM install
  npm install
}


# before-script
#
# Run before tests
#
before-script() {
  echo
}

# script
#
# Run the tests.
#
script() {

  # Tests
  run_command grunt test:code
  run_command bin/kbox.js config
  run_command grunt test
  run_command grunt docs

  # Do a basic jx build for a very basic test
  run_command grunt pkg --dev>/dev/null
  run_command dist/kbox* version

}

# after-script
#
# Clean up after the tests.
#
after-script() {
  echo
}

# after-success
#
# Clean up after the tests.
#
after-success() {

  # Check for correct travis conditions when we have merged code
  # 1. Is not a pull request
  # 2. Is not a "travis" tag
  # 3. Is correct slug
  # 4. Is latest node version
  # 5. Is on linux
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ ! -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ] &&
    [ $TRAVIS_OS_NAME == "linux" ]; then

    # DEPLOY API DOCS to API.KALABOX.ME
    # Clean deploy directory and recreate before we start
    rm -rf $TRAVIS_BUILD_DIR/deploy
    mkdir $TRAVIS_BUILD_DIR/deploy

    # Clone down our current API docs and switch to it
    git clone git@github.com:kalabox/kalabox-api.git $TRAVIS_BUILD_DIR/deploy
    cd $TRAVIS_BUILD_DIR/deploy

    # Move generated docs into our deploy directory
    rsync -rt --exclude=.git --delete $TRAVIS_BUILD_DIR/doc/ $TRAVIS_BUILD_DIR/deploy/

    # Add, tag, commit and deploy our new API docs
    # Push our generated docs to api.kalabox.me
    # clean up again
    git add --all
    git commit -m "${COMMIT_MSG} API DOCS with ${DISCO_TAG}"
    git tag $DISCO_TAG
    git push origin master --tags
    rm -rf $TRAVIS_BUILD_DIR/deploy

    # DEPLOY TEST COVERAGE DOCS TO COVERAGE.KALABOX.ME
    # Clean deploy directory and recreate before we start
    rm -rf $TRAVIS_BUILD_DIR/deploy
    mkdir $TRAVIS_BUILD_DIR/deploy

    # Clone and enter
    git clone git@github.com:kalabox/kalabox-coverage.git $TRAVIS_BUILD_DIR/deploy
    cd $TRAVIS_BUILD_DIR/deploy

    # Copy over generated coverage reports
    # Deploy it!
    # Clean up again
    TRAVIS_REPO=$(echo $TRAVIS_REPO_SLUG | awk -F'/' '{print $2}')
    mkdir -p $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
    rsync -rt --exclude=.git --delete $TRAVIS_BUILD_DIR/coverage/ $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
    git add --all
    git commit -m "${COMMIT_MSG} COVERAGE DOCS with ${DISCO_TAG}"
    git tag $DISCO_TAG
    git push origin master --tags
    rm -rf $TRAVIS_BUILD_DIR/deploy

    # Switch back to build DIR
    cd $TRAVIS_BUILD_DIR
  fi
}

# before-deploy
#
# Do stuff before deploy
#
before-deploy() {

  # Do the build again
  grunt pkg --dev>/dev/null

  # Get relevant things to rename our build
  BUILD_HASH=$(git rev-parse --short HEAD)
  BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
  if [ $TRAVIS_OS_NAME == "linux" ]; then
    BUILD_PLATFORM="linux"
  else
    BUILD_PLATFORM="osx"
  fi

  # Rename our build and produce a latest build
  mv dist/kbox* dist/kbox-$BUILD_PLATFORM-x64-v$BUILD_VERSION-$BUILD_HASH-dev
  cp dist/kbox* dist/kbox-$BUILD_PLATFORM-x64-v$BUILD_VERSION-latest-dev

}

# after-deploy
#
# Do stuff after deploy
#
after-deploy() {
  echo
}

##
# UTILITY FUNCTIONS:
##

# Sets the exit level to error.
set_error() {
  EXIT_VALUE=1
  echo "$@"
}

# Runs a command and sets an error if it fails.
run_command() {
  set -xv
  if ! $@; then
    set_error
  fi
  set +xv
}

##
# SCRIPT MAIN:
##

# Capture all errors and set our overall exit value.
trap 'set_error' ERR

# We want to always start from the same directory:
cd $TRAVIS_BUILD_DIR

case $COMMAND in
  before-install)
    run_command before-install
    ;;

  install)
    run_command install
    ;;

  before-script)
    run_command before-script
    ;;

  script)
    run_command script
    ;;

  after-script)
    run_command after-script
    ;;

  after-success)
    run_command after-success
    ;;

  before-deploy)
    run_command before-deploy
    ;;

  after-deploy)
    run_command after-deploy
    ;;
esac

exit $EXIT_VALUE
