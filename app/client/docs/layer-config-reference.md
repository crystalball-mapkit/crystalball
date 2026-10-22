# Layer config reference

Reference for `app/client/public/static/app-conf.json` layer entries (`map.layers[]`) and `map.groups`. Grounded in
`app/client/src/factory/OlLayer.js`, `Map.vue`, `OlStyleDefs.js`, `Legend.vue`, `TimeSlider.vue`, `Search.vue`,
`Analysis.vue`, `Edit.vue`, `SidePanel.vue`.

## ⚠ The #1 trap: `group` vs `groups`

- `groups` (top-level, plural): `map.groups.<navbarGroup>.<region>.layers` = array of layer **name strings**. This is
  the ONLY thing that determines whether a layer is instantiated on the map, per route (`/<navbarGroup>/<region>`).
  `Map.vue createLayers()` skips any layer whose `name` isn't in this list — full stop.
- `group` (per-layer, singular string): cosmetic tag only. Effects: `group: "backgroundLayers"` hides the row from the
  Legend list; otherwise used only as a per-_feature_ filter key for `html_posts`-style layers/search paging. **Does not
  control rendering.**

## Layer `type` values

| type                    | OL class                                                 | status |
| ----------------------- | -------------------------------------------------------- | ------ |
| `VECTOR`                | `Vector` + `Vector` source (optional `Cluster` wrap)     | used   |
| `VECTORTILE`            | `VectorTile` + `VectorTile` source                       | used   |
| `GROUP`                 | `Group`, recurses                                        | used   |
| `XYZ`                   | `Tile` + `XYZ` source                                    | used   |
| `OLMS`                  | `VectorTile`, styled via `ol-mapbox-style`               | used   |
| `WMS`                   | `Image` + `ImageWMS`                                     | unused |
| `WMSTILE`               | `Tile` + `TileWMS`                                       | unused |
| `OSM`                   | `Tile` + `OSM` source                                    | unused |
| `BING`                  | `Tile` + `BingMaps` source                               | unused |
| `BING-QUADKEY`          | `Tile`, custom quadkey URL fn                            | unused |
| `ESRI`                  | `Vector`, custom EsriJSON loader                         | unused |
| anything else / missing | `getInstance()` logs a `console.warn` and returns `null` | —      |

## Universal properties

