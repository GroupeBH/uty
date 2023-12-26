import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getAnnouncements = async (setState, setLoader) => {
  await axios.get(`${BASE_URL}/api/announcements`).then((response) => {
    setState(response.data)
    console.log(response.data)
    setLoader(true)
  })
}

export { getAnnouncements }
