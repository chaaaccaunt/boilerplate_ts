/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready () {
      console.log(
        'Приложение обслуживается из кеша service worker.\n' +
        'Подробнее: https://goo.gl/AFskqB'
      )
    },
    registered () {
      console.log('Service worker зарегистрирован.')
    },
    cached () {
      console.log('Контент сохранен в кеш для офлайн-режима.')
    },
    updatefound () {
      console.log('Загружается новый контент.')
    },
    updated () {
      console.log('Доступен новый контент, обновите страницу.')
    },
    offline () {
      console.log('Нет подключения к интернету. Приложение работает в офлайн-режиме.')
    },
    error (error) {
      console.error('Ошибка при регистрации service worker:', error)
    }
  })
}