| key                             | type/example                        | applies to                                                         | effect                                                                                                     | default                                                                      |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `name`                          | string, unique                      | all                                                                | id used everywhere (groups.layers membership, lookups, legend)                                             | none — no name ⇒ never added                                                 |
| `type`                          | see above                           | all                                                                | dispatch key                                                                                               | required                                                                     |
| `url`                           | string                              | all except GROUP                                                   | source endpoint/template                                                                                   | —                                                                            |
| `visible`                       | bool                                | all                                                                | initial visibility                                                                                         | OL default `true`                                                            |
| `opacity`                       | 0–1                                 | all except GROUP                                                   | layer opacity                                                                                              | `1`                                                                          |
| `zIndex`                        | number                              | all                                                                | stacking order                                                                                             | position in `groups.*.layers`, or `parentZIndex + childIndex` inside a GROUP |
| `minResolution`/`maxResolution` | number                              | all                                                                | resolution-gated visibility (map + Legend/TimeSlider row hiding)                                           | `0`/`Infinity`                                                               |
| `queryable`                     | bool                                | all                                                                | gates click "GetInfo" + Analysis selectability                                                             | `true` (`!== false`)                                                         |
| `isInteractive`                 | bool                                | VECTOR/VECTORTILE                                                  | gates hover/click hit-testing — overlaps `queryable`, no clean split                                       | `true`                                                                       |
| `hoverable`                     | bool                                | VECTOR/VECTORTILE                                                  | shows hover tooltip                                                                                        | **`false`**                                                                  |
| `displayInLegend`               | bool                                | all                                                                | legend checkbox row shown                                                                                  | `false`                                                                      |
| `displaySidebarInfo`            | bool                                | all                                                                | legend icon opens sidebar info panel                                                                       | `false`                                                                      |
| `sidebarDefaultMedia`           | `{top?, bottom?}`                   | all                                                                | feature-popup sidebar media blocks (independent of above)                                                  | none                                                                         |
| `legendIcon`                    | URL string                          | all                                                                | legend swatch image, overrides style-derived icon                                                          | style-derived                                                                |
| `legendDisplayName`             | `{en,es,pt}` or string              | all                                                                | human label (legend/sidebar/search/slider)                                                                 | `humanize(name)`                                                             |
| `group`                         | string                              | all                                                                | see trap above                                                                                             | —                                                                            |
| `attributions`                  | string/array                        | all except **GROUP (inert — never passed to LayerGroup)**          | OL source attribution text                                                                                 | —                                                                            |
| `format`                        | `MVT`\|`GeoJSON`\|`TopoJSON`\|`KML` | VECTOR, VECTORTILE                                                 | feature format. VECTOR passes `formatConfig` as ctor args; **VECTORTILE ignores `formatConfig` entirely**  | unrecognized/missing ⇒ `console.warn`, returns `null`                        |
| `style`                         | object                              | VECTOR, VECTORTILE, ESRI                                           | see Style section                                                                                          | effectively required for VECTOR (throws if missing)                          |
| `canEdit`                       | bool                                | VECTOR, VECTORTILE                                                 | gates "select layer to edit" dropdown                                                                      | `true`                                                                       |
| `includeInSearch`               | bool                                | VECTOR/VECTORTILE                                                  | popup "corporate network search" link                                                                      | `true`                                                                       |
| `searchLabel`                   | string                              | VECTOR/VECTORTILE                                                  | label for that link                                                                                        | region's `searchLabel`                                                       |
| `searchableColumns`             | array of column names               | VECTOR (any type with `url` works code-wise)                       | global search box eligibility + CQL filter columns; **list the title column first** (used for sort + rank) | none ⇒ excluded from global search                                           |
| `showZoomToFeature`             | bool                                | VECTOR/VECTORTILE                                                  | popup "view whole feature" link                                                                            | `true`                                                                       |
| `sourceLanguage`                | lang code                           | VECTOR                                                             | admin translate-all-features hint                                                                          | `app.defaultLanguage`                                                        |
| `presetLayer`                   | bool                                | VECTOR/VECTORTILE                                                  | marks layer selectable in Analysis control (NOT a pointer to another layer)                                | —                                                                            |
| `presetLayerName`               | string                              | VECTOR/VECTORTILE, pairs with `presetLayer`                        | identifier sent to external R Shiny analysis backend as `preset=<name>:<value>`                            | none ⇒ sends feature geometry instead                                        |
| `renderMode`                    | string                              | VECTORTILE                                                         | passed to `ol/layer/VectorTile`                                                                            | `'hybrid'`                                                                   |
| `declutter`                     | bool                                | VECTORTILE (generic path; OLMS hardcodes `true`, not configurable) | OL declutter                                                                                               | `false`                                                                      |

## GROUP-specific properties

| key                       | type                          | effect                                                                                                                                                                                                                                         | default |
| ------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `layers`                  | array of layer config objects | nested children (⚠ 3rd distinct meaning of "layers" — also a WMS `LAYERS` string, also `groups.*.layers` name-array)                                                                                                                           | —       |
| `displaySeries`           | bool                          | makes it a time-series slider group; only `defaultSeriesLayerIndex` child visible at creation                                                                                                                                                  | `false` |
| `defaultSeriesLayerIndex` | number                        | which child starts visible                                                                                                                                                                                                                     | `0`     |
| `largeSlider`             | bool                          | shows big bottom `TimeSlider` bar instead of small in-legend one (desktop only — mobile always shows inline). **A `displaySeries` group without this never gets the big slider.**                                                              | `false` |
| `playInterval`            | ms                            | autoplay step interval                                                                                                                                                                                                                         | `2000`  |
| `isPlayDisabled`          | bool                          | hides play/pause button                                                                                                                                                                                                                        | `false` |
| `playButton`              | bool (`!== false`)            | shows play button slot — overlaps `isPlayDisabled`, checked independently                                                                                                                                                                      | `true`  |
| `year`                    | string                        | **dead** — nothing reads it                                                                                                                                                                                                                    | —       |
| `attributions`            | —                             | **N/A for GROUP** — OL `LayerGroup` has no source, so there's no OL mechanism to attach attribution text to a group at all (not a missed line of code — a structural limitation). Put `attributions` on each child layer's own config instead. | —       |

