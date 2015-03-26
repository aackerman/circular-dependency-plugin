## circular-dependency-plugin

Detect modules with circular dependencies when bundling with webpack.

### Usage

```js
module.exports = {
  entry: "./src/index",
  plugins: [
    new CircularDependencyPlugin()
  ]
}
```
