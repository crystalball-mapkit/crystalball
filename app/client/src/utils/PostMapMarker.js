import Layer from 'ol/layer/Layer.js';
import { createCanvasContext2D } from 'ol/dom.js';
import { asString as ol_color_asString } from 'ol/color';
import { asArray as ol_color_asArray } from 'ol/color';

const image = new Image();
image.src = './icons/marker-plus.png';
const flashlightRadius = 100;

/**
 * @extends {Layer<any>}
 */
export default class PostMapMarker extends Layer {
  constructor(
    options = {
      zIndex: 100
    }
  ) {
    super(options);

    // Initialize flashlight colors
    this.setColor(options);

    /**
     * @private
     */
    this.context_ = createCanvasContext2D();
    this.context_.canvas.style.position = 'absolute';
    //
    this.isFlashlightVisible = true;
  }
  // Snippet from Viglino "https://github.com/Viglino/ol-ext/blob/master/src/interaction/Flashlight.js"
  /** Set flashlight color
   *	@param {ol.flashlight.options} flashlight options param
   *		- color {ol.Color} light color, default transparent
   *		- fill {ol.Color} fill color, default rgba(0,0,0,0.8)
   */
  setColor(options) {
    // Backcolor
    const color = options.fill ? options.fill : [0, 0, 0, 0.5];
    let c = ol_color_asArray(color);
    this.startColor = ol_color_asString(c);
    // Halo color
    if (options.color) {
      c = this.endColor = ol_color_asString(
        ol_color_asArray(options.color) || options.color
      );
    } else {
      c[3] = 0;
      this.endColor = ol_color_asString(c);
    }
    c[3] = 0.1;
    this.midColor = ol_color_asString(c);
  }

  /**
   * @param {boolean} isVisible
   */
  setFlashlightVisible(isVisible) {
    this.isFlashlightVisible = isVisible;
  }

  /**
   * @param {import("ol/PluggableMap").FrameState} frameState
   */
  render(frameState) {
    const canvas = this.context_.canvas;
    // const ratio = frameState.pixelRatio;
    canvas.width = frameState.size[0];
    canvas.height = frameState.size[1];
    this.context_.save();
    // this.context_.scale(ratio, ratio);
    // calculate the middle of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // draw crosshairs on center canvas
    this.context_.beginPath();
    this.context_.moveTo(centerX, centerY - 10);
    this.context_.lineTo(centerX, centerY + 10);
    this.context_.moveTo(centerX - 10, centerY);
    this.context_.lineTo(centerX + 10, centerY);
    this.context_.strokeStyle = '#ff0000';
    this.context_.lineWidth = 2;
    this.context_.stroke();
    // draw the image
    this.context_.drawImage(
      image,
      centerX - image.width / 2,
      centerY - image.height
    );

    if (this.isFlashlightVisible) {
      // draw a flashlight around marker (Snippet from https://github.com/Viglino/ol-ext/blob/master/src/interaction/Flashlight.js)
      const d = Math.max(canvas.width, canvas.height);
      const radGrd = this.context_.createRadialGradient(
        centerX,
        centerY,
        (canvas.width * flashlightRadius) / d,
        centerX,
        centerY,
        (canvas.height * flashlightRadius) / d
      );
      if (canvas.width < 960) {
        // For some reason this is reverse in mobile
        radGrd.addColorStop(0, this.endColor);
        radGrd.addColorStop(0.8, this.midColor);
        radGrd.addColorStop(1, this.startColor);
      } else {
        radGrd.addColorStop(0, this.startColor);
        radGrd.addColorStop(0.8, this.midColor);
        radGrd.addColorStop(1, this.endColor);
      }

      this.context_.fillStyle = radGrd;
      this.context_.fillRect(centerX - d, centerY - d, 2 * d, 2 * d);
    }

    return this.context_.canvas;
  }
}
