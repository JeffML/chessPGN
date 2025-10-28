import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { dts } from 'rollup-plugin-dts'

export default [
  {
    input: 'src/chessPGN.ts',
    output: {
      file: 'dist/cjs/chessPGN.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      commonjs(),
      typescript({
        tsconfig: 'tsconfig.cjs.json',
        sourceMap: true,
      }),
    ],
  },
  {
    input: 'src/chessPGN.ts',
    output: {
      file: 'dist/esm/chessPGN.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      commonjs(),
      typescript({
        tsconfig: 'tsconfig.esm.json',
        sourceMap: true,
      }),
    ],
  },
  {
    input: 'src/chessPGN.ts',
    output: {
      file: 'dist/types/chessPGN.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
]
