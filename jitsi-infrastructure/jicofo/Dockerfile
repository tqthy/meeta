FROM docker.io/library/debian:bookworm-slim

ARG JITSI_RELEASE=stable
ENV JITSI_RELEASE=${JITSI_RELEASE}
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

COPY base/rootfs/ /
COPY base/scripts/setup-base.sh /tmp/setup-base.sh
COPY base/scripts/setup-base-java.sh /tmp/setup-base-java.sh

RUN /bin/bash /tmp/setup-base.sh && rm /tmp/setup-base.sh && \
    /bin/bash /tmp/setup-base-java.sh && rm /tmp/setup-base-java.sh

LABEL org.opencontainers.image.title="Jitsi Conference Focus (jicofo)"
LABEL org.opencontainers.image.description="Server-side focus component that manages media sessions and acts as load balancer."
LABEL org.opencontainers.image.url="https://github.com/jitsi/jicofo"
LABEL org.opencontainers.image.source="https://github.com/jitsi/docker-jitsi-meet"
LABEL org.opencontainers.image.documentation="https://jitsi.github.io/handbook/"

RUN apt-dpkg-wrap apt-get update && \
    apt-dpkg-wrap apt-get install -y jicofo && \
    apt-cleanup

COPY jicofo/rootfs/ /

VOLUME /config

ENTRYPOINT [ "/init" ]
