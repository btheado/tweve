// witheve-watchers is defined via webpack alias
import "witheve-watchers/html"
import { Program } from "witheve";

import { widget as Widget } from '$:/core/modules/widgets/widget.js';
class EveCounterWidget extends Widget {
  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);
    this.logger = new $tw.utils.Logger('eve-counter-widget');
  }

  render(parent, nextSibling) {
    if (!$tw.browser) { return; }
    this.logger.log('Rendering eve DOM nodes');
    this.computeAttributes()
    this.parentDomNode = parent;
    this.domNode = $tw.utils.domMaker('div', {
      document: this.document,
      class: 'tc-counter-widget'
    });
    parent.insertBefore(this.domNode, nextSibling);

    // Creating a new program every time with no cleanup
    // seems like a bad idea. TW requires a workaround in order
    // to cleanup (see https://github.com/Jermolene/TiddlyWiki5/issues/1784)
    // Mabye a differenet approach is needed. For demonstration
    // purposes, this is fine 
    var prog = new Program("counter");
    var htmlWatcher = prog.attach("html");

    // Define the eve counter program
    this.renderCounter(prog);

    prog.bind("Attach the toplevel to the TW widget root", function (_a) {
      var find = _a.find, record = _a.record;
      var embed = find("embed");
      var my_root = find("my-root");
      return [
          my_root.add("children", [
            embed.add({tag: "html/element", tagname: "div"})
          ])
      ];
    });

    // addExternalRoot and inputEAVs must come after the program is defined
    // or they won't work
    htmlWatcher.addExternalRoot("my-root", this.domNode);
    prog.inputEAVs([
      [1, "tag", "counter"], [1, "count", 0],
      [2, "tag", "counter"], [2, "count", 0],
      [3, "tag", "counter"], [3, "count", 0],
      [4, "tag", "counter"], [4, "count", 0]
    ]);
  }

  renderCounter(prog) {

    prog.commit("Increment or decrement a Counter", function (_a) {
      var find = _a.find;
      var counter = find("counter");
      var button = find({tagname: "button", counter: counter});
      var new_count = counter.count + button.diff;
      find("html/event/click", {element: button});

      return [
        counter.remove("count").add("count", new_count)
      ];

    });

    prog.bind("Display a Counter", function(_a) {
      var find = _a.find, record = _a.record;
      var counter = find("counter");

      return [
        record("embed").add("children", [
          record("html/element", { tagname: "div", counter: counter, style: record({flex: "0 0 auto", width: "80px", display: "flex", "flex-direction": "row"})}).add("children", [
            record("html/element", { tagname: "button", text: "-", diff: -1, sort: 0, counter: counter }),
            record("html/element", { tagname: "div", text: counter.count, sort: 1, counter: counter, style: record({padding: "0 6px", flex: 1})}),
            record("html/element", { tagname: "button", text: "+", diff: 1, sort: 2, counter: counter }),
          ])
        ])
      ]
    });

  }
}

export { EveCounterWidget as evecounter };
