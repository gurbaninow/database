/* eslint-disable prefer-arrow-callback,import/no-extraneous-dependencies,global-require */
// global describe, it

// const { expect } = require( 'chai' )

// const { Shabads } = require( '../index' )
// const sources = require( '../data/sources' )

describe( 'Shabads', () => {
  describe( 'First Shabad', () => {
    it( 'should have a source of SGGS from sources.json', async () => {
      // const [ sggs ] = sources

      // const { source } = await Shabads.query().first().eager( 'source' )

      // expect( source ).to.equal( sggs )
    } )

    it( 'should have the same first line as seeds/1/0001/001.json', async () => {
      // const [ firstLine ] = require( '../data/sources/1/0001/001.json' )

      // const { lines } = await Shabads.query().first().eager( 'lines' )

      // expect( lines[ 0 ].gurmukhi ).to.equal( firstLine.gurmukhi )
    } )
  } )
} )

// TODO: Write tests for confirming data in seeds/
// TODO: Finish writing model tests
// TODO: Write tests for checking source_id between shabad & the section it belongs to are the same
