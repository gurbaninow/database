/**
 * Generates a DB from the JSON compositions in `data/`.
 */
/* eslint-disable global-require,import/no-dynamic-require */

require( './string-colors' )
const createSchema = require( './schema' )
const memoize = require( 'memoizee' )
const omit = require( 'lodash/omit' )
const { unload } = require( 'freshy' )

const {
  BaniFolders,
  Compositions,
  Languages,
  LineTypes,
  Sections,
  Sources,
  Subsections,
  TranslationSources,
  Writers,
  knex,
} = require( '..' )

const { existsSync, readdirSync } = require( 'fs' )

const { findIndex, larivaar } = require( './utils' )

const {
  firstLetters,
  stripAccents,
  stripEndings,
  stripVishraams,
  toAscii,
  toEnglish,
  toHindi,
  toShahmukhi,
  toUnicode,
} = require( 'gurmukhi-utils' )

const JSON_PATH = '../data'

/**
 * Maps a list of JSON objects to only return the english name.
 * @param {Object} json The json object to map.
 */
const toEnglishName = json => json.map( ( { name_english: nameEnglish } ) => nameEnglish )

// eslint-disable-next-line require-sort/require-sort
const translationSourcesJSON = require( `${JSON_PATH}/translation_sources` )

// Generate a list of the names, so the index of values can be retrieved
const baniFolderNames = toEnglishName( require( `${JSON_PATH}/bani_folders` ) )
const compositionNames = toEnglishName( require( `${JSON_PATH}/compositions` ) )
const languageNames = toEnglishName( require( `${JSON_PATH}/languages` ) )
const writerNames = toEnglishName( require( `${JSON_PATH}/writers` ) )
const lineTypeNames = toEnglishName( require( `${JSON_PATH}/line_types` ) )
const sourceNames = toEnglishName( require( `${JSON_PATH}/sources` ) )

const TranslationSourceNames = toEnglishName( translationSourcesJSON )

/**
 * Checks if the line is a Sirlekh.
 * @param {Object} The input line.
 */
const isSirlekh = ( { type_id: typeId } ) => lineTypeNames[ typeId - 1 ] === 'Sirlekh'

/**
 * Returns the transliterations of a given Gurmukhi line.
 * @param gurmukhi The Gurmukhi line to produce transliterations for.
 * @returns An array of [ language_id, transliteration_function ]
 */
const transliterateAll = gurmukhi => [
  [ 'English', toEnglish ],
  [ 'Hindi', toHindi ],
  [ 'Urdu', toShahmukhi ],
].map( ( [ name, fn ] ) => [
  languageNames.findIndex( languageName => languageName === name ) + 1,
  fn( toUnicode( gurmukhi ) ),
] )

/**
 * Finds the index of the translation source provided.
 * @param {String} compositionT The composition of the translation source.
 * @param {String} languageT The language of the translation source.
 * @param {String} translationSourceT The translation source name.
 */
const findTranslationSourceIndex = memoize( ( compositionT, languageT, translationSourceT ) => {
  // Find position of correct translation source
  const index = translationSourcesJSON
    .findIndex( ( { composition, language, name_english: translationSource } ) => (
      composition === compositionT
      && language === languageT
      && translationSource === translationSourceT
    ) )

  // If not found, figure out which properties are incorrect
  if ( index === -1 ) {
    findIndex( compositionT, compositionNames )
    findIndex( languageT, languageNames )
    findIndex( translationSourceT, TranslationSourceNames )
  }

  return index
}, { primative: true } )

/**
 * Creates the database tables using the schema.
 */
const initialiseDatabase = async type => {
  console.log( 'Creating tables\n'.subheader )
  await createSchema( knex, type )
  console.log( 'Created tables successfully'.success )
}

/**
 * Imports any simple tables into the database.
 * @param {Object} trx The transaction to use when executing any queries.
 */
const importSimpleTables = async trx => (
  Promise.all( [
    [ 'writers', Writers ],
    [ 'line_types', LineTypes ],
    [ 'languages', Languages ],
    [ 'sources', Sources ],
    [ 'bani_folders', BaniFolders ],
  ]
    .map( async ( [ name, model ] ) => {
      console.log( `Importing table ${name}`.subheader )

      const path = `${JSON_PATH}/${name}`
      const data = require( path )

      await Promise.all( data.map( ( element, index ) => (
        model
          .query( trx )
          .insert( { ...element, id: index + 1 } )
      ) ) )

      // Unload JSON from memory
      unload( path )

      console.log( `Successfully imported table ${name}`.success )
    } ) )
)

