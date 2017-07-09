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
  var md, html, myparser;
  md = new markdown();

  // Replace the codeblock rule to just return a tiddlywiki codeblock which
  // will be parsed with the TW parser. This is to get the highlightjs code
  // highlighting to work. I tried calling highlightjs directly but it
  // resulted in extra html escaping I couldn't figure out. By doing it this
  // way, the normal TW highlightjs plugin can be used without having to explicitly
  // require it here.
  md.renderer.rules.fence = function(tokens, idx) {
    var token = tokens[idx];
    return "\n```" + token.info + "\n" + token.content + "\n```\n";
  }

  // Render the markdown to html and create a TW parser
  html = md.render(text),
  myparser = Object.create(WikiParser.prototype);

  // Remove all rules except for html parsing and codeblock
  myparser.pragmaRuleClasses = {};
  myparser.blockRuleClasses = {
    "codeblock": myparser.blockRuleClasses.codeblock,
    "html": myparser.blockRuleClasses.html
  };
  myparser.inlineRuleClasses = {"html": myparser.inlineRuleClasses.html};

  // Call the constructor and save the parse tree results
  WikiParser.apply(myparser, ["text/vnd.tiddlywiki", html, options]);
  this.tree = myparser.tree;
};

// I'd rather use text/x-markdown here, but to get syntax highlighting using the
// codemirror plugin, it needs to be text/x-gfm (i.e. github flavored markdown)
exports["text/x-gfm"] = MarkdownParser;

})();

