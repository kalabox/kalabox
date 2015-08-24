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
  echo $TRAVIS_TAG
  echo $TRAVIS_BRANCH
  echo $TRAVIS_PULL_REQUEST
  echo $TRAVIS_REPO_SLUG
  echo $TRAVIS_NODE_VERSION
  echo $TRAVIS_BUILD_DIR

  # Add our key
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z "$TRAVIS_TAG" ]) &&
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ]; then
      openssl aes-256-cbc -K $encrypted_fbe4451c16b2_key -iv $encrypted_fbe4451c16b2_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi
}

# before-script
#
# Run before tests
#
before-script() {
  # Global install some npm things
  npm install -g grunt-cli
  npm install -g npm
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
  run_command grunt jsdoc:safe
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
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z "$TRAVIS_TAG" ]) &&
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ]; then

    # Only do our stuff on the latest node version
    if [ $TRAVIS_NODE_VERSION == "0.12" ] ; then
      # DO VERSION BUMPING FOR KALABOX/KALABOX
      COMMIT_MESSAGE=$(git log --format=%B -n 1)
      BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
      # BUMP patch but only on master and not a tag
      if [ -z "$TRAVIS_TAG" ] && [ $TRAVIS_BRANCH == "master" ] && [ "${COMMIT_MESSAGE}" != "Release v${BUILD_VERSION}" ] ; then
        grunt bump-patch
      fi
      # Get updated build version
      BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
      chmod 600 $HOME/.ssh/travis.id_rsa

      # SET UP SSH THINGS
      eval "$(ssh-agent)"
      ssh-add $HOME/.ssh/travis.id_rsa
      git config --global user.name "Kala C. Bot"
      git config --global user.email "kalacommitbot@kalamuna.com"

      # RESET UPSTREAM SO WE CAN PUSH VERSION CHANGES TO IT
      # We need to re-add this in because our clone was originally read-only
      git remote rm origin
      git remote add origin git@github.com:$TRAVIS_REPO_SLUG.git
      git checkout $TRAVIS_BRANCH
      git add -A
      if [ -z "$TRAVIS_TAG" ]; then
        git commit -m "KALABOT BUILDING NEGATIVE POWER COUPLING VERSION ${BUILD_VERSION} [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify
      fi
      git push origin $TRAVIS_BRANCH

      # DEPLOY OUR BUILD TO NPM
      $HOME/npm-config.sh > /dev/null
      npm publish ./

      # PUSH OUR GENERATED JSDOCS TO API.KALABOX.ME
      rm -rf $TRAVIS_BUILD_DIR/deploy
      mkdir $TRAVIS_BUILD_DIR/deploy
      git clone git@github.com:kalabox/kalabox-api.git $TRAVIS_BUILD_DIR/deploy
      cd $TRAVIS_BUILD_DIR/deploy
      rsync -rt --exclude=.git --delete $TRAVIS_BUILD_DIR/doc/ $TRAVIS_BUILD_DIR/deploy/
      git add --all
      git commit -m "Building API DOCS with ${BUILD_VERSION}"
      if [ ! -z "$TRAVIS_TAG" ]; then
        git tag $TRAVIS_TAG
      fi
      # deploy it!
      git push origin master --tags
      # clean up again
      rm -rf $TRAVIS_BUILD_DIR/deploy

      # PUSH OUR GENERATED TEST COVERAGE REPORTS TO COVERAGE.KALABOX.ME
      rm -rf $TRAVIS_BUILD_DIR/deploy
      mkdir $TRAVIS_BUILD_DIR/deploy
      cd $TRAVIS_BUILD_DIR/deploy
      TRAVIS_REPO=$(echo $TRAVIS_REPO_SLUG | awk -F'/' '{print $2}')
      git clone git@github.com:kalabox/kalabox-coverage.git $TRAVIS_BUILD_DIR/deploy
      mkdir -p $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
      rsync -rt --exclude=.git --delete $TRAVIS_BUILD_DIR/coverage/ $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
      git add --all
      git commit -m "Building COVERAGE DOCS with ${BUILD_VERSION}"
      if [ ! -z "$TRAVIS_TAG" ]; then
        git tag $TRAVIS_TAG
      fi
      # deploy it!
      git push origin master --tags
      # clean up again
      rm -rf $TRAVIS_BUILD_DIR/deploy
    fi
  else
    exit $EXIT_VALUE
  fi
}

# before-deploy
#
# Clean up after the tests.
#
before-deploy() {
  echo
}

# after-deploy
#
# Clean up after the tests.
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
