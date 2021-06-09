var fs          = require('fs');
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
    }).join(' ') // Make sure it keeps a space (fixes https://github.com/nfplee/gulp-vue-single-file-component/issues/6)
    .replace(/"/g, '\\"')
    .trim();
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
            console.log(LOG_PREFIX, 'Cannot use streamed files');
            return callback();
        }

        if (settings.debug) {
            console.log(LOG_PREFIX, 'File =>', file.path);
        }
        
        // Parse the the file content and get the tag content
        var contents = file.contents.toString(encoding),
            fragment = parse5.parseFragment(contents, {
                locationInfo: true
            }),
            tagContent = [];
        
        fragment.childNodes.forEach(function(node) {
            if (node.tagName == 'style') {
                var style = parse5.serialize(node),
                    lang = getAttribute(node, 'lang'),
                    href = getAttribute(node, 'href');

                if (lang == 'less') {
                    less.render(style, { compress: true }, function(e, result) {
                        tagContent['style'] = '{ content: "' + minify(result.css) + '" }';
                    });
                } else if (lang == 'sass' || lang == 'scss') {
                    var options = {
                        outputStyle: 'compressed',
                        indentedSyntax: lang == 'sass',
                    };

                    if (href) {
                        options.file = href;
                    } else {
                        options.data = style;
                    }

                    var result = sass.renderSync(options);

                    tagContent['style'] = '{ content: "' + minify(result.css.toString()) + '" }';
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

                    // parse5 lowercases any attributes in the template which causes problems when using scoped slots within the template
                    template = contents.substring(contents.indexOf('<template>') + 10, contents.lastIndexOf('</template>'));
                }

                tagContent['template'] = minify(template);
            } else if (node.tagName === 'script') {
                tagContent['script'] = parse5.serialize(node);
            }
        });
        
        // Build up the file content
        var content = tagContent['script'];

        // Add a beforeCreate event to load the CSS (if applicable)
        if (tagContent['style'] && !content.includes('beforeCreate()')) {
            content = content.replace(/(export default [^{]*{)/, '$1\n		beforeCreate() {\n			' + settings.loadCssMethod + '(' + tagContent['style'] + ');\n		},');
        }

        // Add the template (if applicable)
        if (tagContent['template'] && !content.includes('template:')) {
            // Note: Using " intead of ` allows us to use template literals e.g. <button :id="`my-dynamic-id-${id}`">Text</button>. However we must make sure the template has removed all line breaks
            content = content.replace(/(export default [^{]*{)/, '$1\n		template: "' + tagContent['template'] + '",');
        }

        file.contents = new Buffer(content);
        
        callback(null, file);
    });
}
