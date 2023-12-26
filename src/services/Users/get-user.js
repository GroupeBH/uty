import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getUser = async (userID, setUser) => {
  await axios.get(`${BASE_URL}/api/users/${userID}`).then((response) => {
    setUser(response.data)
  })
}

export { getUser }
