import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'
import { themes } from './tamagui/themes'

export const config = createTamagui({
  ...defaultConfig,
  themes,
  media: {
    ...defaultConfig.media,
    // add your own media queries here, if wanted
  },
})

type OurConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends OurConfig {}
}