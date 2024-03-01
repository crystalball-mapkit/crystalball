FROM node:12.22.3-alpine3.13
WORKDIR /app
COPY package*.json ./
RUN apk update
RUN apk add --update postgresql-client
RUN npm install
COPY . .
RUN chmod a+x *.sh
ENTRYPOINT ["./entrypoint.sh" ]
EXPOSE 3000
