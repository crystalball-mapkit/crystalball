#!/bin/sh

envsubst '\$DATABASE' < crontab.envsubst > crontab
/usr/bin/crontab crontab
rm crontab crontab.envsubst

exec "$@"
