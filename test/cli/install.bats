#!/usr/bin/env bats

#
# Basic tests to verify that Kalabox has been installed
#

# Load up environment
load env

# Check that the Kalabox CLI is in the PATH
@test "Check that kalabox-cli is in PATH" {
  run which $KBOX
  [ "$status" -eq 0 ]
}

# Check that '$KBOX' returns without error
@test "Check that '$KBOX' returns without error" {
  run $KBOX
  [ "$status" -eq 1 ]
}

# Check that '$KBOX config' returns without error
@test "Check that '$KBOX config' returns without error" {
  run $KBOX config
  [ "$status" -eq 0 ]
}

# Check that '$KBOX create' returns without error
@test "Check that '$KBOX create' returns without error" {
  run $KBOX create
  [ "$status" -eq 1 ]
}

# Check that '$KBOX create' contains 'pantheon' as a choice
@test "Check that '$KBOX create' contains 'pantheon' as a choice" {
  $KBOX create | grep pantheon
}

# Check that '$KBOX env' returns without error
@test "Check that '$KBOX env' returns without error" {
  run $KBOX env
  [ "$status" -eq 0 ]
}

# Check that '$KBOX list' returns without error
@test "Check that '$KBOX list' returns without error" {
  run $KBOX list
  [ "$status" -eq 0 ]
}

# Check that '$KBOX version' returns without error
@test "Check that '$KBOX version' returns without error" {
  run $KBOX version
  [ "$status" -eq 0 ]
}

# Check that core dns container exists
@test "Check that core dns container exists and is running." {
  $DOCKER inspect kalabox_dns_1 | grep "\"Running\": true"
}

# Check that core proxy container exists
@test "Check that core proxy container exists and is running." {
  $DOCKER inspect kalabox_proxy_1 | grep "\"Running\": true"
}

# Check that DNS has been set
@test "Check that '10.13.37.100' exists in '/etc/resolver/kbox'" {
  cat /etc/resolver/kbox | grep 10.13.37.100
}

# Check that '10.13.37.100' can be pinged
@test "Check that '10.13.37.100' can be pinged" {
  ping -c 1 10.13.37.100
}