/**
 * Imports compositions, their sections, and their subsections.
 * @param {Object} trx The transaction to use when executing any queries.
 */
const importCompositions = async trx => {
  console.log( '\nImporting tables compositions, sections, subsections'.subheader )

  // Need id context across compositions and sections
  let sectionId = 1
  let subsectionId = 1

  const path = `${JSON_PATH}/compositions`

  // Load data and add correct id in order
  const data = require( path )
    .map( ( composition, index ) => ( {
      ...composition,
      id: index + 1,
      sections: composition.sections.map( section => ( {
        ...section,
        id: sectionId++, // eslint-disable-line
        subsections: section.subsections.map( subsection => ( {
          ...subsection,
          id: subsectionId++, // eslint-disable-line
        } ) ),
      } ) ),
    } ) )

  await Compositions.query( trx ).insertGraph( data )

  unload( path )

  console.log( 'Successfully imported tables compositions, sections, subsections'.success )
}

/**
 * Imports translation sources.
 * @param {Object} trx The transaction to use when executing any queries.
 */
const importTranslationSources = async trx => {
  console.log( '\nImporting table translation_sources'.subheader )

  const path = `${JSON_PATH}/translation_sources.json`

  await Promise.all( (
    require( path )
    // Get composition and language ids from string
      .map( ( { composition, language, ...rest }, index ) => {
        console.log( `Processing ${rest.name_english}` )

        return {
          ...rest,
          id: index + 1,
          languageId: findIndex( language, languageNames ) + 1,
          compositionId: findIndex( composition, compositionNames ) + 1,
        }
      } )
    // Insert the data
      .map( data => TranslationSources.query( trx ).insert( data ) )
  ) )

  unload( path )

  console.log( 'Sucessfully imported table translation_sources'.success )
}

/**
 * Imports lines, shabads, and translations.
 * @param {Object} trx The transaction to use when executing any queries.
 */
