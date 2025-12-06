#!/bin/bash
set -euo pipefail

APT_WRAPPER=(/bin/sh /usr/bin/apt-dpkg-wrap)
CLEANUP_WRAPPER=(/bin/sh /usr/bin/apt-cleanup)

mkdir -p /usr/share/man/man1
mkdir -p /etc/apt/keyrings

"${APT_WRAPPER[@]}" apt-get update
"${APT_WRAPPER[@]}" apt-get install -y unzip ca-certificates curl gnupg

curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

"${APT_WRAPPER[@]}" apt-get update
"${APT_WRAPPER[@]}" apt-get install -y nodejs openjdk-17-jre-headless openjdk-17-jdk-headless
"${CLEANUP_WRAPPER[@]}"
