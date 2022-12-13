# develop stage
FROM node:18-alpine as develop-stage
RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@7.18.1 --activate 
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .

# build stage
FROM develop-stage as build-stage
RUN pnpm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]