const importLines = async ( trx, sourcesFallback ) => {
  console.log( '\nImporting tables lines, shabads, translations'.subheader )

  // Using camelCase since reading from database, not JSON
  const toEnglishName = data => data.map( ( { nameEnglish } ) => nameEnglish )
  // Get section and subsection names (assuming they've been inserted)
  const sectionNames = toEnglishName( await Sections.query( trx ) )
  const subsectionNames = toEnglishName( await Subsections.query( trx ) )

  // Need id context across shabads
  let lineOrderId = 1
  let shabadOrderId = 1

  // Sets storing all the ids
  const shabadIds = new Set()
  const lineIds = new Set()

  // Functions to log duplicate ids
  const checkShabadId = id => ( shabadIds.has( id ) ? console.warn( `Shabad ID ${id} already exists`.warning ) : shabadIds.add( id ) ) && false
  const checkLineId = id => ( lineIds.has( id ) ? console.warn( `Line ID ${id} already exists`.warning ) : lineIds.add( id ) ) && false

  const compositionData = await Promise.all( (
    compositionNames.map( async ( compositionName, compositionIndex ) => {
      console.log( `Processing composition ${compositionName}` )

      const compositionDir = `./data/${compositionName}`

      if ( !existsSync( compositionDir ) ) { return [] }

      const preferredSources = sourcesFallback ? sourcesFallback[ compositionName ] : null
      if ( sourcesFallback && preferredSources == null ) {
        throw new ReferenceError( `No preferred source found for ${compositionName}` )
      }

      // Load and concatenate all the shabad files for the composition
      const paths = readdirSync( compositionDir ).map( path => `${JSON_PATH}/${compositionName}/${path}` )

      const shabads = paths.reduce( ( acc, path ) => [
        ...acc,
        ...require( path ),
      ], [] )

      // Infer from position in array
      const compositionId = compositionIndex + 1

      // Returns an array of [shabads, [line, translations]]
      const data = shabads.map( ( {
        id: shabadId,
        writer,
        section,
        subsection,
        lines,
        ...rest
      } ) => ( [
        // Shabad is first element
        {
          ...rest,
          id: checkShabadId( shabadId ) || shabadId,
          order_id: shabadOrderId++, // eslint-disable-line
          composition_id: compositionId,
          writer_id: findIndex( writer, writerNames ) + 1,
          section_id: findIndex( section, sectionNames ) + 1,
          subsection_id: subsection && findIndex( subsection, subsectionNames ) + 1, // Nullable
        },
        // [Lines, Translations] is the second element
        lines.map( ( { type, translations, vishraams, id: lineId, ...rest } ) => ( [
          // First element is lines
          {
            ...rest,
            id: checkLineId( lineId ) || lineId,
            shabad_id: shabadId,
            order_id: lineOrderId++, // eslint-disable-line
            vishraams: JSON.stringify( vishraams ),
            type_id: type && ( findIndex( type, lineTypeNames ) + 1 ), // Nullable
          },
          // Second element is translations
          Object.entries( translations ).reduce( ( acc, [ languageName, translations ] ) => [
            ...acc,
            // Flatten translations into one big list
            ...Object.entries( translations ).reduce( ( acc, [
              translationSourceName,
              { translation, additional_information: additionalInformation },
            ] ) => [
              ...acc,
              {
                line_id: lineId,
                translation_source_id: findTranslationSourceIndex(
                  compositionName,
                  languageName,
                  translationSourceName,
                ) + 1,
                translation,
                additional_information: JSON.stringify( additionalInformation ),
              },
            ], [] ),
          ], [] ),
        ] ) ),
      ] ) )

      // Unload the json files
      paths.forEach( path => unload( path ) )

      // Pull out shabads from structure
      const shabadData = data.map( ( [ shabad ] ) => shabad )

      // Mutations/non-reduce to massively increase speed
      const translationData = []
      const lineData = []
      const lineContentData = []
      const transliterationData = []

      // Pull out the line, translations, and generate transliterations from the structure
      data.forEach( ( [ , lines ] ) => (
        lines.forEach( ( [ line, translations ] ) => {
          const { gurmukhi, id } = line

          // Push lines and translations
          lineData.push( omit( line, 'gurmukhi' ) )
          translationData.push( ...translations )

          // Only insert preferred sources if defined
          let gurmukhiObj = gurmukhi
          if ( preferredSources ) {
            gurmukhiObj = preferredSources
              .reduce( ( gurmukhiLine, source ) => {
                if ( gurmukhiLine ) {
                  return gurmukhiLine
                }
                if ( source in gurmukhi ) {
                  return { [ source ]: gurmukhi[ source ] }
                }
                return null
              }, null )
          }

          // Add each sources's gurmukhi + transliterations
          Object.entries( gurmukhiObj ).forEach( ( [ sourceName, gurmukhi ] ) => {
            const sourceId = sourceNames.findIndex( nameEnglish => sourceName === nameEnglish ) + 1
            const getFirstLetters = text => ( {
              first_letters: [
                toUnicode,
                ...( isSirlekh( line ) ? [] : [ stripEndings ] ),
                stripAccents,
                stripVishraams,
                firstLetters,
                toAscii,
              ].reduce( ( text, fn ) => fn( text ), text ),
              vishraam_first_letters: [
                toUnicode,
                ...( isSirlekh( line ) ? [] : [ stripEndings ] ),
                stripAccents,
                // Retain heavy vishraams only
                text => stripVishraams( text, { light: true, medium: true } ),
                firstLetters,
                toAscii,
              ].reduce( ( text, fn ) => fn( text ), text ),
            } )

            lineContentData.push( {
              line_id: line.id,
              source_id: sourceId,
              gurmukhi,
              larivaar: larivaar( gurmukhi ),
              ...getFirstLetters( gurmukhi ),
            } )

            transliterateAll( gurmukhi ).forEach( ( [ languageId, transliteration ] ) => (
              transliterationData.push( {
                line_id: id,
                language_id: languageId,
                source_id: sourceId,
                transliteration,
                ...getFirstLetters( transliteration ),
              } ) ) )
          } )
        } )
      ) )

      // Insert data into all 3 tables
      return Promise.all( [
        trx.batchInsert( 'shabads', shabadData, 140 ),
        trx.batchInsert( 'lines', lineData, 80 ),
        trx.batchInsert( 'line_content', lineContentData, 80 ),
        trx.batchInsert( 'translations', translationData, 115 ),
        trx.batchInsert( 'transliterations', transliterationData, 115 ),
      ] )
    } )
  ) )

  console.log( 'Successfully imported tables lines, shabads'.success )
  return compositionData.reduce( ( acc, data, index ) => ( {
    ...acc,
    [ compositionNames[ index ] ]: data,
  } ), {} )
}

