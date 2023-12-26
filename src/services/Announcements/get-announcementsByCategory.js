import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getAnnouncementsByCategory = async (categoryID, setState, setLoader) => {
  await axios
    .get(`${BASE_URL}/api/announcements/category/${categoryID}`)
    .then((response) => {
      setState(response.data)
      console.log('annonces', response.data)
      setLoader(true)
    })
}

export { getAnnouncementsByCategory }
