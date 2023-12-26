import React from 'react'
import _ from 'lodash'
import profilImg from '../../assets/profil.png'

export default function UserInfos({ user }) {
  return (
    <div className="">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg pt-20 md:pt-0">
        <div className="flex flex-col items-center pb-10">
          <img
            className="w-24 h-24 mb-3 rounded-full shadow-lg"
            src={_.isEmpty(user?.image) ? profilImg : user.image}
            alt="Bonnie image"
          />
          <h5 className="mb-1 text-xl font-medium text-gray-900 dark:text-white">
            {user?.username}
          </h5>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {user?.email}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {user?.phone}
          </span>
          <div className="flex mt-4 md:mt-6">
            <a
              href="#"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Modifier
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
