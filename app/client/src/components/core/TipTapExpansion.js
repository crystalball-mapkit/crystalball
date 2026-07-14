import {Node} from 'tiptap';

function makeUid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function findAncestorOfType($pos, type) {
  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node && node.type === type) {
      return {
        node,
        depth,
        pos: depth > 0 ? $pos.before(depth) : 0,
      };
    }
  }
  return null;
}

export default class Expansion extends Node {
  get name() {
    return 'expansion';
  }

  get schema() {
    return {
      attrs: {
        title: {default: ''},
        uid: {default: ''},
      },

      group: 'block',
      content: 'block+',
      draggable: true,
      isolating: true,
      defining: true,
      selectable: true,

      parseDOM: [
        {
          tag: 'section.ep-accordion',
          contentElement: 'div.content',
          getAttrs: dom => {
            const label = dom.querySelector('h2.handle label');
            const input = dom.querySelector('input[type="checkbox"]');
            return {
              title: label ? label.textContent : '',
              uid: input && input.id ? input.id : makeUid(),
            };
          },
        },
      ],

      toDOM: node => [
        'section',
        {class: 'ep-accordion', 'data-expansion-uid': node.attrs.uid},
        ['input', {type: 'checkbox', name: 'collapse', id: node.attrs.uid}],
        ['h2', {class: 'handle'}, ['label', {for: node.attrs.uid}, node.attrs.title]],
        ['div', {class: 'content'}, 0],
      ],
    };
  }

  commands({type, schema}) {
    return {
      expansion: attrs => (state, dispatch) => {
        const {from, to} = state.selection;
        const paragraphType = schema.nodes.paragraph;
        const content = paragraphType ? paragraphType.create() : null;
        const node = type.create(
          {
            title: attrs && attrs.title ? attrs.title : '',
            uid: attrs && attrs.uid ? attrs.uid : makeUid(),
          },
          content
        );
        if (dispatch) {
          dispatch(state.tr.replaceRangeWith(from, to, node));
        }
        return true;
      },

      updateExpansionTitle:
        ({uid, title}) =>
        (state, dispatch) => {
          let found = false;
          state.doc.descendants((node, pos) => {
            if (node.type === type && node.attrs.uid === uid) {
              if (dispatch) {
                dispatch(state.tr.setNodeMarkup(pos, null, {...node.attrs, title}));
              }
              found = true;
              return false;
            }
          });
          return found;
        },
    };
  }

  keys({type, schema}) {
    return {
      Enter: (state, dispatch) => {
        const {selection} = state;
        const {$from, empty} = selection;
        if (!empty) return false;
        const expansion = findAncestorOfType($from, type);
        if (!expansion) return false;
        const endOfExpansionContent = $from.end(expansion.depth);
        if ($from.pos !== endOfExpansionContent) return false;
        const paragraphType = schema.nodes.paragraph;
        if (!paragraphType) return false;
        const insertPos = expansion.pos + expansion.node.nodeSize;
        const paragraph = paragraphType.create();
        if (dispatch) {
          let tr = state.tr.insert(insertPos, paragraph);
          tr = tr.setSelection(state.selection.constructor.near(tr.doc.resolve(insertPos + 1)));
          dispatch(tr.scrollIntoView());
        }
        return true;
      },

      Backspace: (state, dispatch) => {
        const {selection} = state;
        const {$from, empty} = selection;
        if (!empty) return false;
        const expansion = findAncestorOfType($from, type);
        if (!expansion) return false;
        const startOfExpansionContent = $from.start(expansion.depth);
        if ($from.pos !== startOfExpansionContent) return false;
        if (dispatch) {
          dispatch(state.tr);
        }
        return true;
      },
    };
  }
}
