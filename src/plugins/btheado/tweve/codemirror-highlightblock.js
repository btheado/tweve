/*\
title: $:/plugins/btheado/tweve/codemirror-highlightblock.js
type: application/javascript
module-type: widget

Wraps up the fenced code blocks parser for highlight and use in TiddlyWiki5

\*/
(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

//var TYPE_MAPPINGS_BASE = "$:/config/HighlightPlugin/TypeMappings/";

var CodeBlockWidget = require("$:/core/modules/widgets/codeblock.js").codeblock;

// Skip if the codemirror plugin is not loaded or if not running in browser
var tiddler = $tw.wiki.getTiddler("$:/plugins/tiddlywiki/codemirror/lib/codemirror.js");
if($tw.browser && tiddler) {
  var CodeMirror = require("$:/plugins/tiddlywiki/codemirror/lib/codemirror.js");

  // TODO: This will not play nice if user has highlightjs plugin loaded
  CodeBlockWidget.prototype.postRender = function() {
    var domNode = this.domNodes[0],
      language = this.language;
    if(language && CodeMirror.modes.hasOwnProperty(language)) {
      domNode.className = "cm-s-default";
      if($tw.browser && !domNode.isTiddlyWikiFakeDom) {
        CodeMirror.runMode(domNode.textContent, language, domNode);
      } else {
        // TODO: I don't understand what this code is trying to do. This is the
        // highlightjs version and I'm not sure what it should do for
        // codemirror runmode.
        /*
        var text = domNode.textContent;
        domNode.children[0].innerHTML = hljs.fixMarkup(hljs.highlight(language,text).value);
        // If we're using the fakedom then specially save the original raw text
        if(domNode.isTiddlyWikiFakeDom) {
          domNode.children[0].textInnerHTML = text;
        }
        */
      }
    }
  };
}

})();
