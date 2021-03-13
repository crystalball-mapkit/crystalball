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
          default: ''
        },
        uid: {
          default: (Date.now() + Math.random()).toString()
        }
      },
      group: 'block',
      draggable: true,
      isolating: true,
      parseDOM: [
        {
          tag: 'section',
          contentElement: 'div',
          getAttrs: dom => {
            return {
              title: dom.childNodes[1].childNodes[0].innerHTML,
              uid: (Date.now() + Math.random()).toString()
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
          {
            type: 'checkbox',
            name: 'collapse',
            id: node.attrs.uid
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
          0
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
