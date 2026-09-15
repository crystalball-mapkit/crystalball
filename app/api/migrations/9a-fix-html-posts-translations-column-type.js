"use strict";
// html_posts.titleTranslations/htmlTranslations were originally created as
// json (see 8-create-html-posts.js). Postgres' json type has no upper()/LIKE
// operator, so GeoServer's CQL ILIKE translation fails outright whenever
// either column is listed in html_posts' searchableColumns - and because
// Search.vue combines all searchableColumns into one CQL_FILTER, that single
// invalid clause breaks the whole html_posts search request, in every
// language, not just the affected columns. text stores the identical JSON
// string either way (GeoServer serializes a json column as a string in WFS
// output, same as text), so this doesn't change what any client ever reads.
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(`
      ALTER TABLE html_posts ALTER COLUMN "titleTranslations" TYPE text USING "titleTranslations"::text;
      ALTER TABLE html_posts ALTER COLUMN "htmlTranslations" TYPE text USING "htmlTranslations"::text;
    `);
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.query(`
      ALTER TABLE html_posts ALTER COLUMN "titleTranslations" TYPE json USING "titleTranslations"::json;
      ALTER TABLE html_posts ALTER COLUMN "htmlTranslations" TYPE json USING "htmlTranslations"::json;
    `);
  },
};
