FROM node:alpine

WORKDIR /app

COPY package-lock.json package.json /app/
RUN npm install

COPY app.js /app

ENV REDIS_URL=redis
ENV FORCE_COLOR=1

ENTRYPOINT ["node"]
CMD ["app.js"]
