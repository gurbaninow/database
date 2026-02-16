#!/bin/bash

set -eo pipefail

# Install the database
echo "Installing MariaDB"
mariadb-install-db

# Start the MariaDB daemon in the background.
echo "Starting MariaDB daemon"
mariadbd --user=root &
mariadb_pid=$!

echo "Waiting for database to come up"
until mariadb-admin ping >/dev/null 2>&1; do
  echo -n "."; sleep 0.2
done

echo "Removing MariaDB default users"
mariadb --protocol=socket -h localhost -u root -e "DELETE FROM mysql.user WHERE user=''"
echo "Creating gurbaninow MariaDB user"
mariadb --protocol=socket -h localhost -u root -e "CREATE USER 'gurbaninow'@'%'"
echo "Creating gurbaninow database"
mariadb --protocol=socket -h localhost -u root -e "CREATE DATABASE \`gurbaninow\`"
echo "Granting priviledges to gurbaninow database"
mariadb --protocol=socket -h localhost -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'gurbaninow'@'%'"
mariadb --protocol=socket -h localhost -u root -e "FLUSH PRIVILEGES"

# Populate the database with data
echo "Populating data"
npm run build-mysql

# Tell the MariaDB daemon to shutdown.
echo "Shutting down MariaDB"
mariadb-admin shutdown

# Wait for the MariaDB daemon to exit.
wait $mariadb_pid
