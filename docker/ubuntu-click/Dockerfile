FROM dorowu/ubuntu-desktop-lxde-vnc:focal

ENV DEBIAN_FRONTEND=noninteractive

RUN rm -f /etc/apt/sources.list.d/google-chrome.list /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    xz-utils \
    git \
    python3 \
    make \
    g++ \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libxshmfence1 \
    libxkbfile1 \
    libsecret-1-0 \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@9.15.4 --activate

RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg \
  && echo "deb [arch=amd64,arm64,armhf] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends code \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
