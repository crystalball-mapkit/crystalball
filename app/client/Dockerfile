# develop stage
FROM node:18-alpine as develop-stage
RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@7.18.2 --activate 
WORKDIR /app
ARG VUE_APP_I18N_LOCALE=en
ARG VUE_APP_I18N_FALLBACK_LOCALE=en
ENV VUE_APP_I18N_LOCALE=$VUE_APP_I18N_LOCALE
ENV VUE_APP_I18N_FALLBACK_LOCALE=$VUE_APP_I18N_FALLBACK_LOCALE
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