/**
 * Objection Model for Line Types.
 * @ignore
 */

const BaseModel = require( './BaseModel' )

class BaniFolders extends BaseModel {
  static get tableName() {
    return 'bani_folders'
  }
}

module.exports = BaniFolders
