FROM mdillon/postgis:11-alpine
LABEL Crystalball-Mapkit Dev

RUN chmod a+x *.sh
COPY ./initdb.sh /docker-entrypoint-initdb.d/initdb.sh