/**
 * Imports tables banis and bani_lines.
 * @param {Object} trx The transaction to use when executing any queries.
 */
const importBanis = async trx => {
  console.log( '\nImporting tables banis, bani_lines'.subheader )

  await Promise.all( require( `${JSON_PATH}/banis` )
    .map( async ( { folder, lines, bookmarks, id, ...rest }, baniIndex ) => {
      console.log( `Processing bani ${rest.name_english}` )
      // Insert the bani
      await trx.insert( {
        ...rest,
        id,
        folder_id: folder && findIndex( folder, baniFolderNames ) + 1, // Nullable
        order_id: baniIndex + 1,
      } ).into( 'banis' )

      // And figure out the lines it contains
      await Promise.all( lines.map( async ( { start_line: start, end_line: end }, groupIndex ) => {
        // Calculate lines that need to be inserted for bani from ranges
        const baniLines = await trx
          .with( 'order_ids', qb => (
            qb
              .select( [ 'l1.order_id as start_order_id', 'l2.order_id as end_order_id' ] )
              .from( { l1: 'lines', l2: 'lines' } )
              .where( 'l1.id', start )
              .andWhere( 'l2.id', end )
          ) )
          .select( 'id as line_id' )
          .from( { lines: 'lines', order_ids: 'order_ids' } )
          .whereRaw( 'lines.order_id between start_order_id and end_order_id' )

        // Insert lines for banis into bani_lines
        await Promise.all( (
          baniLines.map( line => trx.insert( {
            ...line,
            bani_id: id,
            line_group: groupIndex + 1,
          } ).into( 'bani_lines' ) )
        ) )
      } ) )

      // Insert Bookmarks
      await trx.insert( {
        line_id: lines[ 0 ].start_line,
        name_gurmukhi: 'ArMB',
        name_english: 'Start',
        bani_id: id,
        order_id: 1,
      } ).into( 'bani_bookmarks' )

      await Promise.all( (
        bookmarks.map( ( bookmark, bookmarkIndex ) => trx.insert( {
          ...bookmark,
          bani_id: id,
          order_id: bookmarkIndex + 2,
        } ).into( 'bani_bookmarks' ) )
      ) )

      await trx.insert( {
        line_id: lines[ lines.length - 1 ].end_line,
        name_gurmukhi: 'smwpqI',
        name_english: 'End',
        bani_id: id,
        order_id: bookmarks.length + 2,
      } ).into( 'bani_bookmarks' )
    } ) )

  console.log( 'Successfully imported tables banis, bani_lines'.success )
}

const setGitRevision = async knex => {
  console.log( '\nSetting git revision'.subheader )

  const commitSHA = require( 'child_process' )
    .execSync( 'git rev-parse HEAD', { cwd: 'data' } )
    .toString()
    .trim()

  console.log( commitSHA )

  await knex.insert( {
    HEAD: commitSHA,
  } ).into( 'revision' )

  console.log( 'Successfully set git revision'.success )
}

const main = async ( {
  type = '?',
  sourcesFallback = null,
  beforeInitialise = () => {},
  onInitialise = () => {},
  afterBuild = () => {},
} ) => {
  console.log( `Generating ${type} database`.header )

  await beforeInitialise()

  // Create tables from schema in a transaction
  await initialiseDatabase( type )
  await onInitialise( knex )
  await importSimpleTables( knex )
  await importCompositions( knex )
  await importTranslationSources( knex )
  await importLines( knex, sourcesFallback )
  await importBanis( knex )
  await setGitRevision( knex )

  await afterBuild( knex )

  console.log( `\nSuccessfully ${type} generated database`.success.bold )
}

module.exports = params => main( params )
  .then( () => process.exit( 0 ) )
  .catch( async e => {
    console.error( e.message.error )
    console.error( e )
    console.error( '\nFailed to generate database'.error.bold )
    process.exit( 1 )
  } )
