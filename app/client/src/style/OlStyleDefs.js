import OlStyle from 'ol/style/Style';
import OlStroke from 'ol/style/Stroke';
import OlFill from 'ol/style/Fill';
import OlCircle from 'ol/style/Circle';
import OlIconStyle from 'ol/style/Icon';
import OlText from 'ol/style/Text';
import store from '../store/modules/map';

let strokeColor = 'rgba(236, 236, 236, 0.7)';
let fillColor = 'rgba(255,0,0, 0.2)';
let imageColor = 'blue';
let radiusHighlightColor = 'rgba(232,223,181,0.3)';
let zIndex = 100;

// Resets cache when map groups is changed.
import { EventBus } from '../EventBus';
EventBus.$on('group-changed', () => {
  styleCache = {};
});

export function defaultStyle(feature) {
  const geomType = feature.getGeometry().getType();
  const style = new OlStyle({
    fill: new OlFill({
      color: ['MultiPolygon', 'Polygon'].includes(geomType)
        ? '#FF0000'
        : [0, 0, 0, 0]
    }),
    stroke: new OlStroke({
      color: ['MultiPolygon', 'Polygon'].includes(geomType)
        ? '#FF0000'
        : '#FF0000',
      width: 3
    }),
    image: new OlCircle({
      radius: 7,
      fill: new OlFill({
        color: '#FF0000'
      })
    })
  });
  return [style];
}

export function getFeatureHighlightStyle() {
  return [
    new OlStyle({
      fill: new OlFill({
        color: [0, 0, 0, 0]
      }),
      stroke: new OlStroke({
        color: '#FF0000',
        width: 10
      }),
      image: new OlCircle({
        radius: 10,
        fill: new OlFill({
          color: '#FF0000'
        })
      })
    })
  ];
}

/**
 * Style used for popup selected feature highlight
 */

export function popupInfoStyle() {
  // MAJK: PopupInfo layer style (used for highlight)
  const styleFunction = () => {
    const styles = [];
    styles.push(
      new OlStyle({
        stroke: new OlStroke({
          color: strokeColor,
          width: 20
        }),
        zIndex: zIndex
      })
    );
    styles.push(
      new OlStyle({
        fill: new OlFill({
          color: fillColor
        }),
        stroke: new OlStroke({
          color: imageColor,
          width: 4
        }),
        image: new OlCircle({
          radius: 25,
          fill: new OlFill({
            color: radiusHighlightColor
          })
        }),
        zIndex: zIndex
      })
    );

    return styles;
  };
  return styleFunction;
}

export function postEditLayerStyle() {
  const styles = [];
  styles.push(
    new OlStyle({
      image: new OlCircle({
        radius: 27,
        stroke: new OlStroke({
          color: 'red',
          width: 3
        }),
        fill: new OlFill({
          color: 'rgba(236, 236, 236, 0.5)'
        })
      }),
      zIndex: 1000
    })
  );

  styles.push(
    new OlStyle({
      image: new OlIconStyle({
        anchor: [0.5, 40],
        scale: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: 'icons/marker-focused.png'
      }),
      zIndex: 1001
    })
  );

  return styles;
}

export function networkCorpHighlightStyle() {
  const styleFunction = () => {
    const styles = [];
    styles.push(
      new OlStyle({
        fill: new OlFill({
          color: fillColor
        }),
        stroke: new OlStroke({
          color: imageColor,
          width: 4
        }),
        image: new OlCircle({
          radius: 7,
          fill: new OlFill({
            color: imageColor
          })
        })
      })
    );

    return styles;
  };
  return styleFunction;
}

/**
 * Style used for corporate overlay highlight
 */

export function worldOverlayFill() {
  const styleFunction = () => {
    const styles = [];
    styles.push(
      new OlStyle({
        fill: new OlFill({
          color: 'rgba(236, 236, 236, 0.75)'
        }),
        zIndex: 300
      })
    );
    return styles;
  };
  return styleFunction;
}

/**
 * Style function used for vector layers.
 */
