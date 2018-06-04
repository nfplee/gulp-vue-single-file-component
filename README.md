# gulp-vue-single-file-component

This plugin compiles [Vue](https://vuejs.org/) single file components ([SFC](https://vuejs.org/v2/guide/single-file-components.html)) to plain JavaScript.

## Installation

```bash
npm install gulp-vue-single-file-component --save-dev
```

## Usage

```javascript
var vueComponent = require('gulp-vue-single-file-component');

gulp.task('vue', function() {
    return gulp.src('./js/components/*.vue')
        .pipe(vueComponent({ /* options */ }))
        .pipe(gulp.dest('./dist/'));
});
```

## Example

First create an empty directory and execute the following from that directory:

```bash
npm init
npm install babel-core babel-preset-env browser-sync gulp gulp-babel gulp-rename gulp-vue-single-file-component --save-dev
```

Create the following files within the directory:

`gulpfile.js`:

```javascript
var gulp            = require('gulp');
var babel           = require('gulp-babel');
var browserSync     = require('browser-sync');
var rename          = require('gulp-rename');
var vueComponent    = require('gulp-vue-single-file-component');

gulp.task('scripts', function() {
    return gulp.src('./js/*.js')
        .pipe(babel({ plugins: 'transform-es2015-modules-amd' })) // Optional line which converts the component to an AMD module
        .pipe(gulp.dest('./public/js'));
});

gulp.task('vue', function() {
    return gulp.src('./js/components/*.vue')
        .pipe(vueComponent({ debug: true, loadCssMethod: 'loadCss' }))
        .pipe(babel({ plugins: 'transform-es2015-modules-amd' })) // Optional line which converts the component to an AMD module
        .pipe(rename({ extname: '.js' }))
        .pipe(gulp.dest('./public/js/components'));
});

gulp.task('watch', function() {
    browserSync.init({
        server: {
            baseDir: './public'
        }
    });
});

gulp.task('default', ['scripts', 'vue', 'watch']);
```

`/js/app.js`:

```javascript
import Vue from 'vue';
import Hello from './components/Hello';
import Hello2 from './components/Hello2';

var app = new Vue({
    el: '#app',
    data: {
        message: 'Hello Vue!'
    },
    components: {
        Hello2
    }
});
```

`/js/components/hello.vue`:

```html
<template>
    <div class="hello">{{ greeting }} <span><slot></slot></span>!</div>
</template>

<script>
    import Vue from 'vue';

    export default Vue.component('hello', {
        data() {
            return {
                greeting: 'Hello'
            }
        }
    });
</script>

<style lang="less">
    .hello {
        color: red;
        
        span {
            color: blue;
        }
    }
</style>
```

`/js/components/hello2.vue`:

```html
<template>
    <div class="hello2">{{ greeting }} <span>{{name}}</span>!</div>
</template>

<script>
    export default {
        props: ['name'],
        data() {
            return {
                greeting: 'Hello2'
            }
        }
    };
</script>

<style>
    .hello2 {
        color: red;
    }
        
    .hello2 span {
        color: green;
    }
</style>
```

`/public/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Example</title>
    <script>
        var require = {
            baseUrl: '/',
            paths: {
                'vue': '//cdn.jsdelivr.net/npm/vue/dist/vue'
            }
        };
        
        loadCss = function(config) {
            var head = document.getElementsByTagName('head')[0];
         
            if (config.content) {
                var style  = document.createElement('style');
                style.type = 'text/css';
                
                if (style.styleSheet)
                    style.styleSheet.cssText = config.content;
                else
                    style.innerHTML = config.content;
         
                head.appendChild(style);
            } else if (config.url) {
                var link  = document.createElement('link');
         
                link.href = config.url;
                link.rel  = 'stylesheet';
                link.type = 'text/css';
                head.appendChild(link);
            }
        };
    </script>
    <script data-main="js/app" src="//cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.js"></script>
</head>
<body>
    <div id="app">
        {{ message }}
        <hello>Bob</hello>
        <hello2 name="Jim"></hello2>
    </div>
</body>
</html>
```

Finally run the following to launch the application:

```bash
gulp
```