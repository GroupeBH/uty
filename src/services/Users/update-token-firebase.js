import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const updateToken = async (user, data) => {
  console.log(user)
  console.log(data)
  if (user && data) {
    console.log(user._id)
    await axios
      .patch(`${BASE_URL}/api/users/token-firebase/${user._id}`, {
        tokenFirebase: data,
      })
      .then((response) => {
        console.log(response)

        response.data.tokenFirebase ? (user.haveTokenFirebase = 'true') : ''

        localStorage.setItem('currentUser', JSON.stringify(user))
      })
  }
}

export { updateToken }
