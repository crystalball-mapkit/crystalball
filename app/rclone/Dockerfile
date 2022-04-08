FROM alpine:3.6

# Install deps
RUN apk add --no-cache libressl ca-certificates gettext

# Install rclone
# If it fails replace first line below with:
RUN wget https://crystalball-mapkit.s3.us-east-2.amazonaws.com/assets/programs/rclone-v1.40-linux-amd64.zip
# If that fails, download the rclone folder from the link below and install it in your own s3 bucket 
# RUN wget https://downloads.rclone.org/v1.40/rclone-v1.40-linux-amd64.zip
RUN unzip /rclone-v1.40-linux-amd64.zip
RUN mv /rclone-v1.40-linux-amd64/rclone /usr/bin
RUN rm /rclone-v1.40-linux-amd64.zip
RUN rm -rf /rclone-v1.40-linux-amd64


# Add scripts
ADD sync.sh /root/sync.sh
RUN chmod +x /root/sync.sh

ADD docker-entrypoint.sh docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ADD crontab crontab 
RUN /usr/bin/crontab crontab
RUN rm crontab

ADD rclone.s3.conf.envsubst rclone.s3.conf.envsubst
RUN chmod a+x *.sh
# We run cron in foreground to update the certificates
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/sbin/crond", "-f"]
