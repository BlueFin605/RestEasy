const { app, BrowserWindow, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')
const fs = require('fs');
const url = require('url');
const axios = require('axios');
// var path = require('path');
// const prom = require('node:fs/promises');

let win;

const createWindow = () => {
    console.log('createWindow');
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.webContents.openDevTools();

    win.loadFile('dist/rest-easy/index.html');
    console.log('createWindow, done');
}

app.whenReady().then(() => {
    createWindow()

    // traverseDirectory();
    // console.log(prom);
    // const versions = process.versions;
    // console.log(versions);

    // prom.readdir(app.getPath("userData"), { recursive: true })
    //     .then(files => console.log(files))
    //     .catch(err => {
    //         console.log(err)
    //     });

    // const isDirectory = path => statSync(path).isDirectory();
    // const getDirectories = path =>
    //     fs.readdirSync(path).map(name => join(path, name)).filter(isDirectory);

    // const isFile = path => statSync(path).isFile();
    // const getFiles = path =>
    //     fs.readdirSync(path).map(name => join(path, name)).filter(isFile);

    // const getFilesRecursively = (path) => {
    //     let dirs = getDirectories(path);
    //     let files = dirs
    //         .map(dir => getFilesRecursively(dir)) // go through each directory
    //         .reduce((a, b) => a.concat(b), []);    // map returns a 2d array (array of file arrays) so flatten
    //     return files.concat(getFiles(path));
    // };

    // getFilesRecursively(app.getPath("userData"))
    //     .then(files => console.log(files))
    //     .catch(err => {
    //         console.log(err)
    //     });



    // tree = {};
    // for (const filePath of walkSync(app.getPath("userData"), tree)) {
    //     console.log(filePath);
    // }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })


    ipcMain.handle("testRest", (event, request) => {
        return executeAction(event, request);
    });

    ipcMain.handle("readState", (event, request) => {
        return readState(event, request);
    });

    ipcMain.handle("traverseDirectory", (event, request) => {
        return traverseDirectory(event, request);
    });

    ipcMain.handle("loadSolution", (event, request) => {
        return loadSolution(event, request);
    });

    ipcMain.on("saveState", (event, request) => {
        saveState(event, request);
    });

    ipcMain.on("saveSolution", (event, request) => {
        saveSolution(event, request);
    });
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on("navigateDirectory", (event, path) => {
    process.chdir(path);
    getDirectory();
});

async function executeAction(event, request) {
    console.log(`request:[${JSON.stringify(request)})`);
    let axios_request = {
        // headers: { 'Authorization': `Basic ${auth(pat)}` },
        // validateStatus: function (status) {
        //     return status == 429 || status == 404 || (status >= 200 && status < 300);
        // }
    }

    var url = `${request.protocol}://${request.url}`;
    console.log(url);
    try {
        var response = await axios({
            method: request.verb,
            url: url,
            data: request.data,
            headers: request.headers,
            transformResponse: (r) => r,
            responseType: 'arraybuffer'
        })
        // var response = await axios.get(url, axios_request);
        console.log(response.statusText);
        console.log(`response data type:[${typeof (response.data)}][${response.data}]`);

        // console.log(`[${JSON.stringify(response.request)}]`)
        return {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            headersSent: response.request._headers,
            body: { contentType: response.headers['content-type'], body: response.data }
        };
    }
    catch (error) {
        console.log(`Exception:[${JSON.stringify(error)}]`)
        if (error.response != undefined) {
            console.log(`[${error.response.status}, ${error.response.statusText}, ${error.response.headers}]`)
            return {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers
            };
        }

        return { status: "", statusText: error.code };
    }
}

function saveState(event, request) {
    console.log(app.getPath("userData"));
    //  console.log(userPath);
    // https://stackoverflow.com/questions/30465034/where-to-store-user-settings-in-electron-atom-shell-application
    //    Just curious but what's the advantage of electron-json-storage vs just 
    // var someObj = JSON.parse(fs.readFileSync(path, { encoding: "utf8" }))
    fs.writeFileSync(buildStateFilename(), JSON.stringify(request)); // Even making it async would not add more than a few lines
}

function readState(event, request) {
    try {
        var state = fs.readFileSync(buildStateFilename());
        console.log(state);
        return JSON.parse(state);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`File not found!:[${buildStateFilename()}]`);
            return { actions: [] };
        } else {
            throw err;
        }
    }
}

function buildStateFilename() {
    return path.join(app.getPath("userData"), "current_state.json");
}

function traverseDirectory() {
    // var path = app.getPath("userData");
    var path = `/Users/deanmitchell/Projects/RestEasy/App/RestEasy/src`;
    var tree = { dir: { name: 'root', path: path, fullPath: path }, subdirs: [], files: [] };
    walkSync(path, tree);
    // var json = JSON.stringify(tree);
    // console.log(json);
    return tree;
}

function walkSync(dir, tree) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            var fullPath = path.join(dir, file.name);
            var node = { dir: file, subdirs: [], files: [] };
            node.dir.fullPath = fullPath;
            tree.subdirs.push(node);
            walkSync(fullPath, tree.subdirs[tree.subdirs.length - 1]);
        } else
            if (file.isFile()) {
                file.fullPath = path.join(dir, file.name);
                tree.files.push(file);
            }
    }
}

function loadSolution(solFile) {
    try {
        var solution = fs.readFileSync(solFile);
        console.log(state);
        return JSON.parse(state);
    } catch (err) {
        console.log(`Solution File not found!:[${solFile}] - [${err}]`);
        throw err;
    }
}

function saveSolution(event, request) {
    fs.writeFileSync(request.solFile, JSON.stringify(request.solution)); // Even making it async would not add more than a few lines
}
