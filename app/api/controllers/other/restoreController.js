const { exec, spawn } = require('child_process');
const { Client } = require('pg');
const multer = require("multer");
const path = require("path");
const { promises: fs } = require("fs");
const permissionController = require("../auth/permissionController");
const crypto = require('crypto');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


const upload = multer({ dest: '/tmp/' });
const restoreFiles = upload.fields([{ name: 'geoserver', maxCount: 1 }, { name: 'postgres', maxCount: 1 }])


async function updatePassword(newUser, newPassword) {
    const filePathPassword = '/opt/geoserver/data_dir/security/usergroup/default/users.xml';
    const filePathRole = '/opt/geoserver/data_dir/security/role/default/roles.xml';
    try {
        const dataFilePassword = await fs.readFile(filePathPassword, { encoding: 'utf8' });
        const roleFile = await fs.readFile(filePathRole, { encoding: 'utf8' });
        const domFilePassword = new JSDOM(dataFilePassword, { contentType: 'text/xml' });
        const domFileRole = new JSDOM(roleFile, { contentType: 'text/xml' });
        const user = domFilePassword.window.document.querySelector('user');
        const userRole = domFileRole.window.document.querySelector('userRoles');
        user.setAttribute('password', `plain:${newPassword}`);
        user.setAttribute('name', newUser);
        userRole.setAttribute('username', newUser);
        const updatedXml = domFilePassword.serialize();
        const updatedRole = domFileRole.serialize();
        await fs.writeFile(filePathPassword, updatedXml, { encoding: 'utf8' });
        await fs.writeFile(filePathRole, updatedRole, { encoding: 'utf8' });
        return 'Password updated successfully';
    } catch (err) {
        throw new Error(`Error updating password: ${err.message}`);
    }
}


function replaceInFiles(dirPath, oldString, newString) {
    fs.readdirSync(dirPath).forEach((item) => {
        const filePath = path.join(dirPath, item);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(new RegExp(oldString, 'g'), newString);
            fs.writeFileSync(filePath, content, 'utf8');
        } else if (stat.isDirectory()) {
            replaceInFiles(filePath, oldString, newString);
        }
    });
}

async function swapAfterRestore(client, restoreDatabase, newActiveDatabase) {
    try {
        // Terminate existing connections to the new active database
        await client.query(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${newActiveDatabase}' AND pid <> pg_backend_pid();`);
        // Drop the new active database if it exists
        await client.query(`DROP DATABASE IF EXISTS ${newActiveDatabase};`);
        // Rename the restore database to the new active database
        await client.query(`ALTER DATABASE "${restoreDatabase}" RENAME TO "${newActiveDatabase}";`);
    } catch (error) {
        console.error(`Error during database swap: ${error}`);
    }
}


async function restoreDB(tempDB, user, password, host, port, dumpFile) {
    try {
        // Restore the database from the dump file
        const command = `PGPASSWORD=${password} psql -U ${user} -h ${host} -p ${port} -d ${tempDB} -f ${dumpFile}`;
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    reject(new Error(stderr));
                    return;
                }
                console.log(`stdout: ${stdout}`);
                resolve();
            });
        });
    } catch (error) {
        console.error(`Error during database restore: ${error}`);
    }
}

async function createTempDB(client, tempDB, user) {
    try {
        // Terminate existing connections, drop the database if it exists, and create a new one
        await client.query(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${tempDB}' AND pid <> pg_backend_pid();`);
        await client.query(`DROP DATABASE IF EXISTS ${tempDB};`);
        await client.query(`CREATE DATABASE ${tempDB};`);
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${tempDB} TO ${user};`);
    } catch (error) {
        console.error(`Error during temporary database creation: ${error}`);
    }
}

async function dropTempDB(client, tempDB) {
    try {
        // Drop the temporary database
        await client.query(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${tempDB}' AND pid <> pg_backend_pid();`);
        await client.query(`DROP DATABASE IF EXISTS ${tempDB};`);
    } catch (error) {
        console.error(`Error during temporary database drop: ${error}`);
    }
}

exports.restore = (req, res) => {
    permissionController.hasPermission(req, res, "post_user", () => {
        restoreFiles(req, res, async function (err) {
            if (err) {
                return res.status(422).send({
                    errors: [{ title: "File Upload Error", detail: err.message }],
                });
            }
            const postgres = req.files["postgres"]
            const geoserver = req.files["geoserver"]
            if (postgres && Array.isArray(postgres) && postgres.length > 0) {
                const dumpFile = postgres[0].path;
                const tempDB = 'tmp_database';
                const user = process.env.POSTGRES_USER;
                const password = process.env.POSTGRES_PASSWORD;
                const host = `${process.env.POSTGRES_DB_NAME}_db`;
                const port = process.env.POSTGRES_PORT || 5432
                const client = new Client({
                    user: user,
                    host: host,
                    database: 'postgres',
                    password: password,
                    port: port,
                });

                try {
                    await client.connect();
                    await createTempDB(client, tempDB, user);
                    await restoreDB(tempDB, user, password, host, port, dumpFile);
                    await swapAfterRestore(client, tempDB, process.env.POSTGRES_DB_NAME);
                    await dropTempDB(client, tempDB);
                } catch (error) {
                    res.status(500).send({ message: "DB Restore process failed", error: error.message });
                } finally {
                    await client.end();
                }
            }

            try {
                if (geoserver && Array.isArray(geoserver) && geoserver.length > 0) {
                    const geoserverFile = geoserver[0].path;
                    const unzip = spawn('unzip', ['-o', geoserverFile, '-d', '/tmp']);
                    unzip.stdout.on('data', (data) => {
                        console.log(`stdout: ${data}`);
                    });
                    unzip.stderr.on('data', (data) => {
                        console.error(`stderr: ${data}`);
                    });
                    await new Promise((resolve, reject) => {
                        unzip.on('close', async (code) => {
                            if (code !== 0) {
                                console.log(`unzip process exited with code ${code}`);
                                reject(new Error(`unzip process exited with code ${code}`));
                            } else {
                                // Unzip successful, now move the old data_dir and copy the new one in the geoserver codntainer
                                exec('cp -r /tmp/geodatadir/* /opt/geoserver/data_dir/', (error, stdout, stderr) => {
                                    if (error) {
                                        console.error(`exec error: ${error}`);
                                        reject(error);
                                        return;
                                    }
                                    if (stderr) {
                                        console.error(`stderr: ${stderr}`);
                                        reject(new Error(stderr));
                                        return;
                                    }
                                    console.log(`stdout: ${stdout}`);
                                    resolve();
                                });
                            }
                        });
                    });
                }
            } catch (error) {
                res.status(500).send({ message: "Geoserver restore failed", error: error.message });
            }

            return res.status(200).send({ message: "Restore process finished successfuly" });
        });
    });
};