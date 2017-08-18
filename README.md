## Circular Dependency Plugin

Detect modules with circular dependencies when bundling with webpack.

Circular dependencies are often a necessity in complex software, the presence of a circular dependency doesn't always imply a bug, but in the case where the you believe a bug exists, this module may help find it.

### Usage

```js
// webpack.config.js
let CircularDependencyPlugin = require('circular-dependency-plugin')

module.exports = {
  entry: "./src/index",
  plugins: [
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /a\.js|node_modules/,
      // add errors to webpack instead of warnings
      failOnError: true
    })
  ]
}
```

### Options

Specified in the plugins section of webpack.config.js. (See above example code.)

* exclude - A regular expression that defines which files/directories will be omitted from evaluation. If omitted, defaults to evaluating all JS-compilable files in the project path.
* failOnError - If specified true, then any circular dependencies found will cause a Webpack build error. If specified false or omitted, circular dependencies will only generate warnings.
* outputFormat - If specified "summary", a one-line summary description will be output in the event of any circular dependencies. If specified "full" or omitted, a complete description of circular dependencies will be output.
