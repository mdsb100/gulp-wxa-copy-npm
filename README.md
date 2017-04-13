# gulp-wxa-copy-npm
微信小程序gulp插件，解决npm包管理和babel-runtime。可以使用诸如ES7，moment等。

在package.json加入"babel-plugin-transform-runtime"，在babel配置的plugins加入"transform-runtime"。这样就可以直接使用Promise,Map,Symbol等。

如果想要使用async await，甚至是Decorator，具体只要参考babel配置就可以了。

## Usage
In gulpfile.js
```javascript
const gulp = require("gulp");
const babel = require("gulp-babel");
const gwcn = require('gulp-wxa-copy-npm');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('babel', () =>
    let knownOptions = {};

    let options = minimist(process.argv.slice(2), knownOptions);
    //config.babel
    gulp.src('src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(log('Babeling'))
        .pipe(babel({
          "presets": [
            "es2015",
            "stage-0"
          ],
          "plugins": [
            "transform-export-extensions",
            "syntax-export-extensions",
            "transform-runtime"
          ]
        }))
        .pipe(gwcn(options))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(config.dest));
);

```

在代码中:
```javascript
const moment = require('moment'); //NPM
const util = require('./util');
```
```javascript
import moment from 'moment' //NPM

import config from './config'
import {fetch} from '../common'
```

注意项目中的代码一定要使用```require('./util')```或```require('../common/page')```这种形式。

## Installation
```shell
$ npm install gulp-wxa-copy-npm --save-dev
```

## Why
首先感谢[labrador](https://github.com/maichong/labrador)和[wepy](https://github.com/wepyjs/wepy)参考了其中一些代码。这2个库很优秀！但是限制了我们。我们可以自己建gulpfile来使用stylus，imagemin等。可是最大的诉求是想用NPM包管理和ES7，没有这样的一个gulp插件。所以我就做了一个。


但是自由是有代价的，很多东西你需要自己写。

##Directory
```
|- dist
|- src
|- gulpfile.js
\- package.json
```

##Options
- ```gwcn-src```默认是```'src'```。表示的是：源目录夹名。
- ```gwcn-dest```默认是```'dist'```。表示的是：输出目录夹名。
- ```node_modules```默认是```'../node_modules'```。表示的是：源目录和node_modules相对路径。
- ```gwcn-log```默认是```false```。表示的是：是否输出log。
- ```plugins```。数组。

##Plugin Example
```javascript
const guglify = through.obj(function(file, enc, callback) {
    let code = file._contents.toString(enc);
    let result = uglify.minify(code, {
        fromString: true
    });
    file._contents = new Buffer(result.code);
    callback(null, file);
});

const task_babel_release = function() {
    let knownOptions = {};

    let options = minimist(process.argv.slice(2), knownOptions);
    options.plugins = [(code, destPath, {file, enc, callback}) => uglify.minify(code, {
        fromString: true
    }).code];

    //{file, enc, callback} 和through的保持一致

    return gulp.src(config.js)
        .pipe(log('Babeling'))
        .pipe(babel(config.babel))
        .pipe(guglify)
        .pipe(gwcn(options))
        .pipe(gulp.dest(config.dest));
};

```

##Issues
目前版本还是0.1.3，没有经过充分测试。欢迎大家提bug和pull request！