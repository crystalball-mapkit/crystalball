/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
import OlStyle from 'ol/style/Style';
import OlStroke from 'ol/style/Stroke';
import OlFill from 'ol/style/Fill';
import OlCircle from 'ol/style/Circle';
import OlRegularShape from 'ol/style/RegularShape';
import OlIconStyle from 'ol/style/Icon';
import OlText from 'ol/style/Text';
import store from '../store/modules/map';
import {OlStyleFactory} from '../factory/OlStyle';

// Resets cache when map groups is changed.
import {EventBus} from '../EventBus';

const strokeColor = 'rgba(236, 236, 236, 0.7)';
const fillColor = 'rgba(255,0,0, 0.2)';
const imageColor = 'blue';
const radiusHighlightColor = 'rgba(232,223,181,0.3)';
const zIndex = 100;
EventBus.$on('group-changed', () => {
  styleCache = {};
});

const clusterDefaultStyle = {
  style: {
    innerCircle: {
      radius: 14,
      fillColor: 'rgba(255, 165, 0, 0.7)',
      text: {
        fillColor: '#fff',
        strokeColor: 'rgba(0, 0, 0, 0.6)',
        strokeWidth: 3,
      },
    },
    outerCircle: {
      radius: 20,
      fillColor: 'rgba(255, 153, 102, 0.3)',
    },
  },
};

export function defaultStyle(feature) {
  const geomType = feature.getGeometry().getType();
  const style = new OlStyle({
    fill: new OlFill({
      color: ['MultiPolygon', 'Polygon'].includes(geomType) ? '#FF0000' : [0, 0, 0, 0],
    }),
    stroke: new OlStroke({
      color: ['MultiPolygon', 'Polygon'].includes(geomType) ? '#FF0000' : '#FF0000',
      width: 3,
    }),
    image: new OlCircle({
      radius: 7,
      fill: new OlFill({
        color: '#FF0000',
      }),
    }),
  });
  return [style];
}

export function getFeatureHighlightStyle() {
  return [
    new OlStyle({
      fill: new OlFill({
        color: [0, 0, 0, 0],
      }),
      stroke: new OlStroke({
        color: '#FF0000',
        width: 10,
      }),
      image: new OlCircle({
        radius: 10,
        fill: new OlFill({
          color: '#FF0000',
        }),
      }),
    }),
  ];
}

