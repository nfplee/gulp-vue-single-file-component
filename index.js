var fs          = require('fs');
var gutil       = require('gulp-util');
var less        = require('less');
var parse5      = require('parse5');
var sass        = require('node-sass');
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
    }).join('');
}

module.exports = function(options) {
    var defaults = {
        debug: false,
        loadCssMethod: 'require.loadCss'
    };

    var settings = Object.assign({}, defaults, options);

    return through.obj(function(file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Cannot use streamed files'));
            return callback();
        }

        if (settings.debug) {
            console.log(LOG_PREFIX, 'File =>', file.path);
        }
        
        // Parse the the file content and get the tag content
        var fragment = parse5.parseFragment(file.contents.toString(encoding), {
            locationInfo: true
        }), tagContent = [];
        
        fragment.childNodes.forEach(function(node) {
            if (node.tagName == 'style') {
                var style = parse5.serialize(node),
                    lang = getAttribute(node, 'lang'),
                    href = getAttribute(node, 'href');

                if (lang == 'less') {
                    less.render(style, { compress: true }, function(e, result) {
                        tagContent['style'] = '{ content: \'' + result.css + '\' }';
                    });
                } else if (lang == 'sass' || lang == 'scss') {
                    var options = {
                        outputStyle: 'compressed',
                        indentedSyntax: lang == 'sass',
                    };

                    if (href) {
                        options.file = href;
                    } else {
                        options.data = minify(style);
                    }

                    var result = sass.renderSync(options);

                    tagContent['style'] = '{ content: \'' + result.css.toString().replace('\n', '') + '\' }';
                } else {
                    if (href) {
                        tagContent['style'] = '{ url: \'' + href + '\' }';
                    } else {
                        tagContent['style'] = '{ content: \'' + minify(style) + '\' }';
                    }
                }
            } else if (node.tagName == 'template') {
                var template,
                    include = getAttribute(node, 'include');
                
                if (include) {
                    template = fs.readFileSync(include, 'utf-8');
                } else {
                    var treeAdapter = parse5.treeAdapters.default,
                        docFragment = treeAdapter.createDocumentFragment();

                    treeAdapter.appendChild(docFragment, node);

                    template = parse5.serialize(docFragment);
                    template = template.replace('<template>', '').replace('</template>', '');
                }

                tagContent['template'] = minify(template.replace(/'/g, '&#39;'));
            } else if (node.tagName === 'script') {
                tagContent['script'] = parse5.serialize(node);
            }
        });
        
        // Build up the file content
        var content = tagContent['script'];

        // Add a beforeCreate event to load the CSS (if applicable)
        if (tagContent['style'] && !content.includes('beforeCreate()')) {
            content = content.replace(/(export default [^{]*{)/, '$1\n		beforeCreate() {\n			' + settings.loadCssMethod + '('+ tagContent['style'] + ');\n		},');
        }

        // Add the template (if applicable)
        if (tagContent['template'] && !content.includes('template:')) {
            content = content.replace(/(export default [^{]*{)/, '$1\n		template: \'' + tagContent['template'] + '\',');
        }

        file.contents = new Buffer(content);
        
        callback(null, file);
    });
}