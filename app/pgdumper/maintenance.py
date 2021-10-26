import argparse
import datetime
import logging
import subprocess
import os
import shutil
import tempfile
from tempfile import mkstemp

import configparser
import gzip
import boto3
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import shlex


session = boto3.Session(
    aws_access_key_id=os.environ.get('S3_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('S3_SECRET_KEY'),
)


def download_from_s3(backup_s3_key, dest_file, manager_config):

    s3_client = session.resource('s3')
    try:
        s3_client.meta.client.download_file(manager_config.get(
            'AWS_BUCKET_NAME'), backup_s3_key, dest_file)
    except Exception as e:
        print(e)
        exit(1)


def list_available_backups(storage_engine, manager_config, bucket_path):
    key_list = []
    # logger.info('Listing S3 bucket s3://{}/{} content :'.format(aws_bucket_name, aws_bucket_postgres_path))
    s3_client = boto3.client('s3',
                             aws_access_key_id=manager_config.get(
                                 'AWS_ACCESS_KEY_ID'),
                             aws_secret_access_key=manager_config.get(
                                 'AWS_SECRET_ACCESS_KEY'),
                             region_name=manager_config.get('AWS_REGION_NAME')
                             )
    s3_objects = s3_client.list_objects_v2(Bucket=manager_config.get('AWS_BUCKET_NAME'),
                                           Prefix=bucket_path)
    backup_list = [s3_content['Key'] for s3_content in s3_objects['Contents']]

    for bckp in backup_list:
        key_list.append(bckp)
    return key_list


def list_postgres_databases(host, database_name, port, user, password):
    try:
        process = subprocess.Popen(
            ['psql',
             '--dbname=postgresql://{}:{}@{}:{}/{}'.format(
                 user, password, host, port, database_name),
             '--list'],
            stdout=subprocess.PIPE
        )
        output = process.communicate()[0]
        if int(process.returncode) != 0:
            print('Command failed. Return code : {}'.format(process.returncode))
            exit(1)
        return output
    except Exception as e:
        print(e)
        exit(1)


def extract_file(src_file):
    extracted_file, extension = os.path.splitext(src_file)

    with gzip.open(src_file, 'rb') as f_in:
        with open(extracted_file, 'wb') as f_out:
            for line in f_in:
                f_out.write(line)
    return extracted_file


def change_user_from_dump(source_dump_path, old_user, new_user):
    fh, abs_path = mkstemp()
    with os.fdopen(fh, 'w') as new_file:
        with open(source_dump_path) as old_file:
            for line in old_file:
                new_file.write(line.replace(old_user, new_user))
    # Remove original file
    os.remove(source_dump_path)
    # Move new file
    shutil.move(abs_path, source_dump_path)


def restore_postgres_db(db_host, db, port, user, password, backup_file, verbose):
    """Restore postgres db from a file."""
    try:
        command = 'PGPASSWORD={0} psql -U {1} -p {2} -h {3} -d {4} < {5}'.format(
            password,
            user,
            port,
            db_host,
            db,
            backup_file)
        print(command)
        p = subprocess.Popen(command, shell=True, stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return p.communicate()[0]

    except Exception as e:
        print("Issue with the db restore : {}".format(e))


def create_db(db_host, database, db_port, user_name, user_password):
    try:
        con = psycopg2.connect(dbname='postgres', port=db_port,
                               user=user_name, host=db_host,
                               password=user_password)

    except Exception as e:
        print(e)
        exit(1)

    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = con.cursor()
    try:
        cur.execute("SELECT pg_terminate_backend( pid ) "
                    "FROM pg_stat_activity "
                    "WHERE pid <> pg_backend_pid( ) "
                    "AND datname = '{}'".format(database))
        cur.execute("DROP DATABASE IF EXISTS {} ;".format(database))
    except Exception as e:
        print(e)
        exit(1)
    cur.execute("CREATE DATABASE {} ;".format(database))
    cur.execute("GRANT ALL PRIVILEGES ON DATABASE {} TO {} ;".format(
        database, user_name))
    return database


def swap_after_restore(db_host, restore_database, new_active_database, db_port, user_name, user_password):
    try:
        con = psycopg2.connect(dbname='postgres', port=db_port,
                               user=user_name, host=db_host,
                               password=user_password)
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        cur.execute("SELECT pg_terminate_backend( pid ) "
                    "FROM pg_stat_activity "
                    "WHERE pid <> pg_backend_pid( ) "
                    "AND datname = '{}'".format(new_active_database))
        cur.execute("DROP DATABASE IF EXISTS {}".format(new_active_database))
        cur.execute('ALTER DATABASE "{}" RENAME TO "{}";'.format(
            restore_database, new_active_database))
    except Exception as e:
        print(e)
        exit(1)


def main():
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    args_parser = argparse.ArgumentParser(
        description='Postgres database management')
    args_parser.add_argument("--action",
                             metavar="action",
                             choices=['list-postgres-backups',
                                      'list_postgres_dbs',  'restore-postgres'],
                             required=True)
    args_parser.add_argument("--filename",
                             help="Filename (show with --action list)")
    args_parser.add_argument("--dest-db",
                             metavar="dest_db",
                             default=None,
                             help="Name of the new restored database")
    args_parser.add_argument("--verbose",
                             default=False,
                             help="Verbose output")
    args = args_parser.parse_args()

    postgres_host = os.environ.get('DATABASE') + "_db"
    postgres_port = 5432
    postgres_db = os.environ.get('DATABASE')
    postgres_restore = "{}_restore".format(postgres_db)
    postgres_restore = postgres_restore.replace("-", "_")
    postgres_user = os.environ.get('POSTGRES_USER')
    postgres_password = os.environ.get('POSTGRES_PASSWORD')
    aws_bucket_name = os.environ.get('S3_BUCKET')
    aws_access_key_id = os.environ.get('S3_ACCESS_KEY')
    aws_secret_access_key = os.environ.get('S3_SECRET_KEY')
    aws_region_name = os.environ.get('S3_REGION')

    aws_bucket_postgres_path = "pgdumps/"
    storage_engine = "S3"
    timestr = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')

    restore_filename = '/tmp/restore.dump'
    restore_uncompressed = '/tmp/restore.dump'

    manager_config = {
        'AWS_BUCKET_NAME': aws_bucket_name,
        'AWS_BUCKET_POSTGRES_PATH': aws_bucket_postgres_path,
        'BACKUP_PATH': '/tmp/',
        'AWS_ACCESS_KEY_ID': aws_access_key_id,
        'AWS_SECRET_ACCESS_KEY': aws_secret_access_key,
        'AWS_REGION_NAME': aws_region_name
    }

    # list postgres backups task
    if args.action == "list-postgres-backups":
        backup_objects = sorted(list_available_backups(
            storage_engine, manager_config, manager_config.get('AWS_BUCKET_POSTGRES_PATH')), reverse=True)
        for key in backup_objects:
            logger.info("Key : {}".format(key))
    # list databases task
    elif args.action == "list_postgres_dbs":
        result = list_postgres_databases(postgres_host,
                                         postgres_db,
                                         postgres_port,
                                         postgres_user,
                                         postgres_password)
        for line in result.splitlines():
            logger.info(line)
    elif args.action == "restore-postgres":
        try:
            os.remove(restore_filename)
        except Exception as e:
            logger.info(e)
        all_backup_keys = list_available_backups(
            storage_engine, manager_config, manager_config.get('AWS_BUCKET_POSTGRES_PATH'))
        backup_match = [s for s in all_backup_keys if args.filename in s]
        if backup_match:
            logger.info(
                "Found the following backup : {}".format(backup_match))
        else:
            logger.error(
                "No match found for backups with filename : {}".format(args.filename))
            logger.info("Available keys : {}".format(
                [s for s in all_backup_keys]))
            exit(1)

        if storage_engine == 'S3':
            logger.info("Downloading {} from S3 into : {}".format(
                backup_match[0], restore_filename))
            download_from_s3(
                backup_match[0], restore_filename, manager_config)
            logger.info("Download complete")

        logger.info(
            "Creating temp database for restore : {}".format(postgres_restore))
        tmp_database = create_db(postgres_host,
                                 postgres_restore,
                                 postgres_port,
                                 postgres_user,
                                 postgres_password)
        logger.info(
            "Created temp database for restore : {}".format(tmp_database))
        logger.info("Restore starting")
        result = restore_postgres_db(postgres_host,
                                     postgres_restore,
                                     postgres_port,
                                     postgres_user,
                                     postgres_password,
                                     restore_uncompressed,
                                     args.verbose)
        if args.verbose:
            for line in result.splitlines():
                logger.info(line)
        logger.info("Restore complete")
        if args.dest_db is not None:
            restored_db_name = args.dest_db
            logger.info("Switching restored database with new one : {} > {}".format(
                postgres_restore, restored_db_name
            ))
        else:
            restored_db_name = postgres_db
            logger.info("Switching restored database with active one : {} > {}".format(
                postgres_restore, restored_db_name
            ))

        swap_after_restore(postgres_host,
                           postgres_restore,
                           restored_db_name,
                           postgres_port,
                           postgres_user,
                           postgres_password)
        logger.info("Database restored and active.")
    else:
        logger.warn("No valid argument was given.")
        logger.warn(args)


if __name__ == '__main__':
    main()
