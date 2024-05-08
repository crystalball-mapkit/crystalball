/* eslint-disable no-bitwise */
/* eslint-disable no-prototype-builtins */
import TileLayer from 'ol/layer/Tile';
import TileWmsSource from 'ol/source/TileWMS';
import OsmSource from 'ol/source/OSM';
import EsriJSON from 'ol/format/EsriJSON';
import {tile as tileStrategy, bbox as bboxStrategy} from 'ol/loadingstrategy';
import {createXYZ} from 'ol/tilegrid';
import BingMaps from 'ol/source/BingMaps';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MvtFormat from 'ol/format/MVT';
import GeoJsonFormat from 'ol/format/GeoJSON';
import TopoJsonFormat from 'ol/format/TopoJSON';
import KmlFormat from 'ol/format/KML';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ImageWMS from 'ol/source/ImageWMS';
import LayerGroup from 'ol/layer/Group';
import Cluster from 'ol/source/Cluster';
import {Image as ImageLayer} from 'ol/layer';
import XyzSource from 'ol/source/XYZ';
import {OlStyleFactory} from './OlStyle';
import {styleRefs, layersStylePropFn, colorMapFn} from '../style/OlStyleDefs';
import http from '../services/http';

/**
 * Factory, which creates OpenLayers layer instances according to a given config
 * object.
 */
