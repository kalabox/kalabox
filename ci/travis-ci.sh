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
  # Add our key
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z $TRAVIS_TAG ]) &&
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ]; then
      openssl aes-256-cbc -K $encrypted_fbe4451c16b2_key -iv $encrypted_fbe4451c16b2_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi
}

#$ node -pe 'JSON.parse(process.argv[1]).foo' "$(cat foobar.json)"

# before-script
#
# Setup Drupal to run the tests.
#
before-script() {
  npm install -g grunt-cli
}

# script
#
# Run the tests.
#
script() {
  sudo ln -s bin/kbox.js /usr/local/bin/kbox
  # Code l/hinting and standards
  grunt test:code
  # @todo clean this up
  EXIT_STATUS=$?
  if [[ $EXIT_STATUS != 0 ]] ; then
    exit $EXIT_STATUS
  fi

  # Unit tests and coverage reports
  grunt test
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
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z $TRAVIS_TAG ])
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ]; then

    COMMIT_MESSAGE=$(git log --format=%B -n 1)
    BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
    # BUMP patch but only on master and not a tag
    if [ -z $TRAVIS_TAG ] && [ $TRAVIS_BRANCH == "master" ] && [ "${COMMIT_MESSAGE}" != "Release v${BUILD_VERSION}" ] ; then
      grunt bump-patch
    fi
    # Get updated build version
    BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
    chmod 600 $HOME/.ssh/travis.id_rsa
    eval "$(ssh-agent)"
    ssh-add $HOME/.ssh/travis.id_rsa
    # Set a user for things
    git config --global user.name "Kala C. Bot"
    git config --global user.email "kalacommitbot@kalamuna.com"
    # Set up our repos
    # We need to re-add this in because our clone was originally read-only
    git remote rm origin
    git remote add origin git@github.com:$TRAVIS_REPO_SLUG.git
    git checkout $TRAVIS_BRANCH
    git add -A
    if [ -z $TRAVIS_TAG ]; then
      git commit -m "KALABOT BUILDING NEGATIVE POWER COUPLING VERSION ${BUILD_VERSION} [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify
    fi
    git push origin $TRAVIS_BRANCH
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
