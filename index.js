const FS = require('fs');
const PATH = require('path');
const cwd = process.cwd();

// -i input
// -o output

function onError(error) {
    console.log(error);
}
function onComplete(data) {
    console.log('complete');
}
function saveData(data) {
    function saveToFile(path, data) {
        return new Promise((resolve, reject) => {
            FS.writeFile(path, data, (error) => {
                if ( error ) reject(error);
                else resolve(true);
            })
        });
    }

    return new Promise((resolve, reject) => {
        Promise.all(data.out.map(p => saveToFile(p, data.concated))).then(result => resolve(data)).catch(reject);
    });
}
function concatData(data) {
    return new Promise((resolve, reject) => {
        data.concated = data.contents.join('\n');
        resolve(data);
    });
}
function loadFiles(data) {
    function loadFile(path) {
        return new Promise((resolve, reject) => {
            FS.readFile(path, 'utf8', (error, data) => {
                if ( error ) reject(error);
                else resolve(data);
            });
        });
    }

    return new Promise((resolve, reject) => {
        Promise.all(data.paths.map(p => loadFile(p))).then(result => {
            data.contents = result;
            resolve(data);
        }).catch(reject);
    });
}
function collectFiles(data) {
    function checkFile(path) {
        return new Promise((resolve, reject) => {
            FS.stat(path, (error, stats) => {
                if ( error ) reject(error);
                else {
                    if ( stats.isFile() ) {
                        resolve([path]);
                    }
                    else if ( stats.isDirectory() ) {
                        scanDir(path).then(resolve).catch(reject);
                    }
                    else {
                        reject(new Error('Unknown data'));
                    }
                }
            });
        });
    }
    function scanDir(path) {
        return new Promise((resolve, reject) => {
            FS.readdir(path, null, (error, files) => {
                if ( error ) {
                    console.log(error);
                    reject([]);
                }
                else {
                    let promises = files.map(file => checkFile(path + '/' + file));
                    Promise.all(promises).then(data => {
                        let paths = [];

                        data.forEach(i => paths = paths.concat(i));

                        resolve(paths);
                    })
                }
            });
        });
    }
    function processPath(path) {
        return new Promise((resolve, reject) => {
            let filePath = PATH.dirname(path);
            let fileName = PATH.basename(path);
            let files = [];

            if ( fileName === '*' || fileName === '*.*' ) {
                scanDir(cwd + '/' + filePath).then(paths => {
                    resolve(paths);
                }).catch(reject);
            }
            else {
                // reject(new Error('Unknown pattern ' + fileName));
                console.log('needs implement for ' + fileName + ' pattern');
                resolve([]);
            }
        });
    }

    return new Promise((resolve, reject) => {
        Promise.all(data.in.map(path => processPath(path))).then(result => {
            let paths = [];

            result.forEach(i => paths = paths.concat(i));

            console.log('found files');
            paths.forEach(p => console.log(' ' + p));

            data.paths = paths;

            resolve(data);
        }).catch(reject);
    });
}
function checkArguments(data) {
    return new Promise((resolve, reject) => {
        if ( !data.in || data.in.length === 0 ) {
            return reject(new Error('No input data passed. Example: -i file1 file2 dir/*'));
        }
        if ( !data.out || data.out.length === 0 ) {
            return reject(new Error('No output data passed. Example: -o file1 file2'));
        }

        resolve(data);
    });
}
function parseArguments(argv) {
    return new Promise((resolve, reject) => {
        let inputOption = '-i';
        let outputOption = '-o';
        let currentOption = null;
        let inputData = [];
        let outputData = [];

        for ( let i = 0, l = argv.length; i < l; i++ ) {
            if ( argv[i] === inputOption ) {
                currentOption = inputOption;
                continue;
            }
            if ( argv[i] === outputOption ) {
                currentOption = outputOption;
                continue;
            }
            if ( currentOption === inputOption ) {
                inputData.push(argv[i]);
                continue;
            }
            if ( currentOption === outputOption ) {
                outputData.push(argv[i]);
                continue;
            }
        }

        resolve({
            argv,
            in:inputData,
            out:outputData
        });
    });
}
function run(data) {
    return new Promise((resolve, reject) => {
        collectFiles(data)
            .then(loadFiles)
            .then(concatData)
            .then(saveData)
            .then(resolve)
            .catch(reject)
    });
}

module.exports.concat = function(data, onResult = null) {
    let promise = run(data);

    if ( onResult ) {
        promise.then(r => onResult(null, r)).catch(err => onResult(err));
    }

    return promise;
};

if ( require.main ) {
    parseArguments(process.argv).then(checkArguments).then(run).then(onComplete).catch(onError);
}