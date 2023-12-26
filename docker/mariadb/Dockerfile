# Multi-stage docker build. Builds data first, and then switches to pure MariaDB.
FROM mariadb:10 as generate

WORKDIR /usr/app

ENV KNEXFILE=./docker/mariadb/knexfile

# Install node
ARG NODE_MAJOR=20
RUN apt-get update
RUN apt-get -y install ca-certificates curl gnupg git
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update
RUN apt-get -y install nodejs

# Copy and install dependencies
COPY ./package*.json .
RUN npm ci
RUN npm i mysql2

# Copy repo
COPY . .

# Build it
COPY docker/mariadb/my.cnf /etc/mysql/my.cnf
RUN chmod +x docker/mariadb/build_db.sh
RUN docker/mariadb/build_db.sh

## Just the DB with data
FROM mariadb:10

COPY --from=generate /etc/mysql /etc/mysql
COPY --from=generate /data /data

ENTRYPOINT []
CMD [ "mysqld", "--user=root" ]
