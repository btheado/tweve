// witheve-watchers is defined via webpack alias
import "witheve-watchers/canvas"
import "witheve-watchers/compiler"
import "witheve-watchers/html"
import "witheve-watchers/svg"
import "witheve-watchers/system"
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
    this.prog.attach("canvas");
    this.prog.attach("svg");
    this.prog.attach("system");

    // Define the eve program
    this.eveSource = this.getEveSource(this.getAttribute("markdown"), this.getAttribute("filter"));
    this.prog.load(this.eveSource);

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

  getEveSource(markdown, filter) {
    var eveSource = "";
    if (markdown) {
      eveSource += markdown;
    }
    if (filter) {
      let tiddlers = this.wiki.filterTiddlers(filter,this);
      for (let title of tiddlers) {
        let tiddler = this.wiki.getTiddler(title);
        if (tiddler) {
          // Insert carriage return in case previous tiddler didn't end in one.
          // Otherwise ending code block mark (```) might end up on the same
          // line as the first line of the next tiddler, thereby giving syntax error.
          eveSource += "\n" + tiddler.getFieldString("text");
        }
      }
    }

    // Append an eve block to the end so any root-less html elements
    // will automatically be attached to the widget rather than to
    // the document body. Code compliments of Josh Cole.
    eveSource += `
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

    return eveSource;
  }

  //
  // With two eve records like this:
  //
  // [#counter #persist sort: 1 count: 0]
  // [#counter #persist sort: 2 count: 0]
  //
  // The eavs come out to the watcher looking like this:
  //
  // [ "count|0|sort|1|tag|counter|tag|persist", "tag", "counter" ],
  // [ "count|0|sort|1|tag|counter|tag|persist", "tag", "persist" ],
  // [ "count|0|sort|1|tag|counter|tag|persist", "sort", 1 ],
  // [ "count|0|sort|1|tag|counter|tag|persist", "count", 0 ],
  // [ "count|0|sort|2|tag|counter|tag|persist", "tag", "counter" ],
  // [ "count|0|sort|2|tag|counter|tag|persist", "tag", "persist" ],
  // [ "count|0|sort|2|tag|counter|tag|persist", "sort", 2 ],
  // [ "count|0|sort|2|tag|counter|tag|persist", "count", 0 ]
  //
  // The 'e' from the eav is used as the tiddler field name and the attributes and values are
  // grouped together like this:
  //
  // eve-count|0|sort|1|tag|counter|tag|persist - {"tag":["counter","persist"],"sort":[1],"count":[0]}
  // eve-count|0|sort|2|tag|counter|tag|persist - {"tag":["counter","persist"],"sort":[2],"count":[0]}
  //
  watchForPersistChanges(saveTitle) {
    this.prog.watch("Export #persist tagged data to a tiddler", ({find, record, lookup}) => {
      let rec = find("persist");
      let {attribute, value} = lookup(rec);

      return [
        rec.add(attribute, value)
      ];
    })
    // Each entity (e) in the eav diffs is used as a tiddler field name with stringified
    // json of the attribute (a) and values (v) stored as the tiddler field value.
    .asDiffs(({adds, removes}) => {
      this.logger.log("obj add  " + JSON.stringify(adds));
      this.logger.log("obj rem  " + JSON.stringify(removes));
      let saveTiddler = this.wiki.getTiddler(saveTitle);

      // The p object is used to build up the tiddler field value pairs related to the
      // eav which have been passed in as adds and removes
      var p = {};

      // The outer loop is for handling both the adds and the removes. The code is the same for
      // both except the adds add set elements and the removes delete set elements
      for(let [eav, setop] of [[adds, (s,v) => {s.add(v);}], [removes, (s,v) => {s.delete(v);}]]) {
        for(let [e, a, v] of eav) {
          // Have we already seen this 'e' since the method call started?
          if (!p.hasOwnProperty(e)) {
            // No. Create it fresh
            p[e] = {};

            // Does the tiddler to which the data will be saved exist yet?
            if (saveTiddler) {
              // Yes. Since the tiddler exists there may be previously
              // persisted values which the diffs need to be "merged" with
              // The eve related fields have 'eve-' prefix so the list of
              // fields can be queried later and the non-eve related ones
              // can be filtered out.
              let json = saveTiddler.getFieldString("eve-" + e);

              // Does the 'e' field already exist in the tiddler?
              if (json) {
                // Yes.  Parse the key/value json into javascript object
                let avs = JSON.parse(json);

                // Each value is a Set, but in json it has to be stored
                // as array, so convert each array into a Set
                for(let key in avs) {
                  p[e][key] = new Set(avs[key]);
                }
              }
            }
          }

          // Does the ea already exist from the data in the tiddler?
          if (!p[e].hasOwnProperty(a)) {
            // No. Create it fresh
            p[e][a] = new Set();
          }

          // Either add or remove the element from the ea set
          setop(p[e][a], v);
        }
      }
      //var tw = {};

      // Now the diffs have been applied and the data can be written
      // back to the tiddler
      for(let e in p) {
        // In order to serialize to json, convert Set to Array
        for(let a in p[e]) {
          // TODO: if p[e][a] has length zero, then should delete p[e][a]
          p[e][a] = Array.from(p[e][a]);
        }
        // TODO: if p[e] ends up empty, then the tiddler field should be deleted?
        //tw[e] = JSON.stringify(p[e]);
        this.wiki.setText(saveTitle, "eve-" + e, undefined, JSON.stringify(p[e]));
      }
      //console.log(JSON.stringify(tw));
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
          let avs = JSON.parse(saveTiddler.getFieldString(fieldName));
          let e = fieldName.substring(4);
          for (let a in avs) {
            for (let v of avs[a]) {
              //console.log("pushing");
              //console.log([e, a, v]);
              inputs.push([e, a, v]);
            }
          }
        }
      }
      if (inputs.length > 0) {
        this.prog.inputEAVs(inputs);
      }
    }
  }

  // TODO: Also refresh if this.getAttribute("save-tiddler") is in changedTiddlers
  // but need to figure out how to avoid circular updates
  refresh(changedTiddlers) {
    // Refresh if the input sourcecode has changed
    this.computeAttributes();
    if(this.eveSource != this.getEveSource(this.getAttribute("markdown"), this.getAttribute("filter"))) {
      // Source code has changed, so regenerate and rerender the widget and replace the existing DOM node
      this.prog.clear();
      this.refreshSelf();
      return true;
    } else {
      return false;
    }
  }

}

export { EveWidget as eve };