export function getSearchHighlightStyle() {
  return [
    new OlStyle({
      fill: new OlFill({
        color: 'rgba(255,0,0,0.2)',
      }),
      stroke: new OlStroke({
        color: '#FF0000',
        width: 3,
      }),
      image: new OlCircle({
        radius: 8,
        stroke: new OlStroke({
          color: '#FF0000',
          width: 3,
        }),
        fill: new OlFill({
          color: 'rgba(255,0,0,0.2)',
        }),
      }),
    }),
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
          width: 20,
        }),
        zIndex,
      })
    );
    styles.push(
      new OlStyle({
        fill: new OlFill({
          color: fillColor,
        }),
        stroke: new OlStroke({
          color: imageColor,
          width: 4,
        }),
        image: new OlCircle({
          radius: 25,
          fill: new OlFill({
            color: radiusHighlightColor,
          }),
        }),
        zIndex,
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
          width: 3,
        }),
        fill: new OlFill({
          color: 'rgba(236, 236, 236, 0.5)',
        }),
      }),
      zIndex: 1000,
    })
  );

  styles.push(
    new OlStyle({
      image: new OlIconStyle({
        anchor: [0.5, 40],
        scale: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: 'icons/marker-focused.png',
      }),
      zIndex: 1001,
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
          color: fillColor,
        }),
        stroke: new OlStroke({
          color: imageColor,
          width: 4,
        }),
        image: new OlCircle({
          radius: 7,
          fill: new OlFill({
            color: imageColor,
          }),
        }),
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
          color: 'rgba(236, 236, 236, 0.75)',
        }),
        zIndex: 300,
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
    let clusterSize;
    let cacheId;
    if (Array.isArray(feature.get('features'))) {
      clusterSize = feature.get('features').length;
    }
    if (clusterSize === 1) {
      feature = feature.get('features')[0];
    }
    if (config.stylePropFnRef) {
      cacheId = `${config.layerName}-`;
      if (clusterSize && clusterSize > 1) {
        cacheId += clusterSize;
      }
      if (!clusterSize || clusterSize === 1) {
        Object.keys(config.stylePropFnRef).forEach(key => {
          const value = feature.get(config.stylePropFnRef[key]);
          if (value) {
            cacheId += value;
          }
        });
      }
    }
    // Don't build style cache if colorMap values are not loaded. Only for layers that use colorMap.
    if (config.stylePropFnRef && config.stylePropFnRef.fillColorFn && !store.state.colorMapEntities[config.layerName]) {
      return [];
    }

    let _style;
    if (!styleCache[cacheId]) {
      const {
        strokeColor,
        fillColor,
        strokeWidth,
        lineDash,
        label,
        radius,
        radius2,
        points,
        angle,
        iconUrl,
        iconScale,
        scale,
        opacity,
        iconAnchor,
        iconAnchorXUnits,
        iconAnchorYUnits,
        stylePropFnRef,
        cluster,
      } = config;

      // Cluster style
      if (clusterSize > 1) {
        const clusterStyles = [];
        if (!cluster.style) {
          cluster.style = {};
        }
        if (!cluster.style.innerCircle) {
          cluster.style.innerCircle = {};
        }
        if (!cluster.style.innerCircle.text) {
          cluster.style.innerCircle.text = {};
        }
        if (cluster.style.innerCircle) {
          clusterStyles.push(
            new OlStyle({
              image: new OlCircle({
                radius: cluster.style.innerCircle.radius || clusterDefaultStyle.style.innerCircle.radius,
                fill: cluster.style.innerCircle.fillColor
                  ? OlStyleFactory.createFill(cluster.style.innerCircle)
                  : OlStyleFactory.createFill(clusterDefaultStyle.style.innerCircle),
              }),
              text: new OlText({
                text: clusterSize.toString(),
                fill: cluster.style.innerCircle.text.fillColor
                  ? OlStyleFactory.createFill(cluster.style.innerCircle.text)
                  : OlStyleFactory.createFill(clusterDefaultStyle.style.innerCircle.text),
                stroke: cluster.style.innerCircle.text.strokeColor
                  ? OlStyleFactory.createStroke(cluster.style.innerCircle.text)
                  : OlStyleFactory.createStroke(clusterDefaultStyle.style.innerCircle.text),
              }),
            })
          );
        }
        if (cluster.style.outerCircle) {
          clusterStyles.push(
            new OlStyle({
              image: new OlCircle({
                radius: cluster.style.outerCircle.radius || clusterDefaultStyle.style.outerCircle.radius,
                fill: cluster.style.outerCircle.fillColor
                  ? OlStyleFactory.createFill(cluster.style.outerCircle)
                  : OlStyleFactory.createFill(clusterDefaultStyle.style.outerCircle),
              }),
            })
          );
        }
        styleCache[cacheId] = clusterStyles;
        return clusterStyles;
      }

      const geometryType = feature.getGeometry().getType();
      let labelText;
      if (label && feature.get(label.text)) {
        const fontWeight = label.fontWeight || 'normal';
        const fontSize = label.fontSize || 12;
        const fontType = label.fontType || 'Arial';
        const font = `${fontWeight} ${fontSize}/${1} ${fontType}`;
        const placement =
          (!['Point', 'MultiPoint'].includes(geometryType) && label.placement !== 'point') || !label.placement
            ? 'point'
            : label.placement;

        labelText = new OlText({
          font,
          textAlign: label.textAlign,
          text: getText(feature.get(label.text), resolution, label.maxResolution || 1200, placement),
          offsetX: label.offsetX || 12,
          offsetY: label.offsetY || 0,
          fill: new OlFill({color: label.fill.color || 'black'}),
          stroke: new OlStroke({
            color: label.stroke.color || 'white',
            width: label.stroke.width || 3,
          }),
        });
      }

      switch (geometryType) {
        /**
         * Style used for geometry point type. It will render a circle based on the given formula
         */
        case 'Point':
        case 'MultiPoint': {
          let style;
          if (iconUrl || iconScale) {
            const options = {
              image: new OlIconStyle({
                src:
                  stylePropFnRef && stylePropFnRef.iconUrl && iconUrl instanceof Function
                    ? iconUrl(feature.get(stylePropFnRef.iconUrl))
                    : iconUrl,
                scale:
                  stylePropFnRef && stylePropFnRef.iconScale && iconScale
                    ? iconScale(feature.get(stylePropFnRef.iconScale))
                    : scale || 1,
                opacity: opacity || 1,
                anchor: iconAnchor,
                anchorXUnits: iconAnchorXUnits,
                anchorYUnits: iconAnchorYUnits,
              }),
            };
            if (labelText) {
              options.text = labelText;
            }
            style = new OlStyle(options);
          } else {
            const baseImageOptions = {
              stroke: new OlStroke({
                color:
                  stylePropFnRef && stylePropFnRef.strokeColor && strokeColor instanceof Function
                    ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                    : strokeColor || 'rgba(255, 255, 255, 1)',
                width:
                  stylePropFnRef && stylePropFnRef.strokeWidth && strokeWidth instanceof Function
                    ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                    : strokeWidth || 1,
              }),
              fill: new OlFill({
                color:
                  stylePropFnRef && stylePropFnRef.fillColor && fillColor instanceof Function
                    ? fillColor(feature.get(stylePropFnRef.fillColor))
                    : fillColor || 'rgba(129, 56, 17, 0.7)',
              }),
              radius:
                stylePropFnRef && stylePropFnRef.radius && radius instanceof Function
                  ? radius(feature.get(stylePropFnRef.radius))
                  : radius || 5,
            };
            let image;
            if (config.type === 'circle') {
              image = new OlCircle({
                ...baseImageOptions,
              });
            } else {
              image = new OlRegularShape({
                ...baseImageOptions,
                radius2:
                  stylePropFnRef && stylePropFnRef.radius2 && radius2 instanceof Function
                    ? radius2(feature.get(stylePropFnRef.radius2))
                    : radius2,
                points:
                  stylePropFnRef && stylePropFnRef.points && points instanceof Function
                    ? points(feature.get(stylePropFnRef.points))
                    : points || 4,
                angle:
                  stylePropFnRef && stylePropFnRef.angle && angle instanceof Function
                    ? angle(feature.get(stylePropFnRef.angle))
                    : angle || 0,
                scale:
                  stylePropFnRef && stylePropFnRef.scale && scale instanceof Function
                    ? scale(feature.get(stylePropFnRef.scale))
                    : scale,
              });
            }

            const options = {
              image,
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
                stylePropFnRef && stylePropFnRef.strokeColor && strokeColor instanceof Function
                  ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                  : strokeColor || 'rgba(255, 255, 255, 1)',
              width:
                stylePropFnRef && stylePropFnRef.strokeWidth && strokeWidth instanceof Function
                  ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                  : strokeWidth || 4,
              lineDash,
            }),
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
                stylePropFnRef && stylePropFnRef.fillColor && fillColor instanceof Function
                  ? fillColor(feature.get(stylePropFnRef.fillColor))
                  : fillColor || 'rgba(255, 255, 255, 1)',
            }),
          };

          if ((stylePropFnRef && stylePropFnRef.strokeColor) || strokeColor) {
            options.stroke = new OlStroke({
              color:
                stylePropFnRef && stylePropFnRef.strokeColor && strokeColor instanceof Function
                  ? strokeColor(feature.get(stylePropFnRef.strokeColor))
                  : strokeColor || '#ffffff',
              width:
                stylePropFnRef && stylePropFnRef.strokeWidth && strokeWidth instanceof Function
                  ? strokeWidth(feature.get(stylePropFnRef.strokeWidth))
                  : strokeWidth || 0,
              lineDash: lineDash || null,
            });
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

export function htmlLayerStyle() {
  const styleFunction = feature => {
    const group = feature.get('group');

    if (group === store.state.activeLayerGroup.navbarGroup) {
      return new OlStyle({
        image: new OlIconStyle({
          src: feature.get('icon'),
          scale: 1,
          opacity: 1,
        }),
      });
    }
    return [];
  };
  return styleFunction;
}

export const styleRefs = {
  defaultStyle,
  popupInfoStyle,
  baseStyle,
  htmlLayerStyle,
};

export const defaultLimits = {
  iconScale: {
    smallestDefaultScale: 0.2,
    largestDefaultScale: 1,
    defaultMultiplier: 603000,
  },
  radius: {
    smallestDefaultRadius: 5,
    largestDefaultRadius: 30,
    defaultMultiplier: 0.3,
  },
  radius2: {
    smallestDefaultRadius: 5,
    largestDefaultRadius: 30,
    defaultMultiplier: 0.3,
  },
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

const getIconScaleValue = (propertyValue, multiplier, smallestScale, largestScale) => {
  const {smallestDefaultScale, largestDefaultScale, defaultMultiplier} = defaultLimits.iconScale;
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

const getRadiusValue = (propertyValue, multiplier, smallestRadius, largestRadius, defaultMultiplier) => {
  const {smallestDefaultRadius, largestDefaultRadius} = defaultLimits.radius;
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

export const colorMapFn = layerName => {
  const colorFn = propertyValue => {
    const colors = store.state.colorMapEntities[layerName];
    const entity = propertyValue;
    if (colors && colors[entity]) {
      return colors[entity];
    }
    return '#00c8f0';
  };
  return colorFn;
};

export const layersStylePropFn = {
  default: {
    iconScale: propertyValue => getIconScaleValue(propertyValue),
    radius: propertyValue => getRadiusValue(propertyValue),
    iconUrl: propertyValue => propertyValue,
  },
  glri_projects: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.012, 2, 26),
  },
  glri_projects2: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.012, 2, 26),
  },
  colaboradores: {
    fillColor: propertyValue => propertyValue,
  },
  native_land: {
    fillColor: propertyValue => propertyValue,
  },
  chi_test: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1991: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1992: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1993: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1994: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1995: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1996: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1997: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1998: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_1999: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  groundwater_2000: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.4, 3, 40),
  },
  coal_ash: {
    fillColor: propertyValue => propertyValue,
  },
  burnables: {
    fillColor: propertyValue => propertyValue,
    radius: propertyValue => getRadiusValue(propertyValue, 0.2, 3, 26),
  },
  polygons: {
    strokeColor: propertyValue => propertyValue,
    fillColor: propertyValue => propertyValue,
  },
  points: {
    strokeColor: propertyValue => propertyValue,
    fillColor: propertyValue => propertyValue,
  },
  lines: {
    strokeColor: propertyValue => propertyValue,
    strokeWidth: propertyValue => propertyValue,
  },
  Rosario: {
    strokeWidth: propertyValue => propertyValue / 100000,
  },
};
