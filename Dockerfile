FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Solo lo necesario para servir: sin dependencias npm.
COPY --chown=node:node server.js index.html robots.txt sitemap.xml LICENSE ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node functions ./functions
COPY --chown=node:node assets ./assets
COPY --chown=node:node data ./data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1
CMD ["node", "server.js"]
