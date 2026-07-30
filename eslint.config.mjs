import nextEslint from 'eslint-config-next'

const eslintConfig = [
  ...nextEslint,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'jsx-a11y/alt-text': 'off',
    },
  },
]

export default eslintConfig
