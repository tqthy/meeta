FROM docker.io/library/debian:bookworm-slim

ARG JITSI_RELEASE=stable
ENV JITSI_RELEASE=${JITSI_RELEASE}
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

COPY rootfs /
COPY scripts/setup-base.sh /tmp/setup-base.sh

RUN /bin/bash /tmp/setup-base.sh && rm /tmp/setup-base.sh

ENTRYPOINT [ "/init" ]
