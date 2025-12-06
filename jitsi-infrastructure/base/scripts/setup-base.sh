#!/bin/bash
set -euo pipefail

APT_WRAPPER=(/bin/sh /usr/bin/apt-dpkg-wrap)
CLEANUP_WRAPPER=(/bin/sh /usr/bin/apt-cleanup)

JITSI_RELEASE_VALUE=${JITSI_RELEASE:-stable}

dpkgArch="$(dpkg --print-architecture)"
case "${dpkgArch##*-}" in
    amd64)
        TPL_ARCH=amd64
        S6_ARCH=amd64
        ;;
    arm64)
        TPL_ARCH=arm64
        S6_ARCH=aarch64
        ;;
    *)
        echo "unsupported architecture: ${dpkgArch}"
        exit 1
        ;;
esac

"${APT_WRAPPER[@]}" apt-get update
"${APT_WRAPPER[@]}" apt-get install -y apt-transport-https apt-utils ca-certificates gnupg wget curl

wget -qO /usr/bin/tpl "https://github.com/jitsi/tpl/releases/download/v1.4.0/tpl-linux-${TPL_ARCH}"

# Workaround S6 bug when /bin is a symlink
wget -qO /tmp/s6.tar.gz "https://github.com/just-containers/s6-overlay/releases/download/v1.22.1.0/s6-overlay-${S6_ARCH}.tar.gz"
mkdir -p /tmp/s6

tar xfz /tmp/s6.tar.gz -C /tmp/s6
tar hxfz /tmp/s6.tar.gz -C /
rm -f /usr/bin/execlineb
cp /tmp/s6/bin/execlineb /usr/bin/
rm -rf /tmp/s6 /tmp/s6.tar.gz

wget -qO - https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmour > /etc/apt/trusted.gpg.d/jitsi.gpg
echo "deb https://download.jitsi.org ${JITSI_RELEASE_VALUE}/" > /etc/apt/sources.list.d/jitsi.list
echo "deb http://ftp.debian.org/debian bookworm-backports main" > /etc/apt/sources.list.d/backports.list

"${APT_WRAPPER[@]}" apt-get update
"${APT_WRAPPER[@]}" apt-get dist-upgrade -y
"${CLEANUP_WRAPPER[@]}"
chmod +x /usr/bin/tpl

if [ "${JITSI_RELEASE_VALUE}" = "unstable" ]; then
    "${APT_WRAPPER[@]}" apt-get update
    "${APT_WRAPPER[@]}" apt-get install -y jq procps curl vim iputils-ping net-tools
    "${CLEANUP_WRAPPER[@]}"
fi
