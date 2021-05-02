FROM onjin/alpine-postgres:13.0

# envsubst dependency
RUN apk add --no-cache gettext

# The entrypoint creates the certificate
ADD crontab crontab.envsubst
ADD docker-entrypoint.sh /

RUN chmod a+x *.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

# We run cron in foreground to update the certificates
CMD ["/usr/sbin/crond", "-f"]
