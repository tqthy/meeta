FROM docker.io/library/debian:bookworm-slim

ARG JITSI_RELEASE=stable
ENV JITSI_RELEASE=${JITSI_RELEASE}
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

COPY base/rootfs/ /
COPY base/scripts/setup-base.sh /tmp/setup-base.sh
COPY base/scripts/setup-base-java.sh /tmp/setup-base-java.sh

RUN /bin/bash /tmp/setup-base.sh && rm /tmp/setup-base.sh && \
    /bin/bash /tmp/setup-base-java.sh && rm /tmp/setup-base-java.sh

ENTRYPOINT [ "/init" ]
