FROM node:alpine

# Create app directory
WORKDIR /usr/app

# Install app dependencies
COPY package*.json ./
RUN npm install && \
    npm cache clean --force

# Bundle app source
COPY index.js index.js
COPY ./novelcovid/ ./novelcovid/
COPY ./countryMappings.json ./countryMappings.json

CMD [ "npm", "start" ]
