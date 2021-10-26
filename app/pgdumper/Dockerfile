FROM onjin/alpine-postgres:13.0

# envsubst dependency
RUN apk update && apk add --no-cache gettext python3-dev py3-pip gcc musl-dev

RUN pip install pyyaml requests boto3 psycopg2-binary

# The entrypoint creates the certificate
ADD crontab crontab.envsubst
ADD docker-entrypoint.sh /
ADD maintenance.py /

RUN chmod a+x *.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

# We run cron in foreground to update the certificates
CMD ["/usr/sbin/crond", "-f"]
