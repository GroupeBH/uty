import React, { useEffect, useState } from 'react'
// import { getUser } from '../../services/Users/get-user'
import Edit from '../../components/compte/Edit'
import UserInfos from '../../components/compte/UserInfos'

export default function Profile() {
  const data = JSON.parse(localStorage.getItem('currentUser'))

  const [edit, setEdit] = useState(false)
  const [user, setUser] = useState()

  useEffect(() => {
    // console.log(data)
    setUser(data)
    // getUser(data._id, setUser)
  }, [])
  return (
    <div className="flex justify-center items-center mt-10">
      <div className=" w-[98%]">
        {/* <h3 className="font-bold text-lg pb-3">Mon profil</h3> */}
        {edit == true ? (
          <Edit user={user} setEdit={setEdit} />
        ) : (
          <UserInfos user={user} setEdit={setEdit} />
        )}
      </div>
    </div>
  )
}
