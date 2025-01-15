FROM node:22-alpine

# set working directory
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

# copy all from root, except .dockerignored
COPY . .

# buildin ts
RUN npm run build

# for removing devdep
RUN npm prune --production

# app start commanda
CMD ["node", "dist/index.js"]
