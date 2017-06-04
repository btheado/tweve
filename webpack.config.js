const path = require('path');

const indexHtml = path.join(__dirname, "index.html");
module.exports = {
  entry: [
    './src/plugins/btheado/tweve/eve-widget.js',
  ],
  output: {
    libraryTarget: 'commonjs', // without this: https://stackoverflow.com/questions/42910956/issue-with-using-externals
                               // Also without this, tw can't load the widget: "Cannot read property 'widget' of undefined"
    path: path.resolve(__dirname, './dist/btheado/tweve'),
    filename: 'eve-widget.js'
  },

  // Convert the javascript using babel
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  },

  externals: {
    // This will be provided by TiddlyWiki, so tell webpack not to look for it
    '$:/core/modules/widgets/widget.js': {commonjs: '$:/core/modules/widgets/widget.js'}
  },
  resolve: {
    alias: {
      "witheve-watchers": "witheve/build/src/watchers"
    }
  }
};

