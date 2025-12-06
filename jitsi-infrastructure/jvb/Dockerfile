FROM docker.io/library/debian:bookworm-slim

ARG JITSI_RELEASE=stable
ENV JITSI_RELEASE=${JITSI_RELEASE}
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

COPY base/rootfs/ /
COPY base/scripts/setup-base.sh /tmp/setup-base.sh
COPY base/scripts/setup-base-java.sh /tmp/setup-base-java.sh

RUN /bin/bash /tmp/setup-base.sh && rm /tmp/setup-base.sh && \
    /bin/bash /tmp/setup-base-java.sh && rm /tmp/setup-base-java.sh

LABEL org.opencontainers.image.title="Jitsi Videobridge (jvb)"
LABEL org.opencontainers.image.description="WebRTC compatible server designed to route video streams amongst participants in a conference."
LABEL org.opencontainers.image.url="https://jitsi.org/jitsi-videobridge/"
LABEL org.opencontainers.image.source="https://github.com/jitsi/docker-jitsi-meet"
LABEL org.opencontainers.image.documentation="https://jitsi.github.io/handbook/"

RUN apt-dpkg-wrap apt-get update && \
    apt-dpkg-wrap apt-get install -y jitsi-videobridge2 jitsi-autoscaler-sidecar jq curl iproute2 dnsutils libpcap0.8 && \
    apt-cleanup

COPY jvb/rootfs/ /

VOLUME /config

ENTRYPOINT [ "/init" ]
