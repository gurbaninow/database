# Multi-stage docker build. Builds data first, and then switches to pure MariaDB.
FROM mariadb:12 as generate

WORKDIR /usr/app

# Install node
RUN apt-get update && apt-get install -y --no-install-recommends curl git
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash
RUN apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm

# Copy and install dependencies
COPY ./package*.json .
RUN npm ci --no-audit
RUN npm i mysql2 --no-audit --no-save --no-package-lock

# Copy repo
COPY . .

# Build it
ENV KNEXFILE=./docker/mariadb/knexfile
COPY docker/mariadb/my.cnf /etc/mysql/my.cnf
RUN chmod +x docker/mariadb/build_db.sh
RUN docker/mariadb/build_db.sh

## Just the DB with data
FROM mariadb:12

COPY --from=generate /etc/mysql /etc/mysql
COPY --from=generate /data /data

ENTRYPOINT []
CMD [ "mariadbd", "--user=root" ]
