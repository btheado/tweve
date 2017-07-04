/*\
title: $:/plugins/btheado/markdown/wrapper.js
type: application/javascript
module-type: parser

Wraps up the markdown-it parser for use in TiddlyWiki5

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var markdown = require("$:/plugins/btheado/markdown/markdown-it.js");
var WikiParser = require("$:/core/modules/parsers/wikiparser/wikiparser.js")["text/vnd.tiddlywiki"];

/*
 * The TW markdown parser at http://tiddlywiki.com/plugins/tiddlywiki/markdown/ uses the markdown-js library
 * which does not support code blocks. This one uses markdown-it (https://markdown-it.github.io/)
 * which does support code blocks.
 *
 * The other TW parser makes use of the intermediate json representation of the markdown and converts
 * to a TW parse tree using that. The markdown-it library returns an html string. In order to
 * convert that into the TW parse tree, I'm using quite a bit of a hack here. I'm creating an instance
 * of full TW parser and removing all except for the html parsing. I figure the TW html parser should
 * be able to handle most everything which comes out of the markdown parse.
 */
var MarkdownParser = function(type,text,options) {
  // Render the markdown to html and create a TW parser
  var md = new markdown(),
      html = md.render(text),
      myparser = Object.create(WikiParser.prototype);

  // Remove everything except for html parsing
  myparser.pragmaRuleClasses = {};
  myparser.blockRuleClasses = {"html": myparser.blockRuleClasses.html};
  myparser.inlineRuleClasses = {"html": myparser.inlineRuleClasses.html};

  // Call the constructor and save the parse tree results
  WikiParser.apply(myparser, ["text/vnd.tiddlywiki", html, options]);
  this.tree = myparser.tree;
};

// I'd rather use text/x-markdown here, but to get syntax highlighting using the
// codemirror plugin, it needs to be text/x-gfm (i.e. github flavored markdown)
exports["text/x-gfm"] = MarkdownParser;

})();

