## Circular Dependency Plugin

Detect modules with circular dependencies when bundling with webpack.

### Usage

```js
// webpack.config.js
module.exports = {
  entry: "./src/index",
  plugins: [
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /a\.js/,
      // add errors to webpack instead of warnings
      failOnError: true
    })
  ]
}
```
