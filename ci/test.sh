#!/bin/bash

#+before-install
#+echo
#+echo v0.9
#v0.9
#+echo false
#false
#+echo kalabox/kalabox
#kalabox/kalabox
#+echo 0.12
#0.12
#+echo /home/travis/build/kalabox/kalabox
#/home/travis/build/kalabox/kalabox

TRAVIS_TAG=""
TRAVIS_BRANCH="v0.9"
TRAVIS_PULL_REQUEST=false
TRAVIS_REPO_SLUG="kalabox/kalabox"
TRAVIS_NODE_VERSION="0.12"
TRAVIS_BUILD_DIR="/Users/mpirog/Desktop/work/kalabox"

echo $TRAVIS_TAG
echo $TRAVIS_BRANCH
echo $TRAVIS_PULL_REQUEST
echo $TRAVIS_REPO_SLUG
echo $TRAVIS_NODE_VERSION
echo $TRAVIS_BUILD_DIR

cd $TRAVIS_BUILD_DIR


# Check for correct travis conditions aka
# 1. Is not a pull request
# 2. Is not a "travis" tag
# 3. Is correct slug
# 4. Is latest node version
if [ $TRAVIS_PULL_REQUEST == "false" ] &&
  [ -z "$TRAVIS_TAG" ] &&
  [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ] &&
  [ $TRAVIS_NODE_VERSION == "0.12" ]; then

  # Try to grab our git tag
  DISCOTAG=$(git describe --contains HEAD)

  # Only do stuff if our DISCO_TAG exists and indicates our commit is a tagged commit
  # If this is all true then we want to roll a new package and push up other relevant
  # versioned things
  if [ ! -z "$DISCOTAG" ] && [[ ! "$DISCOTAG" =~ "~" ]]; then

    # SET UP SSH THINGS
    eval "$(ssh-agent)"
    chmod 600 $HOME/.ssh/travis.id_rsa
    ssh-add $HOME/.ssh/travis.id_rsa
    git config --global user.name "Kala C. Bot"
    git config --global user.email "kalacommitbot@kalamuna.com"

    # PUSH BACK TO OUR GIT REPO
    # Bump our things and reset tags
    git tag -d $DISCOTAG
    grunt bump-patch
    git tag $DISCOTAG

    # Reset upstream so we can push our changes to it
    # We need to re-add this in because our clone was originally read-only
    git remote rm origin
    git remote add origin git@github.com:$TRAVIS_REPO_SLUG.git
    git checkout $TRAVIS_BRANCH

    # Add all our new code and push reset tag with ci skipping on
    git add --all
    git commit -m "MAKING VERSION ${DISCOTAG} SO [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify
    git push origin $TRAVIS_BRANCH --tags

    # NODE PACKAGES
    # Deploy to NPM
    $HOME/npm-config.sh > /dev/null
    npm publish ./

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
    git add --all
    git commit -m "Building API DOCS with ${DISCOTAG}"
    git tag $DISCOTAG
    # Push our generated docs to api.kalabox.me
    git push origin master --tags
    # clean up again
    rm -rf $TRAVIS_BUILD_DIR/deploy

    # DEPLOY TEST COVERAGE DOCS TO COVERAGE.KALABOX.ME
    # Clean deploy directory and recreate before we start
    rm -rf $TRAVIS_BUILD_DIR/deploy
    mkdir $TRAVIS_BUILD_DIR/deploy

    # Clone and enter
    git clone git@github.com:kalabox/kalabox-coverage.git $TRAVIS_BUILD_DIR/deploy
    cd $TRAVIS_BUILD_DIR/deploy

    # Copy over generated coverage reports
    TRAVIS_REPO=$(echo $TRAVIS_REPO_SLUG | awk -F'/' '{print $2}')
    mkdir -p $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
    rsync -rt --exclude=.git --delete $TRAVIS_BUILD_DIR/coverage/ $TRAVIS_BUILD_DIR/deploy/$TRAVIS_REPO
    git add --all
    git commit -m "Building COVERAGE DOCS with ${DISCOTAG}"
    git tag $DISCOTAG
    # Deploy it!
    git push origin master --tags
    # Clean up again
    rm -rf $TRAVIS_BUILD_DIR/deploy
  fi
fi
