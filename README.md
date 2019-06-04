# gulp-vue-single-file-component

This plugin compiles [Vue](https://vuejs.org/) single file components ([SFC](https://vuejs.org/v2/guide/single-file-components.html)) to plain JavaScript.

## Installation

```bash
npm install --save-dev gulp-vue-single-file-component
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

First create an empty directory and execute the following command from within that directory:

```bash
npm init
```

Step through the instructions and then execute:

```bash
npm install --save-dev @babel/core @babel/plugin-transform-modules-amd browser-sync gulp gulp-babel gulp-rename gulp-vue-single-file-component
```

Now create the following files within the directory:

`gulpfile.js`:

```javascript
var gulp            = require('gulp');
var babel           = require('gulp-babel');
var browserSync     = require('browser-sync');
var rename          = require('gulp-rename');
var vueComponent    = require('gulp-vue-single-file-component');

gulp.task('scripts', () => gulp.src('./js/*.js')
    .pipe(babel({ plugins: ['@babel/plugin-transform-modules-amd'] }))
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.stream())
);
 
gulp.task('vue', () => gulp.src('./js/components/*.vue')
    .pipe(vueComponent({ debug: true, loadCssMethod: 'loadCss' }))
    .pipe(babel({ plugins: ['@babel/plugin-transform-modules-amd'] }))
    .pipe(rename({ extname: '.js' }))
    .pipe(gulp.dest('./public/js/components'))
    .pipe(browserSync.stream())
);

gulp.task('watch', () => {
    browserSync.init({
        server: {
            baseDir: './public'
        }
    });
 
    gulp.watch('./js/*.js', gulp.parallel('scripts'));
    gulp.watch('./js/components/*.vue', gulp.parallel('vue'));
});
 
gulp.task('default', gulp.parallel('scripts', 'vue', 'watch'));
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
    <div class="hello2">{{ greeting }} <span>{{ name }}</span>!</div>
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