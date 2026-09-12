FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Activates the Kendo UI license from telerik-license.txt (present in the
# build context but gitignored) before building — otherwise the built
# bundle has no license baked in and shows the "License key missing" banner
# to every visitor, even though a real license is owned.
RUN npx kendo-ui-license activate
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine
COPY --from=build /app/dist/client/browser /usr/share/nginx/html/bingo
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
