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
    this.prog.load(this.markdown);

    // addExternalRoot must come after the program is defined
    // or it won't work
    htmlWatcher.addExternalRoot("tw-widget-root", this.domNode);
  }

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
