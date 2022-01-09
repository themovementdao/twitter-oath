FROM node:14.17.6-alpine as build
# Created the app work dir
WORKDIR /app

# Add node to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# Copy app configs
COPY package.json ./
COPY package-lock.json ./

# Install app dependencies
RUN npm install --silent

COPY . .

EXPOSE 3000

CMD ["npm","run","start"]