let styleCache = {};
export function baseStyle(config) {
  const styleFunction = (feature, resolution) => {
    // Get cache uid.
    let cacheId;
    if (config.stylePropFnRef) {
      cacheId = `${config.layerName}-`;
      Object.keys(config.stylePropFnRef).forEach(key => {
        const value = feature.get(config.stylePropFnRef[key]);
        if (value) {
          cacheId += value;
        }
      });
    }

    let _style;
    if (!styleCache[cacheId]) {
      let {
        strokeColor,
        fillColor,
        strokeWidth,
        lineDash,
        label,
        circleRadiusFn,
        iconUrl,
        iconScaleFn,
        scale,
        opacity,
        iconAnchor,
        iconAnchorXUnits,
        iconAnchorYUnits,
        stylePropFnRef
      } = config;

      const geometryType = feature.getGeometry().getType();
      let labelText;
      if (label && feature.get(label.text)) {
        const fontWeight = label.fontWeight || 'normal';
        const fontSize = label.fontSize || 12;
        const fontType = label.fontType || 'Arial';
        const font = fontWeight + ' ' + fontSize + '/' + 1 + ' ' + fontType;
        const placement =
          (!['Point', 'MultiPoint'].includes(geometryType) &&
            label.placement !== 'point') ||
            !label.placement
            ? 'point'
            : label.placement;

        labelText = new OlText({
          font,
          textAlign: label.textAlign,
          text: getText(
            feature.get(label.text),
            resolution,
            label.maxResolution || 1200,
            placement
          ),
          offsetX: label.offsetX || 12,
          offsetY: label.offsetY || 0,
          fill: new OlFill({ color: label.fill.color || 'black' }),
          stroke: new OlStroke({
            color: label.stroke.color || 'white',
            width: label.stroke.width || 3
          })
        });
      }

      switch (geometryType) {
        /**
         * Style used for geometry point type. It will render a circle based on the given formula
         */
        case 'Point':
        case 'MultiPoint': {
          let style;
          if (iconUrl || iconScaleFn) {
            const options = {
              image: new OlIconStyle({
                src:
                  stylePropFnRef &&
                    stylePropFnRef.iconUrl &&
                    iconUrl instanceof Function
                    ? iconUrl(feature.get(stylePropFnRef.iconUrl))
                    : iconUrl,
                scale:
                  stylePropFnRef && stylePropFnRef.iconScaleFn && iconScaleFn
                    ? iconScaleFn(feature.get(stylePropFnRef.iconScaleFn))
                    : scale || 1,
                opacity: opacity || 1,
                anchor: iconAnchor,
                anchorXUnits: iconAnchorXUnits,
                anchorYUnits: iconAnchorYUnits
              })
            };
            if (labelText) {
              options.text = labelText;
            }
            style = new OlStyle(options);
          } else {
            const options = {
              image: new OlCircle({
                stroke: new OlStroke({
                  color:
                    stylePropFnRef &&
                      stylePropFnRef.strokeColor &&
                      strokeColor instanceof Function
                      ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                      : strokeColor || 'rgba(255, 255, 255, 1)',
                  width:
                    stylePropFnRef &&
                      stylePropFnRef.strokeWidth &&
                      strokeWidth instanceof Function
                      ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                      : strokeWidth || 1
                }),
                fill: new OlFill({
                  color:
                    stylePropFnRef &&
                      stylePropFnRef.fillColor &&
                      fillColor instanceof Function
                      ? fillColor(feature.get(stylePropFnRef.fillColor))
                      : fillColor || 'rgba(129, 56, 17, 0.7)'
                }),
                radius:
                  stylePropFnRef &&
                    stylePropFnRef.circleRadiusFn &&
                    circleRadiusFn instanceof Function
                    ? circleRadiusFn(feature.get(stylePropFnRef.circleRadiusFn))
                    : 5
              })
            };
            if (labelText) {
              options.text = labelText;
            }
            style = new OlStyle(options);
          }

          if (cacheId) {
            styleCache[cacheId] = style;
          } else {
            _style = style;
          }
          break;
        }
        /**
         * Style used for line geometry type.
         */
        case 'LineString':
        case 'MultiLineString': {
          const options = {
            stroke: new OlStroke({
              color:
                stylePropFnRef &&
                  stylePropFnRef.strokeColor &&
                  strokeColor instanceof Function
                  ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                  : strokeColor || 'rgba(255, 255, 255, 1)',
              width:
                stylePropFnRef &&
                  stylePropFnRef.strokeWidth &&
                  strokeWidth instanceof Function
                  ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                  : strokeWidth || 4,
              lineDash: lineDash || [6]
            })
          };
          if (labelText) {
            options.text = labelText;
          }
          const style = new OlStyle(options);
          if (cacheId) {
            styleCache[cacheId] = style;
          } else {
            _style = style;
          }
          break;
        }
        case 'Polygon':
        case 'MultiPolygon': {
          const options = {
            fill: new OlFill({
              color:
                stylePropFnRef &&
                  stylePropFnRef.fillColor &&
                  fillColor instanceof Function
                  ? fillColor(feature.get(stylePropFnRef.fillColor))
                  : fillColor || 'rgba(255, 255, 255, 1)',
            })
          };

          if ((stylePropFnRef && stylePropFnRef.strokeColor) || strokeColor) {
            options.stroke = new OlStroke({
              color:
                stylePropFnRef &&
                  stylePropFnRef.strokeColor &&
                  strokeColor instanceof Function
                  ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                  : strokeColor || '#ffffff',
              width:
                stylePropFnRef &&
                  stylePropFnRef.strokeWidth &&
                  strokeWidth instanceof Function
                  ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                  : strokeWidth || 0,
              lineDash: lineDash || null
            })
          }
          if (labelText) {
            options.text = labelText;
          }
          const style = new OlStyle(options);
          if (cacheId) {
            styleCache[cacheId] = style;
          } else {
            _style = style;
          }
          break;
        }
        default:
          break;
      }
    }
    return styleCache[cacheId] || _style || defaultStyle;
  };
  return styleFunction;
}

