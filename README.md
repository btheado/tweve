This TiddlyWiki plugin embeds a sample [Eve](https://github.com/witheve/Eve) program into a [Tiddlywiki](http://tiddlywiki.com) widget.  See https://btheado.github.io/tweve/ for a demo.

---

## Instructions for building from source 

Install [Node](https://nodejs.org/en/download/) for your platform, then clone and build this repository:

```sh
git clone https://github.com/btheado/tweve.git
cd tweve
npm install
```

You can start the TiddlyWiki server and view a sample use of the plugin:

```sh
npm run build
npm run tw_start
```

Then open http://127.0.0.1:8087 in your browser.

Or you can bundle TiddlyWiki and the Eve plugin together into a single, self-modifiable html file:

```sh
npm run build
npm run build:index
```

Then open the wiki/output/index.html file in your browser.

