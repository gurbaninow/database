/**
 * Objection Model for Languages.
 * @ignore
 */

const BaseModel = require( './BaseModel' )
const { Model } = require( 'objection' )

class Languages extends BaseModel {
  static get tableName() {
    return 'languages'
  }

  static get relationMappings() {
    return {
      translationSources: {
        relation: Model.HasManyRelation,
        join: {
          from: 'languages.id',
          to: 'translation_sources.language_id',
        },
        // eslint-disable-next-line
        modelClass: require( './TranslationSources' ),
      },
    }
  }
}

module.exports = Languages
