const gutil = require("gulp-util");
const path = require('path');
const through = require("through2");
const fs = require('fs');
const fse = require('fs-extra');
const chalk = require("chalk");
const requireReg = /require\(['"]([\w\d_\-\.\/]+)['"]\)/ig;
const dest_node_modules_dir_name = 'modules';

let config = {
    'gwcn-src': 'src',
    'gwcn-dest': 'dist',
    'gwcn-node_modules': '../node_modules',
    'gwcn-log': false
};

const gwcn = {
    cache: {

    },
    gulp: {

    },
    srcToDest: function(source) {
        let temp = source.replace(this.currentDir, '');
        temp = temp.replace(config['gwcn-src'], config['gwcn-dest']);
        return path.join(this.currentDir, temp);
    },
    destToSrc: function(source) {
        let temp = source.replace(this.currentDir, '');
        temp = temp.replace(config['gwcn-dest'], config['gwcn-src']);
        return path.join(this.currentDir, temp);
    },
    isFile(p) {
        p = (typeof(p) === 'object') ? path.join(p.dir, p.base) : p;
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isFile();
    },
    isDir(p) {
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isDirectory();
    },

    currentDir: process.cwd(),
    destDir: function() {
        return path.join(this.currentDir, config['gwcn-dest']);
    },
    srcDir: function() {
        return path.join(this.currentDir, config['gwcn-src']);
    },
    dest_node_modules_dir: function() {
        return path.join(this.destDir(), dest_node_modules_dir_name);
    },
    src_node_modules_dir: function() {
        return path.join(this.srcDir(), config['gwcn-node_modules']);
    },

    fixNPM: function(code) {
        code = code.replace(/([\w\[\]a-d\.]+)\s*instanceof Function/g, function(matchs, word) {
            return ' typeof ' + word + " ==='function' ";
        });
        code = code.replace(/'use strict';\n?/g, '');

        if (/[^\w_]process\.\w/.test(code) && !/typeof process/.test(code)) {
            code = `var process={};${code}`;
        }

        if (/global|window/.test(code)) {
            code = "var global=window=require('gulp-wxa-copy-npm/global');" + code;
        }
        return code;
    },
    npmHack(filename, code) {
        switch (filename) {
            case 'lodash.js':
            case '_global.js':
                code = code.replace('Function(\'return this\')()', 'this');
                break;
            case '_html.js':
                code = 'module.exports = false;';
                break;
            case '_microtask.js':
                code = code.replace('if(Observer)', 'if(false && Observer)');
                // IOS 1.10.2 Promise BUG
                code = code.replace('Promise && Promise.resolve', 'false && Promise && Promise.resolve');
                break;
        }
        return code;
    },
    copyNPMDeps: function(code, destPath, currentNodeSrcDir, isNPM) {
        let err = null;
        let dest_node_modules_dir = this.dest_node_modules_dir();
        let destDir = path.parse(destPath).dir;
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.log('destPath', destPath)
        let libs = [];
        code.replace(requireReg, (match, lib) => {
            libs.push(lib);
        });

        for (let i = 0; i < libs.length; i++) {
            let lib = libs[i];
            if (err) {
                return '';
            }
            let ext = '';

            let resolved = lib;

            let dep;

            let relative = '';
            console.log('lib', lib);

            if (lib == '../core-js/symbol/iterator') {
                let ttt = 111;
            }

            if (lib[0] === '.') { // require('./something'');
                if (!isNPM) {
                    continue;
                }
                ext = '.js';
                dep = path.join(currentNodeSrcDir, lib);
                relative = '';
            } else if (lib.indexOf('/') === -1 || lib.indexOf('/') === lib.length - 1) { // require('asset');
                let pkg = this.getPkgConfig(lib, this.gulp.enc);
                if (!pkg) {
                    err = new gutil.PluginError('gulp-wxa-copy-npm', 'Package not found:' + lib);
                    break;
                }
                ext = pkg.main || 'index.js';
                if (pkg.browser && typeof pkg.browser === 'string') {
                    ext = pkg.browser;
                }
                dep = path.join(this.src_node_modules_dir(), lib);
                relative = path.relative(destDir, dest_node_modules_dir);
            } else { // require('babel-runtime/regenerator')
                dep = path.join(this.src_node_modules_dir(), lib);
                if (this.isDir(dep) && this.isFile(dep + path.sep + 'index.js')) {
                    ext = path.sep + 'index.js';
                } else if (this.isFile(dep + '.js')) {
                    ext = '.js';
                } else if (this.isFile(dep)) {
                    ext = '';
                } else {
                    err = new gutil.PluginError('gulp-wxa-copy-npm', 'File not found:' + dep);
                    break;
                }
                relative = path.relative(destDir, dest_node_modules_dir);
            }
            resolved = path.join(relative, lib+ext);

            if (lib != resolved) {
                config['gwcn-log'] && gutil.log(`Replace file: ${destDir} depences: from(${chalk.cyan(lib)}) to(${chalk.cyan(resolved)})`);
            }

            let npmPathString = dep + ext;
            let npmPath = path.parse(npmPathString);
            if (this.cache[destPath]) {
                code = code.replace(lib, resolved);
                continue;
            }

            let depCode = fs.readFileSync(npmPathString, {
                encoding: this.gulp.enc
            });

            let outPath = path.join(this.currentDir, config['gwcn-dest'], dest_node_modules_dir_name, npmPathString.replace(this.src_node_modules_dir(), ''));
            config['gwcn-log'] && gutil.log(`Copy npm depences: from(${chalk.cyan(npmPathString)}) to(${chalk.cyan(outPath)}) ...`);
            console.log('outPath', outPath)
            console.log('resolved', resolved)

            code = code.replace(lib, resolved);

            if (resolved.indexOf('symbol.js') > -1 || lib.indexOf('symbol.js') > -1 || code.indexOf('symbol.js') > -1) {
                var aaa = 333;
            }

            err = this.copyNPMDeps(depCode, outPath, npmPath.dir, true).err;
        }

        if (isNPM && !this.cache[destPath]) {
            code = this.npmHack(path.parse(destPath).base, code);
            code = this.fixNPM(code);
            code = this.doPlugins(code, destPath);
            fse.outputFileSync(destPath, code, {
                encoding: this.gulp.enc
            });
            this.cache[destPath] = true;
        }

        return {
            code: code,
            err: err
        };
    },
    getPkgConfig(lib, enc) {
        let pkg = fs.readFileSync(path.join(this.src_node_modules_dir(), lib, 'package.json'), enc);
        try {
            pkg = JSON.parse(pkg);
        } catch (e) {
            pkg = null;
        }
        return pkg;
    },
    doPlugins: function(depCode, destPath) {
        let result = depCode;
        let plugins = config.plugins;
        if (config.plugins) {
            for (let i = 0; i < plugins.length; i++) {
                let plugin = plugins[i];
                result = plugin(result, destPath, gwcn.gulp);
            }
        }
        return result;
    }
}

module.exports = function(options) {

    config = Object.assign(config, options);
    return through.obj(function(file, enc, callback) {
        gutil.log(chalk.cyan('Copying npm depences...'));
        gwcn.gulp.file = file;
        gwcn.gulp.enc = enc;
        gwcn.gulp.callback = callback;
        let sourceCode = file._contents.toString(enc);
        let {
            err,
            code
        } = gwcn.copyNPMDeps(sourceCode, gwcn.srcToDest(file.path), gwcn.src_node_modules_dir(), false);
        // let transformCode = gwcn.replaceNPMDeps(sourceCode, gwcn.srcToDest(file.path))
        file._contents = new Buffer(code);
        // err maybe null
        callback(err, file);
    });
}