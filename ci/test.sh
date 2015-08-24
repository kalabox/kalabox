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
#   1. Is not a pull request
#   2. Is not a "travis" tag
#   3. Is correct slug
#   4. Is latest node version
if [ $TRAVIS_PULL_REQUEST == "false" ] &&
  [ -z "$TRAVIS_TAG" ] &&
  [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ] &&
  [ $TRAVIS_NODE_VERSION == "0.12" ]; then

  # Try to grab our git tag
  DISCO_TAG=$(git describe --contains HEAD)
  echo $DISCO_TAG
  # Grab our package.json version
  BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
  echo $BUILD_VERSION

  # Only do stuff if
  #   1. DISCO_TAG is non-empty
  #   2. Our commit is a tagged commit
  #   3. Our branch name is contained within the tag
  # If this is all true then we want to roll a new package and push up other relevant
  # versioned thing. This gaurantees that we can still tag things without setting off a build/deploy
  if [ ! -z "$DISCO_TAG" ] && [[ ! "$DISCO_TAG" =~ "~" ]] && [[ "$DISCO_TAG" =~ "$TRAVIS_BRANCH" ]]; then

    # Split our package version and tag into arrays so we can make sure our tag is larger
    # than the package version
    IFS='.' read -a BUILD_ARRAY <<< "$BUILD_VERSION"
    IFS='.' read -a DISCO_ARRAY <<< "$DISCO_TAG"

    # Build and deploy packages only in the two scenarios
    #   1. If our minor versions are the same and the tag patch version is larger
    #   2. If this is a new minor version and that minor version is larger than previous minor versions
    if [ "${DISCO_ARRAY[1]}" -gt "${BUILD_ARRAY[1]}" ] ||
      ([ "${DISCO_ARRAY[1]}" -eq "${BUILD_ARRAY[1]}" ] && [ "${DISCO_ARRAY[2]}" -gt "${BUILD_ARRAY[2]}" ]); then
      echo "TAG PATCH IS LARGER"
    fi
  fi
fi
