FROM node:13
MAINTAINER dev@thrn0.co.uk

WORKDIR /usr/src/app

COPY src /usr/src/app

RUN mkdir /database && chmod -R 777 /database

RUN npm install pm2 -g

RUN npm install

ENTRYPOINT ["pm2-runtime"]
CMD ["app.js", "--prod "]