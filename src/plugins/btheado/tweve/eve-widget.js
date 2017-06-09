// witheve-watchers is defined via webpack alias
import "witheve-watchers/compiler"
import "witheve-watchers/html"
import "witheve-watchers/ui"
import { Program } from "witheve";

import { widget as Widget } from '$:/core/modules/widgets/widget.js';
class EveWidget extends Widget {
  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);
    this.logger = new $tw.utils.Logger('eve-widget');
  }

  render(parent, nextSibling) {
    if (!$tw.browser) { return; }
    this.logger.log('Rendering eve DOM nodes');
    this.computeAttributes()
    this.parentDomNode = parent;
    this.domNode = $tw.utils.domMaker('div', {
      document: this.document,
      class: 'tc-widget'
    });
    parent.insertBefore(this.domNode, nextSibling);
    this.domNodes.push(this.domNode); // So refreshSelf will clean up old domNode

    // Creating a new program every time with no cleanup
    // seems like a bad idea. TW requires a workaround in order
    // to cleanup (see https://github.com/Jermolene/TiddlyWiki5/issues/1784)
    // Mabye a differenet approach is needed. For demonstration
    // purposes, this is fine
    this.prog = new Program("tw eve widget");
    var htmlWatcher = this.prog.attach("html");

    // Define the eve program
    this.markdown = this.getAttribute("markdown");

    // Append an eve block to the end so any root-less html elements
    // will automatically be attached to the widget rather than to
    // the document body. Code compliments of Josh Cole.
    var markdown = this.markdown + `
Any element with no parent (or that is already a child of the widget root) is parented to the widget root.
~~~
      search
        widget-root = [#tw-widget-root]
        elem = [#html/element]
        elem != widget-root
        not(
          parent = [#html/element children: elem]
          parent != [#tw-widget-root]
        )

      bind
        widget-root.children += elem
~~~

The extra bit of trickery in the 'not' is required to prevent the block from
invalidating itself. If we kept the existing search logic, it would first match
a root element, adding it as a child of the widget. Doing so would make it no
longer match, so it would stop being a child. This would allow it to match
again, ad infinitum. Instead, we include the loophole that, if an element's
parent is already the widget, we'll continue asserting that.
    `;
    this.prog.load(markdown);

    // Attach a watcher for persisting data. Only if the user gave a
    // tiddler in which the data should be saved
    let saveTitle = this.getAttribute("save-tiddler");
    if (saveTitle) {
      this.watchForPersistChanges(saveTitle);
      this.loadDataFromTiddler(saveTitle);
    }

    // addExternalRoot must come after the program is defined
    // or it won't work
    htmlWatcher.addExternalRoot("tw-widget-root", this.domNode);
  }

  watchForPersistChanges(saveTitle) {
    // Currently hard-coded to only work with the counter demo
    this.prog.watch("Export #counter tagged data to a tiddler", ({find, record}) => {
      let counter = find("counter");
      let {count, sort} = counter;
      return [
        record("counter", {count, sort})
      ];
    })
    .asObjects(({adds, removes}) => {
      //this.logger.log("obj add  " + JSON.stringify(adds));
      //this.logger.log("obj rem  " + JSON.stringify(removes));
      for(let id in adds) {
        // Save the data in a field of the given tiddler. Prefix each field name
        // with 'eve-' since only those fields will be loaded in on widget refresh
        // TODO: maybe use lower level tiddlywiki api as I'm not sure all
        // characters in 'eve-<id>' will make it through untouched as it
        // didnt' work when I used 'eve/<id>'.
        this.wiki.setTextReference(saveTitle + "!!" + "eve-" + id, JSON.stringify(adds[id]));
      }
      for(let id in removes) {
        this.wiki.deleteTextReference(saveTitle + "!!" + "eve-" + id, JSON.stringify(removes[id]));
      }
    });
  }

  loadDataFromTiddler(saveTitle) {
    // If the tiddler already exists for the given saveTitle
    // then load the fields
    let saveTiddler = this.wiki.getTiddler(saveTitle);
    if (saveTiddler) {
      // Load the fields from the tiddler into EAVs
      var inputs = [];
      for(var fieldName in saveTiddler.fields) {
        if (fieldName.startsWith("eve-")) {
          let obj = JSON.parse(saveTiddler.getFieldString(fieldName));
          let e = fieldName.substring(4);
          for (let key of Object.keys(obj)) {
            inputs.push([e, key, obj[key]]);
          }
        }
      }
      this.prog.inputEAVs(inputs);
    }
  }

  // TODO: Also refresh if this.getAttribute("save-tiddler") is in changedTiddlers
  // but need to figure out how to avoid circular updates
  refresh(changedTiddlers) {
    // Refresh if the input sourcecode has changed
    this.computeAttributes();
    if(this.markdown !== this.getAttribute("markdown")) {
      // Regenerate and rerender the widget and replace the existing DOM node
      this.prog.clear();
      this.refreshSelf();
      return true;
    } else {
      return false;
    }
  }

}

export { EveWidget as eve };
