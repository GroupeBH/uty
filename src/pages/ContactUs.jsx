import React, { useState } from 'react'
import Nav from '../components/Layout/Nav'
import axios from 'axios'

export default function ContactUs() {
  const [phone, setPhone] = useState()
  const [subject, setSubject] = useState()
  const [message, setMessage] = useState()

  const sendMessage = async (event) => {
    event.preventDefault()
    await axios
      .post('https://api.ultramsg.com/instance71278/messages/chat', {
        token: 'a55uf7cy3cpdv25d',
        to: '+243831919710',
        body: `De la part de : ${phone}, au sujet de: ${subject}. ${message}`,
      })
      .then((response) => console.log(response))
  }
  return (
    <div className="px-5 lg:px-32">
      <div>
        <Nav />
      </div>
      <div className="h-screen p-5 bg-white pt-24">
        <h5
          id="drawer-label"
          className="inline-flex items-center mb-6 text-base font-semibold text-gray-500 uppercase dark:text-gray-400"
        >
          Nous contacter
        </h5>
        <form className="mb-6" onSubmit={(event) => sendMessage(event)}>
          <div className="mb-6">
            <label
              htmlFor="phone"
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              Votre numero de téléphone
            </label>
            <input
              type="text"
              id="phone"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="0856787900"
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="subject"
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              Motif
            </label>
            <input
              type="text"
              id="subject"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Pour quel motif vous nous contactez"
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="message"
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              Votre message
            </label>
            <textarea
              id="message"
              rows="4"
              className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ton message..."
              onChange={(e) => setMessage(e.target.value)}
            ></textarea>
          </div>
          <button
            type="submit"
            className="text-white bg-primary hover:bg-blue-800 w-full focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 focus:outline-none"
          >
            Envoyer le message
          </button>
        </form>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          <a href="#" className="hover:underline">
            info@uty.cd
          </a>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <a href="#" className="hover:underline">
            +243823090890
          </a>
        </p>
      </div>
    </div>
  )
}
