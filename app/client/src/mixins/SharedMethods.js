import {getNestedProperty, humanize} from '../utils/Helpers';
/**
 * Mixin, which share some reusable methods between componenet.
 */

export const SharedMethods = {
  methods: {
    mapPopupPropName(item, activeLayer, translations) {
      const propertyName = item.property;
      if (!activeLayer) return propertyName;
      const layerName = activeLayer.get('name');
      const popupMapping = this.$appConfig.map.popupFieldsMapping;
      if (!layerName || !popupMapping) return propertyName;
      let property = '';
      if (translations && translations[propertyName]) {
        return humanize(translations[propertyName]).toUpperCase();
      }
      property = item.humanizedProperty.toUpperCase();
      const mappedProperty =
        getNestedProperty(popupMapping, `${layerName}.${propertyName}`) ||
        popupMapping.default[propertyName] ||
        property;
      return mappedProperty;
    },
  },
};
