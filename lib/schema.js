/**
 * Sets up MySQL/MariaDB specific requirements.
 * @param {*} table The table to apply the requirements to.
 */
const setupMySQL = table => {
  table.engine( 'Aria' )
  table.charset( 'utf8mb4' )
  table.collate( 'utf8mb4_bin' )
}

/**
 * The schema as per `schema.png`, defined by Knex statements.
 */
const createSchema = ( knex, type ) => knex.schema
  .createTable( 'compositions', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.integer( 'length' ).notNullable()
    table.string( 'page_name_english' ).notNullable()
    table.string( 'page_name_gurmukhi' ).notNullable()
  } )
  .createTable( 'sections', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.text( 'description' ).notNullable()
    table.integer( 'start_page' ).notNullable()
    table.integer( 'end_page' ).notNullable()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
  } )
  .createTable( 'subsections', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.integer( 'section_id' ).references( 'id' ).inTable( 'sections' ).notNullable()
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'start_page' )
    table.integer( 'end_page' )
  } )
  .createTable( 'writers', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'shabads', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'id', '3' ).primary()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
    table.integer( 'writer_id' ).references( 'id' ).inTable( 'writers' ).notNullable()
    table.integer( 'section_id' ).references( 'id' ).inTable( 'sections' ).notNullable()
    table.integer( 'subsection_id' ).references( 'id' ).inTable( 'subsections' )
    table.integer( 'sttm_id' )
    table.integer( 'order_id' ).notNullable().unique()
  } )
  .createTable( 'line_types', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'lines', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'id', 4 ).primary()
    table
      .string( 'shabad_id', 3 )
      .references( 'id' )
      .inTable( 'shabads' )
      .notNullable()
      .index()
    table.integer( 'source_page' ).notNullable()
    table.integer( 'source_line' )
    table.json( 'vishraams' ).notNullable()
    table.text( 'pronunciation' )
    table.text( 'pronunciation_information' )
    table.boolean( 'visible' ).notNullable().defaultTo( 1 )
    table.integer( 'type_id' ).references( 'id' ).inTable( 'line_types' )
    table.integer( 'order_id' ).notNullable().unique()
  } )
  .createTable( 'sources', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'line_content', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.integer( 'source_id' ).references( 'id' ).inTable( 'sources' ).notNullable()
    table.text( 'gurmukhi' ).notNullable()
    table.text( 'larivaar' ).notNullable()
    table.text( 'first_letters' )
    table.text( 'vishraam_first_letters' )
    table.primary( [ 'line_id', 'source_id' ] )
  } )
  .createTable( 'languages', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.string( 'name_international' ).unique()
  } )
  .createTable( 'translation_sources', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
    table.integer( 'language_id' ).references( 'id' ).inTable( 'languages' ).notNullable()
  } )
  .createTable( 'translations', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table
      .integer( 'translation_source_id' )
      .references( 'id' )
      .inTable( 'translation_sources' )
      .notNullable()
    table.text( 'translation' ).notNullable()
    table.json( 'additional_information' )
    table.primary( [ 'line_id', 'translation_source_id' ] )
  } )
  .createTable( 'transliterations', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.integer( 'source_id' ).references( 'id' ).inTable( 'sources' ).notNullable()
    table
      .integer( 'language_id' )
      .references( 'id' )
      .inTable( 'languages' )
      .notNullable()
    table.text( 'transliteration' ).notNullable()
    table.text( 'first_letters' )
    table.text( 'vishraam_first_letters' )
    table.primary( [ 'line_id', 'source_id', 'language_id' ] )
  } )
  .createTable( 'banis', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'id', 2 ).primary()
    table.integer( 'folder_id' ).references( 'id' ).inTable( 'bani_folders' )
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'order_id' ).notNullable().unique()
  } )
  .createTable( 'bani_lines', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.string( 'bani_id', 2 ).references( 'id' ).inTable( 'banis' ).notNullable()
    table.integer( 'line_group' ).notNullable()
    table.primary( [ 'line_id', 'bani_id', 'line_group' ] )
  } )
  .createTable( 'bani_bookmarks', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.string( 'bani_id', 2 ).references( 'id' ).inTable( 'banis' ).notNullable()
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'order_id' ).notNullable()
    table.primary( [ 'line_id', 'bani_id', 'order_id' ] )
  } )
  .createTable( 'bani_folders', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'revision', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'HEAD' ).unique()
  } )
  // Add performance indexes
  // Foreign key indexes
  .then( () => Promise.all( [
    knex.schema.alterTable( 'sections', table => {
      table.index( 'composition_id', 'idx_sections_composition_id' )
    } ),
    knex.schema.alterTable( 'subsections', table => {
      table.index( 'section_id', 'idx_subsections_section_id' )
    } ),
    knex.schema.alterTable( 'shabads', table => {
      table.index( 'composition_id', 'idx_shabads_composition_id' )
      table.index( 'writer_id', 'idx_shabads_writer_id' )
      table.index( 'section_id', 'idx_shabads_section_id' )
      table.index( 'subsection_id', 'idx_shabads_subsection_id' )
    } ),
    knex.schema.alterTable( 'lines', table => {
      table.index( 'type_id', 'idx_lines_type_id' )
      table.index( 'source_page', 'idx_lines_source_page' )
      table.index( 'visible', 'idx_lines_visible' )
    } ),
    knex.schema.alterTable( 'translation_sources', table => {
      table.index( 'composition_id', 'idx_translation_sources_composition_id' )
      table.index( 'language_id', 'idx_translation_sources_language_id' )
    } ),
    knex.schema.alterTable( 'line_content', table => {
      table.index( 'first_letters', 'idx_line_content_first_letters' )
      table.index( 'vishraam_first_letters', 'idx_line_content_vishraam_first_letters' )
      table.index( 'gurmukhi', 'idx_line_content_gurmukhi' )
    } ),
    knex.schema.alterTable( 'transliterations', table => {
      table.index( 'first_letters', 'idx_transliterations_first_letters' )
      table.index( 'vishraam_first_letters', 'idx_transliterations_vishraam_first_letters' )
    } ),
    knex.schema.alterTable( 'bani_lines', table => {
      table.index( 'bani_id', 'idx_bani_lines_bani_id' )
      table.index( [ 'bani_id', 'line_group' ], 'idx_bani_lines_line_group' )
    } ),
    knex.schema.alterTable( 'banis', table => {
      table.index( [ 'folder_id', 'order_id' ], 'idx_banis_folder_order' )
    } ),
    knex.schema.alterTable( 'bani_bookmarks', table => {
      table.index( 'bani_id', 'idx_bani_bookmarks_bani_id' )
      table.index( [ 'bani_id', 'order_id' ], 'idx_bani_bookmarks_bani_order' )
    } ),
    knex.schema.alterTable( 'sections', table => {
      table.index( [ 'start_page', 'end_page' ], 'idx_sections_page_range' )
    } ),
  ] ) )

module.exports = createSchema
