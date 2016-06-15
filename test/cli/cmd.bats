#!/usr/bin/env bats

#
# Tests to build/pull the docker images we ship with this app
#

# Load up environment
load env

#
# Setup some things
#
setup() {

  # Location of our dockerfiles
  CMD_DOCKERFILES_DIR=${TRAVIS_BUILD_DIR}/plugins/kalabox-cmd/dockerfiles/

}

#
# Function to rety docker builds if they fail
#
kbox-docker-build-retry() {

  # Get args
  IMAGE=$1
  TAG=$2
  DOCKERFILE=$3

  # Try a few times
  NEXT_WAIT_TIME=0
  until $DOCKER build -t $IMAGE:$TAG $DOCKERFILE || [ $NEXT_WAIT_TIME -eq 5 ]; do
    sleep $(( NEXT_WAIT_TIME++ ))
  done

  # If our final try has been met we assume failure
  #
  # @todo: this can be better since this could false negative
  #        on the final retry
  #
  if [ $NEXT_WAIT_TIME -eq 5 ]; then
    exit 666
  fi

}

# Check that we can build the cli image without an error.
@test "Check that we can build the cli image without an error." {
  run kbox-docker-build-retry kalabox/cli testing $CMD_DOCKERFILES_DIR/cli
  [ "$status" -eq 0 ]
}

# Check that our image version is the stable tag
@test "Check that our image version is the stable tag." {
  cat ${TRAVIS_BUILD_DIR}/plugins/kalabox-cmd/kalabox-compose.yml | grep "image: kalabox/cli:" | grep "stable"
}

# Check that we can compile native stuff with node-gyp.
@test "Check that we can compile native stuff with node-gyp." {
  run $DOCKER run --entrypoint npm kalabox/cli:testing install -g node-sass
  echo "print fail"
  [ "$status" -eq 0 ]
}

#
# BURN IT TO THE GROUND!!!!
# Add a small delay before we run other things
#
teardown() {
  sleep 1
}
