#!/bin/sh

# Exit script in case of error
set -e

if [ ! -z "${S3_ACCESS_KEY}" ]; then
    rclone sync -v --config /rclone.s3.conf /geodatadir/ crystalball:geodatadir/
    rclone sync -v --config /rclone.s3.conf /pgdumps/ crystalball:pgdumps/

    echo "S3 sync successful !!"
fi

echo "Finished syncing"