## Dead / inert properties (set in code, nothing reads them, or vice versa)

| key                             | note                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                         | copied to OL layer, never read; not the same as region `title` (that one is real)                                                                                      |
| `seriesDisplayName`             | dead — actual mechanism uses `legendDisplayName`                                                                                                                       |
| `hoverAttribute` (layer config) | dead as a layer property — real mechanism reads a **feature** attribute literally named `hoverAttribute` (falls back to `kd_naziv`/`kd_title`/`entity`/`venue`/`name`) |
| `directions`                    | dead                                                                                                                                                                   |
| `extent`                        | not read back, but is genuine native OL clipping behavior if ever set — currently unused everywhere                                                                    |
| `formatConfig` on VECTORTILE    | still silently ignored — VECTORTILE's format is constructed with no args, unlike VECTOR                                                                                |

`label` (top-level) has been removed from the codebase and from every layer in app-conf.json — it was dead (don't
confuse with the still-functional `style.label`).

## Defaults cheat sheet

- Default **on** (`!== false`): `visible`, `queryable`, `isInteractive`, `canEdit`, `includeInSearch`,
  `showZoomToFeature`, `playButton`.
- Default **off**: `hoverable`, `displayInLegend`, `displaySidebarInfo`, `displaySeries`, `isPlayDisabled`,
  `largeSlider`, `declutter`.
- Computed, not constant: `zIndex`, `legendDisplayName`, `renderMode`, `playInterval`, `defaultSeriesLayerIndex`.

---

## `style` object

Two render engines, picked in `renderStyle` (`OlLayer.js:94-135`):

- **`baseStyle`** (dynamic, cached) — used whenever `stylePropFnRef` or `label` is set. Supports functions, labels,
  clustering, icon-on-polygon.
- **`OlStyleFactory`** (static, uncached) — used otherwise. Only literal
  `radius`/`fillColor`/`strokeColor`/`strokeWidth`/`iconUrl`/`scale`/`opacity`/`iconAnchor*`/`text`. No dynamic/colormap
  support.

`style.featureStyles`: array of style objects instead of one — all composited per feature. `style.styleRef`:
`'baseStyle'` (implicit default) \| `'htmlLayerStyle'` \| `'popupInfoStyle'` (special-purpose, ignore most other props).

### `style.type` (Point/MultiPoint only — ignored for Line/Polygon, which branch on actual geometry)

| value         | renders                 | sub-props                                                                                        |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `"circle"`    | `ol/style/Circle`       | `radius`, `fillColor`, `strokeColor`, `strokeWidth`                                              |
| other/omitted | `ol/style/RegularShape` | + `points` (default 4), `angle` (default 0 rad), `radius2` (no default ⇒ plain polygon), `scale` |

Line → `Stroke` only. Polygon/MultiPolygon/GeometryCollection → `Fill` + optional `Stroke`.

### Direct `style.*` properties

