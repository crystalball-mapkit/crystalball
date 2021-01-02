import { Mark } from 'tiptap';
import { updateMark, removeMark } from 'tiptap-commands';
export default class Expansion extends Mark {
  get name() {
    return 'expansion';
  }

  get schema() {
    return {
      attrs: {
        title: {
          default: null
        },
        uid: {
          default: null
        },
        state: {
          default: null
        }
      },
      inclusive: false,
      // parseDOM and toDOM is still required to make copy and paste work
      parseDOM: [
        {
          tag: 'section',
          getAttrs: dom => {
            return {
              title: dom.childNodes[2].childNodes[0].innerHTML,
              uid: dom.childNodes[0].getAttribute('id'),
              state: dom.childNodes[0].getAttribute('checked')
                ? 'expanded'
                : 'collapsed'
            };
          }
        }
      ],
      toDOM: node => [
        'section',
        {
          class: 'ep-accordion'
        },
        [
          'input',
          node.attrs.state === 'collapsed'
            ? {
                type: 'checkbox',
                name: 'collapse',
                id: node.attrs.uid
              }
            : {
                type: 'checkbox',
                name: 'collapse',
                id: node.attrs.uid,
                checked: 'checked'
              }
        ],
        [
          'h2',
          {
            class: 'handle'
          },
          [
            'label',
            {
              for: node.attrs.uid
            },
            node.attrs.title // Expansion panel title
          ]
        ],
        [
          'div',
          {
            class: 'content'
          },
          [
            'p',
            {},
            0 // Expansion panel body
          ]
        ]
      ]
    };
  }

  commands({ type }) {
    return attrs => {
      if (attrs.title && attrs.uid) {
        return updateMark(type, attrs);
      }
      return removeMark(type);
    };
  }
}
