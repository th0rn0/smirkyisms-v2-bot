FROM node:13
MAINTAINER dev@th0rn0.co.uk

ENV DB_FILE /database/db.json

WORKDIR /usr/src/app

COPY src /usr/src/app

RUN mkdir /usr/src/app/database && chmod -R 777 /usr/src/app/database

RUN npm install pm2 -g

RUN npm install

ENTRYPOINT ["pm2-runtime"]
CMD ["app.js", "--prod "]