export function colorMapStyle(layerName, colorField) {
  const styleFunction = feature => {
    const field = colorField || 'entity';
    const entity = feature.get(field);
    const colors = store.state.colorMapEntities[layerName];
    if (colors && colors[entity] && entity) {
      if (!styleCache[entity]) {
        styleCache[entity] = new OlStyle({
          fill: new OlFill({
            color: colors[entity]
          }),
          stroke: new OlStroke({
            color: colors[entity],
            width: 2
          }),
          image: new OlCircle({
            radius: 4,
            fill: new OlFill({
              color: colors[entity]
            })
          })
        });
      }
      return styleCache[entity];
    } else {
      return new OlStyle({
        fill: new OlFill({
          color: '#00c8f0'
        }),
        stroke: new OlStroke({
          color: '#00c8f0',
          width: 1.5
        }),
        image: new OlCircle({
          radius: 4,
          fill: new OlFill({
            color: '#00c8f0'
          })
        })
      });
    }
  };
  return styleFunction;
}
export function htmlLayerStyle() {
  const styleFunction = feature => {
    const group = feature.get('group');

    if (group === store.state.activeLayerGroup.navbarGroup) {
      return new OlStyle({
        image: new OlIconStyle({
          src: feature.get('icon'),
          scale: 1,
          opacity: 1
        })
      });
    } else {
      return [];
    }
  };
  return styleFunction;
}

export const styleRefs = {
  defaultStyle: defaultStyle,
  popupInfoStyle: popupInfoStyle,
  baseStyle: baseStyle,
  colorMapStyle: colorMapStyle,
  htmlLayerStyle: htmlLayerStyle
};

export const defaultLimits = {
  iconScaleFn: {
    smallestDefaultScale: 0.2,
    largestDefaultScale: 1,
    defaultMultiplier: 603000
  },
  circleRadiusFn: {
    smallestDefaultRadius: 5,
    largestDefaultRadius: 30,
    defaultMultiplier: 0.3
  }
};

