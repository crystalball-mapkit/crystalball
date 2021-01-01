import { Node } from 'tiptap';

export default class Expansion extends Node {
  get name() {
    return 'expansion';
  }

  get schema() {
    return {
      attrs: {
        src: {
          default: null
        }
      },
      group: 'block',
      selectable: true,
      draggable: true,
      atom: true,
      // parseDOM and toDOM is still required to make copy and paste work
      parseDOM: [
        {
          tag: 'section',
          getAttrs: dom => ({
            src: dom.getAttribute('src')
          })
        }
      ],
      toDOM: node => [
        'section',
        {
          src: node.attrs.src
        }
      ]
    };
  }
  commands({ type }) {
    return attrs => (state, dispatch) => {
      const { selection } = state;
      const position = selection.$cursor
        ? selection.$cursor.pos
        : selection.$to.pos;
      const node = type.create(attrs);
      const transaction = state.tr.insert(position, node);
      dispatch(transaction);
    };
  }

  // return a vue component
  // this can be an object or an imported component
  get view() {
    return {
      // there are some props available
      // `node` is a Prosemirror Node Object
      // `updateAttrs` is a function to update attributes defined in `schema`
      // `view` is the ProseMirror view instance
      // `options` is an array of your extension options
      // `selected` is a boolean which is true when selected
      // `editor` is a reference to the TipTap editor instance
      // `getPos` is a function to retrieve the start position of the node
      // `decorations` is an array of decorations around the node
      props: ['node', 'updateAttrs', 'view'],
      computed: {
        src: {
          get() {
            return this.node.attrs.src;
          },
          set(src) {
            // we cannot update `src` itself because `this.node.attrs` is immutable
            this.updateAttrs({
              src
            });
          }
        }
      },
      template: `
        <section class="ep-accordion">
          <input type="checkbox" name="collapse" id="handle1" checked="checked">
          <h2 class="handle">
              <label for="handle1">26A. Trappist Single</label>
          </h2>
          <div class="content">
            <p>Body content goes here...</p>
          </div>
        </section>
      `
    };
  }
}