| key                          | applies to                                                                   | format                                                                                                                     | default                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `strokeColor`                | all                                                                          | CSS color or function (via `stylePropFnRef.strokeColor`); invalid values silently fall back to `#00C8FF` via `safeColor()` | `rgba(255,255,255,1)` (Point/Line); Polygon stroke only drawn if this is set                 |
| `strokeWidth`                | all                                                                          | number/function                                                                                                            | `1` Point, `4` Line, `0` Polygon                                                             |
| `lineDash`                   | Line, Polygon                                                                | array e.g. `[4,4]`                                                                                                         | solid (literal only, no fn support)                                                          |
| `fillColor`                  | Point/Polygon                                                                | CSS color/function, via `safeColor()`                                                                                      | `rgba(129,56,17,0.7)` Point; `rgba(255,255,255,1)` Polygon                                   |
| `radius`                     | Point                                                                        | number/function                                                                                                            | `5`                                                                                          |
| `radius2`, `points`, `angle` | Point (RegularShape)                                                         | number/function                                                                                                            | see table above                                                                              |
| `scale`                      | Point icon/shape                                                             | number/function                                                                                                            | `1` icon                                                                                     |
| `opacity`                    | Point icon only                                                              | 0–1                                                                                                                        | `1` — not for polygon/line/circle alpha, use rgba                                            |
| `iconUrl`                    | Point, and Polygon (icon-overlay at centroid, layered on top of fill/stroke) | URL/function                                                                                                               | presence switches Point to `Icon` style                                                      |
| `iconScale`                  | Point icon                                                                   | number/function                                                                                                            | `getIconScaleValue` fallback                                                                 |
| `iconColor`                  | Point/Polygon icon                                                           | CSS color/function; requires `stylePropFnRef.iconColor` **and** `iconUrl` both set                                         | none (unrecolored); async SVG recolor, plain icon shows first                                |
| `iconAnchor`                 | Point/Polygon icon                                                           | `[x,y]`                                                                                                                    | OL `[0.5,0.5]`                                                                               |
| `iconAnchorXUnits`/`YUnits`  | Point/Polygon icon                                                           | `'fraction'`\|`'pixels'`                                                                                                   | `'fraction'`                                                                                 |
| `label`                      | any (needs matching feature attr)                                            | object, see below                                                                                                          | none — forces `styleRef='baseStyle'`                                                         |
| `stylePropFnRef`             | —                                                                            | object, see below                                                                                                          | `{}`                                                                                         |
| `cluster`                    | Point, VECTOR only                                                           | `{options:{distance,minDistance}, style:{innerCircle,outerCircle}}`                                                        | see below                                                                                    |
| `hoverTextColor`             | any                                                                          | CSS color, or a feature attribute name (resolved dynamically)                                                              | tooltip default. **Not part of OL style pipeline** — read directly for the hover DOM overlay |
| `hoverBackgroundColor`       | any                                                                          | same                                                                                                                       | tooltip default                                                                              |

`style.label` sub-object (only rendered if `feature.get(label.text)` truthy):

| key                                        | meaning                                                                      | default               |
| ------------------------------------------ | ---------------------------------------------------------------------------- | --------------------- |
| `text`                                     | feature attr holding label string                                            | required              |
| `fontWeight`/`fontSize`/`fontType`         | CSS                                                                          | `normal`/`12`/`Arial` |
| `textAlign`                                | OL text align                                                                | —                     |
| `placement`                                | `'point'` forces point; else line-follow on Lines; Point always forced point | auto                  |
| `maxResolution`                            | resolution above which label is hidden                                       | `1200`                |
| `offsetX`/`offsetY`                        | px                                                                           | `12`/`0`              |
| `fill.color`/`stroke.color`/`stroke.width` | text fill/halo                                                               | `black`/`white`/`3`   |

⚠ `fill`/`stroke` must be present as objects even for defaults — `label: {text:'x'}` alone throws.

`style.cluster`: `options.distance` (default 20), `options.minDistance` (default 0) wrap source in `ol/source/Cluster`.
`style.innerCircle.{radius=14, fillColor='rgba(255,165,0,.7)', text.fillColor='#fff', text.strokeColor='rgba(0,0,0,.6)', text.strokeWidth=3}`,
`outerCircle.{radius=20, fillColor='rgba(255,153,102,.3)'}`.

### `stylePropFnRef.*`

Maps style-prop-name → feature-attribute-name. Any key is accepted, but only keys with a matching function in
`layersStylePropFn[layerName]` (fallback `.default`) do anything — unmatched keys are silent no-ops. **Lookup key is
app-conf `name`, not any GeoServer table name.**

| key                                   | wired?                                                                           | notes                                                |
| ------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `radius`                              | yes, `default` + per-layer overrides                                             | see `getRadiusValue` below                           |
| `fillColor`                           | yes, pass-through (`v=>v`) unless `fillColorFn:"colorMapStyle"` overrides it     |                                                      |
| `strokeColor`                         | only on layers with their own entry (`polygons`,`experimental`,`points`,`lines`) | no-op elsewhere                                      |
| `strokeWidth`                         | only `lines`, `Rosario`                                                          | no-op elsewhere                                      |
| `iconScale`                           | yes, `default` only                                                              | see below                                            |
| `iconUrl`                             | yes, `default`, pass-through                                                     |                                                      |
| `iconColor`                           | yes, `default`, pass-through — must pair with `iconUrl` in same `stylePropFnRef` |                                                      |
| `radius2`, `points`, `angle`, `scale` | **no function defined anywhere**                                                 | dead unless a new `layersStylePropFn` entry is added |
| `fillColorFn`                         | literal flag, not an attribute name — special-cased directly                     | only known value: `"colorMapStyle"`                  |
| `fillColorMap`                        | literal gradient name, consumed in `map.js`                                      | only meaningful with `fillColorFn:"colorMapStyle"`   |
| `fillColorMapNshades`                 | literal number, consumed in `map.js`                                             | see below                                            |

