import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      nav: { home: 'Home', baraza: 'Baraza', explore: 'Explore', spaces: 'Spaces', students: 'Students', professionals: 'Professionals', messages: 'Messages', sessions: 'Sessions', wallet: 'Wallet', market: 'Mtaa Exchange', nyumba: 'Nyumba Kumi', quizzes: 'Quizzes', profile: 'Profile', saved: 'Saved', settings: 'Settings', notifications: 'Notifications' },
      home: { title: 'Build something useful today.', subtitle: 'Your circle is active. Here is what people near you are learning, asking, and sharing.' },
      baraza: { title: 'The room is open.', subtitle: 'Short thoughts, deep questions, local alerts, and answers that earn their keep.' },
      explore: { title: 'Find your next rabbit hole.', subtitle: 'County energy, practical experts, and useful spaces meet here.' },
      create: { post: 'Write a post', question: 'Ask a question', poll: 'Create a poll', media: 'Upload an image or video', audio: 'Record an audio note', session: 'Offer a professional session', listing: 'Create a marketplace listing', alert: 'Post a Nyumba Kumi alert' },
      common: { follow: 'Follow', following: 'Following', join: 'Join', joined: 'Joined', save: 'Save', saved: 'Saved', share: 'Share', report: 'Report', translate: 'Translate', reply: 'Reply', upvote: 'Upvote', downvote: 'Downvote', publish: 'Publish', cancel: 'Cancel', search: 'Search', loading: 'Loading...', error: 'Something went wrong', noResults: 'No results found' },
      auth: { welcome: 'Welcome home', join: 'Join the circle', email: 'Email address', password: 'Password', login: 'Log in', signup: 'Create my account', logout: 'Sign out' },
      wallet: { balance: 'Available balance', add: 'Add funds', withdraw: 'Withdraw', send: 'Send tip', fee: 'Platform fee', net: 'Net amount' },
    }
  },
  sw: {
    translation: {
      nav: { home: 'Nyumbani', baraza: 'Baraza', explore: 'Gundua', spaces: 'Nafasi', students: 'Wanafunzi', professionals: 'Wataalamu', messages: 'Ujumbe', sessions: 'Vipindi', wallet: 'Pochi', market: 'Soko la Mtaa', nyumba: 'Nyumba Kumi', quizzes: 'Maswali', profile: 'Wasifu', saved: 'Imehifadhiwa', settings: 'Mipangilio', notifications: 'Arifa' },
      home: { title: 'Jenga kitu muhimu leo.', subtitle: 'Mduara wako uko hai.Hapa kuna kile watu karibu nawe wanajifunza, wanauliza, na wanashiriki.' },
      baraza: { title: 'Chumba kiko wazi.', subtitle: 'Mawazo mafupi, maswali ya kina, arifa za mtaa, na majibu yanayostahili.' },
      explore: { title: 'Tafuta njia yako mpya.', subtitle: 'Nguvu za kaunti, wataalam wa vitendo, na nafasi muhimu hukutana hapa.' },
      common: { follow: 'Fuata', following: 'Unafuata', join: 'Jiunge', joined: 'Umejiunga', save: 'Hifadhi', saved: 'Imehifadhiwa', share: 'Shiriki', report: 'Ripoti', translate: 'Tafsiri', reply: 'Jibu', upvote: 'Piga kura', downvote: 'Piga kura dhidi', publish: 'Chapisha', cancel: 'Ghairi', search: 'Tafuta', loading: 'Inapakia...', error: 'Kitu kimeenda vibaya', noResults: 'Hakuna matokeo' },
      auth: { welcome: 'Karibu nyumbani', join: 'Jiunge na mduara', email: 'Barua pepe', password: 'Nywila', login: 'Ingia', signup: 'Unda akaunti yangu', logout: 'Toka' },
      wallet: { balance: 'Salio linalopatikana', add: 'Ongeza fedha', withdraw: 'Toa', send: 'Tuma kidokezo', fee: 'Ada ya jukwaa', net: 'Kiasi halisi' },
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
