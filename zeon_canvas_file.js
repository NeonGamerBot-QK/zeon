const fs = require('fs')
const path = require('path')
module.exports = (f) => {
  describe(`Tests for ${f}`, () => {
    describe('Tests on file properties', () => {
      it('Should be a .js file', () => {
        expect(f.endsWith('.js')).toBeTruthy()
      })
      it('should have ba int as its name', () => {
        expect(!isNaN(f.split('.')[0])).toBeTruthy()
      })
      it('should be less than or equal to 100', () => {
        expect(parseInt(f.split('.')[0])).toBeLessThan(100)
      })
      it('should be greater than or equal to 0', () => {
        expect(parseInt(f.split('.')[0])).toBeGreaterThanOrEqual(0)
      })
    })
    describe('Tests on code', () => {
      let file
      it('should render as valid js code', () => {
        file = require(path.join(__dirname, 'temp_', f))
      })
      it('should export something', () => {
        expect(file).toBeDefined()
      })
      it('should export a function', () => {
        expect(typeof file).toBe('function')
      })
      it('should only take in one param', () => {
        expect(file.length === 1).toBeTruthy()
      })

      if (fs.readFileSync(path.join(__dirname, 'temp_/src/blocks', f)).toString().split('\n')[0] === '//WEBEDITOROVERRIDE') {
        describe('Web UI file tests:', () => {
          let meta
          it('should contain parsable metadata', () => {
            const rawMeta = fs.readFileSync(path.join(__dirname, 'temp_/src/blocks', f)).toString().split('\n')[1].split('//meta:')[1]
            meta = JSON.parse(rawMeta)
          })

          it('should contain parsed metadata', () => {
            expect(meta).toBeDefined()
          })
          it('should have meta.createdStamp', () => {
            expect(meta.createdStamp).toBeDefined()
          })
          it('should have meta.color', () => {
            expect(meta.color).toBeDefined()
          })
          it('should have meta.webui', () => {
            expect(meta.webui).toBeDefined()
          })
          it('should have meta.v', () => {
            expect(meta.v).toBeDefined()
          })
          it('meta.createdStamp to be Int', () => {
            expect(typeof meta.createdStamp === 'number').toBeTruthy()
          })
          it('meta.color to be String', () => {
            expect(typeof meta.color === 'string').toBeTruthy()
          })
          it('meta.webui to be Boolean', () => {
            expect(typeof meta.webui === 'boolean').toBeTruthy()
          })
          it('meta.v to be Int', () => {
            expect(typeof meta.v === 'number').toBeTruthy()
          })
        })
      }
    })
  })
}
