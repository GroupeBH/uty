import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getAnnouncementsBySeller = async (sellerID, setState) => {
  await axios
    .get(`${BASE_URL}/api/announcements/seller/${sellerID}`)
    .then((response) => {
      setState(response.data)
    })
}

export { getAnnouncementsBySeller }
