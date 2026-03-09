FROM node:22-alpine

# System deps: git for clone/commit/push, bash for entrypoint
RUN apk add --no-cache git bash

# Install Claude Code CLI (version-pinned)
RUN npm install -g @anthropic-ai/claude-code@~2.1.0 && npm cache clean --force

# Non-root user
RUN addgroup -g 1001 claude && adduser -u 1001 -G claude -D -h /home/claude claude

# Writable dirs (emptyDir volumes will overlay these in K8s,
# but for local docker run these defaults still work)
RUN mkdir -p /workspace /home/claude/.claude && chown -R claude:claude /workspace /home/claude

COPY --chown=claude:claude entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER claude
WORKDIR /workspace

ENTRYPOINT ["entrypoint.sh"]
