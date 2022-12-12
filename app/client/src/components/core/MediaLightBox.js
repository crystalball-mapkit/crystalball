import '../../assets/mediabox.css';

export default class MediaLightBox {
  constructor(url, caption, type) {
    this.url = url;
    this.caption = caption || '';
    this.type = type || '';
    this.root = document.querySelector('body');
  }

  open() {
    this.render(this.url, this.caption, this.type);
    this.events();
  }

  render(embedLink, caption, type) {
    const lightbox = this.template(
      `<div class="mediabox-wrap" role="dialog" aria-hidden="false">
          <div class="${
            type == 'website' ? 'mediabox-content-website' : 'mediabox-content'
          }" role="document" tabindex="0">
          <span id="mediabox-esc" class="${
            type == 'website' ? 'mediabox-close-website' : 'mediabox-close'
          }" aria-label="close" tabindex="1"></span>
          <iframe src="{embed}?autoplay=1" frameborder="0" allowfullscreen></iframe>
          ${type == 'website' ? '' : '<span class="mediabox-caption" tabindex="0">{caption}</span>'}
          
          </div>
      </div>`,
      {
        embed: embedLink,
        caption,
        type,
      }
    );

    this.lastFocusElement = document.activeElement;
    this.root.insertAdjacentHTML('beforeend', lightbox);
    document.body.classList.add('stop-scroll');
  }

  events() {
    const wrapper = document.querySelector('.mediabox-wrap');
    const content = document.querySelector('.mediabox-content');

    wrapper.addEventListener(
      'click',
      e => {
        if (
          (e.target &&
            e.target.nodeName === 'SPAN' &&
            ['mediabox-close', 'mediabox-close-website'].includes(e.target.className)) ||
          (e.target.nodeName === 'DIV' && e.target.className === 'mediabox-wrap') ||
          (e.target.className === 'mediabox-content' && e.target.nodeName !== 'IFRAME')
        ) {
          this.close(wrapper);
        }
      },
      false
    );

    document.addEventListener(
      'focus',
      e => {
        if (content && !content.contains(e.target)) {
          e.stopPropagation();
          content.focus();
        }
      },
      true
    );

    content.addEventListener(
      'keypress',
      e => {
        if (e.keyCode === 13) {
          this.close(wrapper);
        }
      },
      false
    );
  }

  close(el) {
    if (el === null) return true;
    let timer = null;

    if (timer) {
      clearTimeout(timer);
    }

    el.classList.add('mediabox-hide');

    timer = setTimeout(() => {
      const element = document.querySelector('.mediabox-wrap');
      if (element !== null) {
        document.body.classList.remove('stop-scroll');
        this.root.removeChild(element);
        this.lastFocusElement.focus();
      }
    }, 500);
  }

  template(s, d) {
    let p;

    for (p in d) {
      if (d.hasOwnProperty(p)) {
        // eslint-disable-next-line no-param-reassign
        s = s.replace(new RegExp(`{${p}}`, 'g'), d[p]);
      }
    }
    return s;
  }
}
