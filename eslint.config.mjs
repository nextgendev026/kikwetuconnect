import nextEslint from 'eslint-config-next'

const eslintConfig = [
  ...nextEslint,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
]

export default eslintConfig