**`fillColorFn: "colorMapStyle"`**: overwrites `fillColor` with a lookup into
`store.state.colorMapEntities[layerName][attrValue]` (populated via a WFS request against GeoServer's
`workspace1:colormap` SQL view). Falls back to `#00c8f0` if not loaded; renders nothing (`[]`) until
`colorMapEntities[layerName]` exists at all. Any other/no value ⇒ ignored, `fillColor` used as plain pass-through.

**`fillColorMap`** values (from `colormap` npm pkg; app-conf currently uses `cool`/`hsv`/`jet`/`portland`): `jet`,
`hsv`, `hot`, `spring`, `summer`, `autumn`, `winter`, `bone`, `copper`, `greys`, `yignbu`, `greens`, `yiorrd`,
`bluered`, `rdbu`, `picnic`, `rainbow`, `portland`, `blackbody`, `earth`, `electric`, `alpha`, `viridis`, `inferno`,
`magma`, `plasma`, `warm`, `cool`, `rainbow-soft`, `bathymetry`, `cdom`, `chlorophyll`, `density`, `freesurface-blue`,
`freesurface-red`, `oxygen`, `par`, `phase`, `salinity`, `temperature`, `turbidity`, `velocity-blue`, `velocity-green`,
`cubehelix`.

**`fillColorMapNshades`**: integer, number of discrete color buckets. Default = one per distinct value (smooth gradient,
no banding). Buckets are equal-_count_ (ordinal position in GeoServer's response), not equal-interval — depends on the
SQL view's `ORDER BY`.

**`getRadiusValue(value, multiplier, min, max, defaultMultiplier)`**: radius ∝ `sqrt(value) * multiplier`
(area-proportional), clamped `[min||5, max||30]`. ⚠ `defaultMultiplier` only kicks in when the computed value is falsy
(0/NaN), not as a general fallback for a missing `multiplier` — the bare `layersStylePropFn.default.radius` (called with
1 arg) produces `undefined` radius in practice; every layer that wants working radii defines its own override with
explicit args.

**`getIconScaleValue(value, multiplier, min, max)`**: `value / (multiplier || 603000)`, clamped `[min||0.2, max||1]`.
Only a `default` entry exists — all icon-scaled layers share one multiplier/bounds.

---

## Known bugs surfaced this session

- **GeoServer `colormap` SQL view**: the `field` viewparam is not reliably honored per-request — appears to always fall
  back to the parameter's configured default regardless of what's sent (matches a reported, unresolved GeoServer issue:
  [OSGeo Discourse — multiple viewparams](https://discourse.osgeo.org/t/geoserver-users-multiple-viewparams-not-working-viewparams-p1-5-p2-6-p3-7/49099)).
  Current workaround: every colormapped table's real data column must be physically named to match whatever the SQL
  view's `field` default is set to. Not fixed (GeoServer-side, not this repo).
- `formatConfig` is still silently ignored on VECTORTILE layers (see Dead/inert table). Not fixed.

### Fixed

- `canEdit` now reaches VECTORTILE layers (was never copied onto the layer instance).
- Dead top-level `label` removed from the factory and every layer in app-conf.json.
- `getRadiusValue`'s bare default (`layersStylePropFn.default.radius`) was silently producing `undefined` radius due to
  an operator-precedence bug — now correctly falls back to `defaultLimits.radius.defaultMultiplier` (0.3), matching how
  `getIconScaleValue` already worked.
- Unrecognized/missing layer `type` or `format` now logs a `console.warn` and returns `null` instead of failing silently
  (type) or throwing a cryptic `"undefined is not a constructor"` (format).
- `Map.vue`'s `createLayers()` now skips a `null` layer instead of crashing on `.setZIndex` — previously, one
  misconfigured layer would throw and silently abort creation of every layer listed _after_ it in `map.layers[]` for
  that map load.
