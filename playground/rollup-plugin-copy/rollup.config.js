// eslint-disable-next-line import/no-extraneous-dependencies
import copy from '@guanghechen/rollup-plugin-copy'

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  input: 'index.js',
  output: {
    dir: 'lib/esm',
    format: 'esm',
  },
  plugins: [
    copy({
      verbose: true,
      targets: [
        {
          src: 'assets/data/*.json',
          dest: 'dist/packs',
        },
      ],
    }),
  ],
}
