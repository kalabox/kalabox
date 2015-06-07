#!/bin/sh
#
# Helpful git pre-commit hook to minimize "fix code standards" commits
#
# Installation:
#
#   cd /dir/to/kalabox
#   ln -s /dir/to/kalabox/scripts/pre-commit.sh .git/hooks/pre-commit
#
grunt test:code