const getText = function (text, resolution, maxResolution, placement, textWrap) {
  if (resolution > maxResolution) {
    text = '';
  } else if (textWrap == 'hide') {
    text = '';
  } else if (textWrap == 'shorten') {
    text = text.trunc(12);
  } else if (textWrap == 'wrap' && (!placement || placement != 'line')) {
    text = stringDivider(text, 16, '\n');
  }

  return text;
};

// https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
function stringDivider(str, width, spaceReplacer) {
  if (str.length > width) {
    let p = width;
    while (p > 0 && str[p] != ' ' && str[p] != '-') {
      p--;
    }
    if (p > 0) {
      let left;
      if (str.substring(p, p + 1) == '-') {
        left = str.substring(0, p + 1);
      } else {
        left = str.substring(0, p);
      }
      const right = str.substring(p + 1);
      return left + spaceReplacer + stringDivider(right, width, spaceReplacer);
    }
  }
  return str;
}

const getIconScaleValue = (
  propertyValue,
  multiplier,
  smallestScale,
  largestScale
) => {
  const {
    smallestDefaultScale,
    largestDefaultScale,
    defaultMultiplier
  } = defaultLimits.iconScaleFn;
  const smallestValue = smallestScale || smallestDefaultScale;
  const largestValue = largestScale || largestDefaultScale;
  let scale = propertyValue / (multiplier || defaultMultiplier);
  if (scale < smallestValue) {
    scale = smallestValue;
  }
  if (scale > largestValue) {
    scale = largestValue;
  }
  return scale;
};

const getRadiusValue = (
  propertyValue,
  multiplier,
  smallestRadius,
  largestRadius,
  defaultMultiplier
) => {
  const {
    smallestDefaultRadius,
    largestDefaultRadius
  } = defaultLimits.circleRadiusFn;
  const smallestValue = smallestRadius || smallestDefaultRadius;
  const largestValue = largestRadius || largestDefaultRadius;
  let radius = Math.sqrt(propertyValue) * multiplier || defaultMultiplier;
  if (radius < smallestValue) {
    radius = smallestValue;
  }
  if (radius > largestValue) {
    radius = largestValue;
  }
  return radius;
};

export const layersStylePropFn = {
  default: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue);
    },
    circleRadiusFn: propertyValue => {
      return getRadiusValue(propertyValue);
    },
    iconUrl: propertyValue => {
      return propertyValue;
    }
  },
  all_permits: {
    circleRadiusFn: propertyValue => {
      return Math.sqrt(propertyValue) * 0.008;
    },
    fillColor: propertyValue => {
      return propertyValue;
    }
  },
  epa_refineries: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue, 0.0000001, 0.2, 1.2);
    }
  },
  cancelled_pipelines: {
    strokeColor: propertyValue => propertyValue
  },
  coal_global2: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue, 1000, 0.4, 1.4);
    }
  },
  gas2: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue, 1000, 0.2, 1.4);
    }
  },
  oil: {
    circleRadiusFn: propertyValue => {
      return getRadiusValue(propertyValue, 0.3, 4, 50);
    }
  },
  miss_tri: {
    fillColor: propertyValue => {
      return propertyValue;
    }
  },
  refineries: {
    circleRadiusFn: propertyValue => {
      return getRadiusValue(propertyValue, 0.026);
    }
  },
  us_refineries: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue, 300000, 0.5, 2);
    }
  },
  us_refineries2: {
    iconScaleFn: propertyValue => {
      return getIconScaleValue(propertyValue, 300000, 0.4, 1.8);
    }
  },
  GiantOilFields: {
    circleRadiusFn: propertyValue => {
      return getRadiusValue(propertyValue, 0.3);
    }
  },
  Spills_20yrs: {
    circleRadiusFn: propertyValue => {
      return getRadiusValue(propertyValue, 0.7);
    }
  },
  indigenous_territories: {
    fillColor: propertyValue => {
      return propertyValue;
    }
  }
};