export const LayerFactory = {
  /**
   * Maps the format literal of the config to the corresponding OL module.
   * @type {Object}
   */
  formatMapping: {
    MVT: MvtFormat,
    GeoJSON: GeoJsonFormat,
    TopoJSON: TopoJsonFormat,
    KML: KmlFormat,
  },

  computeQuadKey(x, y, z) {
    const quadKeyDigits = [];
    // eslint-disable-next-line no-plusplus
    for (let i = z; i > 0; i--) {
      let digit = 0;
      const mask = 1 << (i - 1);
      if ((x & mask) !== 0) {
        // eslint-disable-next-line no-plusplus
        digit++;
      }
      if ((y & mask) !== 0) {
        digit += 2;
      }
      quadKeyDigits.push(digit);
    }
    return quadKeyDigits.join('');
  },

  getStyles(lConf) {
    if (!lConf.style) return;
    if (lConf.style.featureStyles && Array.isArray(lConf.style.featureStyles)) {
      const styleArray = [];
      lConf.style.featureStyles.forEach(style => {
        const renderedStyle = this.renderStyle(style, lConf.name);
        styleArray.push(renderedStyle);
      });
      // eslint-disable-next-line consistent-return
      return (feature, resolution) => {
        const styles = [];
        styleArray.forEach(style => {
          if (style instanceof Function) {
            styles.push(style(feature, resolution));
          } else {
            styles.push(style);
          }
        });
        return styles;
      };
    }
    // eslint-disable-next-line consistent-return
    return this.renderStyle(lConf.style, lConf.name);
  },

  /**
   * Returns the corresponding style of the layer based on configuration.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.style} Ol Style
   */
  renderStyle(styleProps, layerName) {
    let {styleRef, stylePropFnRef} = styleProps;
    const {label} = styleProps;
    if ((stylePropFnRef && !styleRef) || label) {
      styleRef = 'baseStyle';
    }
    if (styleRef === 'htmlLayerStyle') {
      return styleRefs.htmlLayerStyle();
    }
    if (styleRef === 'popupInfoStyle') {
      return styleRefs.popupInfoStyle();
    }
    if (!stylePropFnRef) {
      stylePropFnRef = {};
    }
    if ((styleProps && styleRef && Object.keys(stylePropFnRef).length > 0 && styleRefs[styleRef]) || label) {
      // Get style function reference (default is baseStyle)
      const styleFn = styleRefs[styleRef];
      // Get the functions of the layer
      const stylePropFn = {};
      // Get property function from layer config object or default object
      Object.keys(stylePropFnRef).forEach(fnName => {
        let fn;
        if (layersStylePropFn[layerName]) {
          fn = layersStylePropFn[layerName][fnName] || layersStylePropFn.default[fnName];
        } else if (layersStylePropFn.default[fnName]) {
          fn = layersStylePropFn.default[fnName];
        }
        if (fn) {
          stylePropFn[fnName] = fn;
        }
      });
      // Overwrite fillColor if colorMapStyle is set
      if (stylePropFnRef.fillColorFn === 'colorMapStyle') {
        stylePropFn.fillColor = colorMapFn(layerName);
      }
      const props = {...styleProps, ...stylePropFn, layerName};
      return styleFn(props, layerName);
    }

    return OlStyleFactory.getInstance(styleProps);
  },

  /**
   * Returns an OpenLayers layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @param  {Object} zIndex    Index of array used as zIndex for group layers
   * @return {ol.layer.Base} OL layer instance
   */
  getInstance(lConf, zIndex) {
    // apply LID (Layer ID) if not existant
    if (!lConf.lid) {
      const now = new Date();
      // eslint-disable-next-line no-param-reassign
      lConf.lid = now.getTime();
    }

    // create correct layer type
    if (lConf.type === 'WMS') {
      return this.createWmsLayer(lConf);
    }
    if (lConf.type === 'WMSTILE') {
      return this.createWmsTileLayer(lConf);
    }
    if (lConf.type === 'XYZ') {
      return this.createXyzLayer(lConf);
    }
    if (lConf.type === 'OSM') {
      return this.createOsmLayer(lConf);
    }
    if (lConf.type === 'BING') {
      return this.createBingLayer(lConf);
    }
    if (lConf.type === 'BING-QUADKEY') {
      return this.createBingQuadKeyLayer(lConf);
    }
    if (lConf.type === 'VECTOR') {
      return this.createVectorLayer(lConf);
    }
    if (lConf.type === 'VECTORTILE') {
      return this.createVectorTileLayer(lConf);
    }
    if (lConf.type === 'ESRI') {
      return this.createESRIFeatureService(lConf);
    }
    if (lConf.type === 'GROUP') {
      return this.createGroupLayer(lConf, zIndex);
    }
    return null;
  },

  /**
   * Returns an OpenLayers WMS layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL WMS layer instance
   */
  createWmsLayer(lConf) {
    const layer = new ImageLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      visible: lConf.visible,
      opacity: lConf.opacity,
      queryable: lConf.queryable,
      requiresPois: lConf.requiresPois,
      ratio: lConf.ratio ? lConf.ratio : 1.5,
      zIndex: lConf.zIndex,
      group: lConf.group,
      source: new ImageWMS({
        url: lConf.url,
        params: {
          LAYERS: lConf.layers,
        },
        serverType: lConf.serverType ? lConf.serverType : 'geoserver',
        ratio: lConf.ratio,
        attributions: lConf.attributions,
      }),
    });

    return layer;
  },
  /**
   * Returns an OpenLayers WMS Tile layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL WMS layer instance
   */
  createWmsTileLayer(lConf) {
    const layer = new TileLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      extent: lConf.extent,
      visible: lConf.visible,
      opacity: lConf.opacity,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      preload: lConf.preload ? parseFloat(lConf.preload) : 0, // Parse float is used because it's not possible to add values like Infinity in json config
      zIndex: lConf.zIndex,
      group: lConf.group,
      source: new TileWmsSource({
        url: lConf.url,
        params: {
          LAYERS: lConf.layers,
          TILED: lConf.tiled,
        },
        serverType: lConf.serverType ? lConf.serverType : 'geoserver',
        attributions: lConf.attributions,
      }),
    });

    return layer;
  },

  /**
   * Returns an XYZ based tile layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL XYZ layer instance
   */
  createXyzLayer(lConf) {
    const xyzLayer = new TileLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      visible: lConf.visible,
      opacity: lConf.opacity,
      minResolution: lConf.minResolution,
      maxResolution: lConf.maxResolution,
      group: lConf.group,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      source: new XyzSource({
        url: lConf.hasOwnProperty('accessToken') ? `${lConf.url}?access_token=${lConf.accessToken}` : lConf.url,
        maxZoom: lConf.maxZoom || 18,
        attributions: lConf.attributions,
        tilePixelRatio: lConf.tilePixelRatio || 1,
        crossOrigin: lConf.crossOrigin,
        opaque: lConf.opaque || true,
      }),
    });

    return xyzLayer;
  },

  /**
   * Returns an OpenLayers OSM layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL OSM layer instance
   */
  createOsmLayer(lConf) {
    const layer = new TileLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      visible: lConf.visible,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      opacity: lConf.opacity,
      group: lConf.group,
      source: new OsmSource({
        url: lConf.url,
        maxZoom: lConf.maxZoom,
      }),
    });

    return layer;
  },

  /**
   * Returns an OpenLayers BING layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL BING layer instance
   */
  createBingLayer(lConf) {
    const bingMaps = new BingMaps({
      key: lConf.accessToken,
      imagerySet: lConf.imagerySet,
      maxZoom: lConf.maxZoom,
    });
    const layer = new TileLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      minResolution: lConf.minResolution,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      maxZoom: lConf.maxZoom,
      visible: lConf.visible,
      group: lConf.group,
      opacity: lConf.opacity,
      source: bingMaps,
    });

    return layer;
  },

  /**
   * Returns an OpenLayers BING layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Tile} OL BING layer instance
   */
  createBingQuadKeyLayer(lConf) {
    const layer = new TileLayer({
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      minResolution: lConf.minResolution,
      maxZoom: lConf.maxZoom,
      visible: lConf.visible,
      opacity: lConf.opacity,
      group: lConf.group,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
      source: new XyzSource({
        tileUrlFunction: tileCoord => {
          const z = tileCoord[0];
          const x = tileCoord[1];
          const y = -tileCoord[2] - 1;
          return `${lConf.url + this.computeQuadKey(x, y, z)}.jpg`;
        },
      }),
    });

    return layer;
  },

  /**
   * Returns an OpenLayers vector layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.Vector} OL vector layer instance
   */
  createVectorLayer(lConf) {
    let url;
    const sourceConfig = {
      format: new this.formatMapping[lConf.format](lConf.formatConfig),
      attributions: lConf.attributions,
    };
    // Check if url is a WFS service
    if (lConf.url.includes('wfs?service=WFS&')) {
      // eslint-disable-next-line func-names
      url = function (extent) {
        return `${lConf.url}&bbox=${extent.join(',')},EPSG:3857`;
      };
      sourceConfig.strategy = bboxStrategy;
    } else {
      url = lConf.url;
    }
    sourceConfig.url = url;
    let source = new VectorSource(sourceConfig);

    if (lConf.style.cluster) {
      const clusterOptions = lConf.style.cluster.options || {};
      source = new Cluster({
        distance: clusterOptions.distance || 20,
        minDistance: clusterOptions.minDistance || 0,
        source,
      });
    }

    const vectorLayer = new VectorLayer({
      type: lConf.type,
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      extent: lConf.extent,
      queryable: lConf.queryable,
      showZoomToFeature: lConf.showZoomToFeature,
      canEdit: lConf.canEdit,
      visible: lConf.visible,
      minResolution: lConf.minResolution,
      maxResolution: lConf.maxResolution,
      isInteractive: lConf.isInteractive,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      includeInSearch: lConf.includeInSearch,
      searchLabel: lConf.searchLabel,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      opacity: lConf.opacity,
      zIndex: lConf.zIndex,
      group: lConf.group,
      source,
      style: this.getStyles(lConf),
      hoverable: lConf.hoverable,
      hoverAttribute: lConf.hoverAttribute,
      label: lConf.label,
      styleObj: JSON.stringify(lConf.style),
    });
    return vectorLayer;
  },

  /**
   * Returns an OpenLayers vector tile layer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.VectorTile} OL vector tile layer instance
   */
  createVectorTileLayer(lConf) {
    const vtLayer = new VectorTileLayer({
      type: lConf.type,
      name: lConf.name,
      title: lConf.title,
      lid: lConf.lid,
      queryable: lConf.queryable,
      showZoomToFeature: lConf.showZoomToFeature,
      visible: lConf.visible,
      minResolution: lConf.minResolution,
      maxResolution: lConf.maxResolution,
      isInteractive: lConf.isInteractive,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      includeInSearch: lConf.includeInSearch,
      searchLabel: lConf.searchLabel,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      opacity: lConf.opacity,
      group: lConf.group,
      renderMode: lConf.renderMode || 'hybrid',
      source: new VectorTileSource({
        url: lConf.url,
        format: new this.formatMapping[lConf.format](),
        attributions: lConf.attributions,
      }),
      style: this.getStyles(lConf),
      hoverable: lConf.hoverable,
      hoverAttribute: lConf.hoverAttribute,
      styleObj: JSON.stringify(lConf.style),
    });

    return vtLayer;
  },

  /**
   * Returns an OpenLayers vector tilelayer instance due to given config.
   *
   * @param  {Object} lConf  Layer config object
   * @return {ol.layer.VectorTile} OL vector tile layer instance
   */
  createESRIFeatureService(lConf) {
    const esrijsonFormat = new EsriJSON();
    const vectorSource = new VectorSource({
      loader(extent, resolution, projection) {
        const url =
          `${lConf.url + lConf.layer}/query/?f=json&` +
          `returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=${encodeURIComponent(
            `{"xmin":${extent[0]},"ymin":${extent[1]},"xmax":${extent[2]},"ymax":${extent[3]},"spatialReference":{"wkid":102100}}`
          )}&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*` +
          '&outSR=102100';

        http.get(url).then(response => {
          const features = esrijsonFormat.readFeatures(response.data, {
            featureProjection: projection,
          });
          if (features.length > 0) {
            vectorSource.addFeatures(features);
          }
        });
      },
      strategy: tileStrategy(
        createXYZ({
          tileSize: 512,
        })
      ),
    });

    const layer = new VectorLayer({
      name: lConf.name,
      type: lConf.type,
      title: lConf.title,
      lid: lConf.lid,
      zIndex: lConf.zIndex,
      queryable: lConf.queryable,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      seriesDisplayName: lConf.seriesDisplayName,
      visible: lConf.visible,
      opacity: lConf.opacity,
      source: vectorSource,
      style: this.getStyles(lConf),
    });

    return layer;
  },

  createGroupLayer(lConf, zIndex) {
    const layers = [];
    const layersConfig = lConf.layers;
    if (Array.isArray(layersConfig)) {
      layersConfig.forEach((layerConfig, index) => {
        const layer = this.getInstance(layerConfig);
        if (zIndex) {
          layer.setZIndex(zIndex + index);
        }
        layers.push(layer);
        if (lConf.displaySeries) {
          const defaultLayerSeriesIndex = lConf.defaultSeriesLayerIndex || 0;
          if (index === defaultLayerSeriesIndex) {
            layer.setVisible(true);
          } else {
            layer.setVisible(false);
          }
        }
      });
    }
    const layer = new LayerGroup({
      name: lConf.name,
      type: lConf.type,
      title: lConf.title,
      lid: lConf.lid,
      displayInLegend: lConf.displayInLegend,
      displaySidebarInfo: lConf.displaySidebarInfo,
      sidebarDefaultMedia: lConf.sidebarDefaultMedia,
      legendIcon: lConf.legendIcon,
      legendDisplayName: lConf.legendDisplayName,
      visible: lConf.visible,
      opacity: lConf.opacity,
      queryable: lConf.queryable,
      ratio: lConf.ratio ? lConf.ratio : 1.5,
      zIndex: lConf.zIndex,
      group: lConf.group,
      displaySeries: lConf.displaySeries,
      defaultSeriesLayerIndex: lConf.defaultSeriesLayerIndex,
      activeLayerIndex: lConf.defaultSeriesLayerIndex || 0, // Used for layer series title in legend which is updated on layer change
      layers,
    });
    return layer;
  },
};
