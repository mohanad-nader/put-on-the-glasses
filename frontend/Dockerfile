# ======[ frontend/Dockerfile ]=========
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Angular 17+ writes dist/<project-name>/browser. The project name in angular.json is "frontend".
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
