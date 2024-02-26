var fs          = require('fs');
var less        = require('less');
var parse5      = require('parse5');
var sass        = require('sass');
var through     = require('through2');

var PLUGIN_NAME = 'gulp-vue-single-file-component';
var LOG_PREFIX  = '[' + PLUGIN_NAME + ']';

function getAttribute(node, name) {
    var attr = node.attrs.filter(function(attr) {
        return attr.name == name;
    });

    return attr.length ? attr[0].value : null;
}
    
function minify(input) {
    return input.split('\n').map(function(line) {
        return line.trim();
    }).filter(function(line) {
        return line != '';
    }).join(' ') // Make sure it keeps a space (fixes https://github.com/nfplee/gulp-vue-single-file-component/issues/6).
    .replace(/"/g, '\\"')
    .trim();
}

/**
 * This plugin compiles Vue single file components to plain Javascript.
 *
 * ## Usage:
 * ```js
 * gulp.task('vue', function() {
 *   return gulp.src('./js/components/*.vue')
 *       .pipe(vueComponent({ ...options })
 *       .pipe(gulp.dest('./dist/'));
 * ```
 * ## Options
 * @param debug  Display verbose output when building components.
 * @param loadCssMethod  Method used to load the component's CSS within the application.
 * @param lessOptions  Options passed to `less`. See the [`less` docs](https://lesscss.org/usage/#less-options).
 * @param sassOptions  Options passed to `sass`. See the [`sass` docs](https://sass-lang.com/documentation/js-api/interfaces/options/).
 */
module.exports = function(options) {
    var defaults = {
        debug: false,
        loadCssMethod: 'require.loadCss',
        lessOptions: {},
        sassOptions: {},
    };

    var settings = Object.assign({}, defaults, options);

    return through.obj(function(file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            console.log(LOG_PREFIX, 'Cannot use streamed files');
            return callback();
        }

        if (settings.debug) {
            console.log(LOG_PREFIX, 'File =>', file.path);
        }
        
        // Parse the the file content and get the tag content.
        var contents = file.contents.toString(encoding),
            fragment = parse5.parseFragment(contents, {
                locationInfo: true
            }),
            tagContent = [];

        // Work out whether the component is a petite-vue component (since petite-vue exports a function instead of an object).
        var isPetiteVue = contents.includes('export default function');

        fragment.childNodes.forEach(function(node) {
            if (node.tagName == 'style') {
                var style = parse5.serialize(node),
                    lang = getAttribute(node, 'lang'),
                    href = getAttribute(node, 'href');

                if (lang == 'less') {
                    var options = { ...{
                        compress: true
                    }, ...settings.lessOptions };
                    
                    less.render(style, options, function(e, result) {
                        tagContent['style'] = '{ content: "' + minify(result.css) + '" }';
                    });
                } else if (lang == 'sass' || lang == 'scss') {
                    var options = { ...{
                        style: 'compressed',
                        syntax: lang == 'sass' ? 'indented' : 'scss',
                    }, ...settings.sassOptions };
                    var result;

                    if (href) {
                        result = sass.compile(href, options);
                    } else {
                        result = sass.compileString(style, options);
                    }

                    tagContent['style'] = '{ content: "' + minify(result.css) + '" }';
                } else {
                    if (href) {
                        tagContent['style'] = '{ url: \'' + href + '\' }';
                    } else {
                        tagContent['style'] = '{ content: "' + minify(style) + '" }';
                    }
                }
            } else if (node.tagName == 'template') {
                var template,
                    include = getAttribute(node, 'include');
                
                if (include) {
                    template = fs.readFileSync(include, 'utf-8');
                } else {
                    //var treeAdapter = parse5.treeAdapters.default,
                    //    docFragment = treeAdapter.createDocumentFragment();
                    //treeAdapter.appendChild(docFragment, node);
                    //template = parse5.serialize(docFragment);
                    //template = template.replace('<template>', '');
                    //template = template.substring(0, template.lastIndexOf('</template>'));

                    // parse5 lowercases any attributes in the template which causes problems when using scoped slots within the template.
                    template = contents.substring(contents.indexOf('<template>') + 10, contents.lastIndexOf('</template>'));
                }

                tagContent['template'] = minify(template);
            } else if (node.tagName === 'script') {
                tagContent['script'] = parse5.serialize(node);
            }
        });
        
        // Build up the file content.
        var content = tagContent['script'];

        // Add a beforeCreate event to load the CSS (if applicable).
        if (tagContent['style']) {
            if (!isPetiteVue) {
                if (!content.includes('beforeCreate()')) {
                    content = content.replace(/(export default [^{]*{)/, '$1\n		beforeCreate() {\n			' + settings.loadCssMethod + '(' + tagContent['style'] + ');\n		},');
                }
            } else {
                content = content.replace(/export default(.*?)return {/s, 'export default$1' + settings.loadCssMethod + '(' + tagContent['style'] + ');\n        return {');
            }
        }

        // Add the template (if applicable).
        if (tagContent['template']) {
            // Note: Using " intead of ` allows us to use template literals e.g. <button :id="`my-dynamic-id-${id}`">Text</button>. However we must make sure the template has removed all line breaks.
            if (!isPetiteVue) {
				if (!content.includes('template:')) {
					content = content.replace(/(export default [^{]*{)/, '$1\n		template: "' + tagContent['template'] + '",');
				}
            } else {
				if (!content.includes('$template:')) {
					content = content.replace(/(export default.*?return {)/s, '$1\n            $template: "' + tagContent['template'] + '",');
				}
            }
        }

        file.contents = new Buffer(content);
        
        callback(null, file);
    });
}
